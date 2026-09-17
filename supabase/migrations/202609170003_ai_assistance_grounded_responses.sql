-- Permit bounded natural-language responses while retaining active knowledge as
-- provenance and preserving the exact-answer completion mode for rollback.
alter table public.ai_assistance_messages
  add column response_basis text check (response_basis is null or response_basis in ('knowledge','general')),
  add column source_ids text[] check (source_ids is null or cardinality(source_ids) <= 5),
  add constraint ai_assistance_messages_response_provenance check (
    (response_basis is null and source_ids is null)
    or (response_basis = 'general' and cardinality(source_ids) = 0)
    or (response_basis = 'knowledge' and cardinality(source_ids) between 1 and 5)
  );

alter table public.ai_assistance_jobs
  add column context_ambiguous boolean not null default false,
  add column user_message_id uuid references public.ai_assistance_messages(id) on delete cascade;

create or replace function public.gascomp_ai_command(action text, payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  r public.ai_assistance_runtime%rowtype;
  j public.ai_assistance_jobs%rowtype;
  sid uuid;
  entry jsonb;
  fallback text;
  lang text := coalesce(payload->>'language','en');
  availability text;
  online boolean;
  accepted boolean := false;
  limit_key text;
  limit_count integer;
  lease uuid;
  sku_contexts text[];
  resolved_sku text;
  worker_resolved_sku text := nullif(btrim(payload->>'resolvedSku'),'');
  worker_resolved_sku_valid boolean := not (payload ? 'resolvedSku') or
    (jsonb_typeof(payload->'resolvedSku') = 'string' and worker_resolved_sku is not null and length(payload->>'resolvedSku') <= 100);
  effective_sku text;
  ambiguous_sku boolean := false;
  current_message_id uuid;
  history jsonb;
  legacy_mode boolean;
  generated_mode boolean;
  generated_response jsonb;
  response_text text;
  response_kind text;
  response_basis text;
  response_source_ids text[];
  generated_valid boolean := false;
begin
  perform pg_advisory_xact_lock(1786304911);
  perform gascomp_ai_cleanup();
  select * into r from ai_assistance_runtime where singleton;

  if action = 'knowledge' then
    if coalesce((payload->>'ready')::boolean,false) then
      update ai_assistance_runtime set snapshot = payload->'snapshot', knowledge_ready = true,
        templates = (select coalesce(jsonb_agg(e),'[]') from jsonb_array_elements(payload->'snapshot'->'entries') e where e->>'kind' in ('greeting','clarification','handoff'))
      where singleton;
    else
      update ai_assistance_runtime set snapshot = null, knowledge_ready = false, worker_ready = false,
        templates = (select coalesce(jsonb_agg(e),'[]') from jsonb_array_elements(r.templates) e where e->>'kind' = 'handoff') where singleton;
    end if;
  elsif action = 'heartbeat' then
    update ai_assistance_runtime set heartbeat_at = now(), worker_ready = (payload->>'ready')::boolean,
      worker_version = payload->>'knowledgeVersion' where singleton;
  elsif action = 'pause' then
    update ai_assistance_runtime set paused = (payload->>'paused')::boolean where singleton;
  end if;
  select * into r from ai_assistance_runtime where singleton;
  online := coalesce(r.worker_ready and r.heartbeat_at > now() - interval '30 seconds',false);
  availability := case when r.paused then 'paused' when not r.knowledge_ready then 'unavailable'
    when not online or r.worker_version is distinct from r.snapshot->>'version' then 'offline' else 'ready' end;

  for j in select * from ai_assistance_jobs where state in ('queued','processing') and
    (expires_at <= now() or availability <> 'ready' or knowledge_version is distinct from r.snapshot->>'version') order by created_at, id
  loop
    select e->>'answer' into fallback from jsonb_array_elements(r.templates) e where e->>'kind' = 'handoff' and e->>'language' = j.language limit 1;
    if fallback is not null then
      insert into ai_assistance_messages(session_id,role,text,status) values(j.session_id,'assistant',fallback,'handoff');
    end if;
    update ai_assistance_jobs set state = 'handoff', lease_token = null where id = j.id;
  end loop;

  if action in ('knowledge','heartbeat') then return jsonb_build_object('ok',true); end if;
  if action in ('status','pause') then
    return jsonb_build_object('enabled',true,'paused',r.paused,'workerOnline',online,'knowledgeReady',r.knowledge_ready,
      'knowledgeVersion',r.snapshot->>'version','queuedJobs',(select count(*) from ai_assistance_jobs where state in ('queued','processing')),'lastHeartbeat',r.heartbeat_at);
  end if;
  if action = 'claim' then
    if availability <> 'ready' or exists(select 1 from ai_assistance_jobs where state = 'processing') then return '{"job":null}'; end if;
    select * into j from ai_assistance_jobs where state = 'queued' order by created_at, id limit 1;
    if not found then return '{"job":null}'; end if;
    lease := gen_random_uuid();
    update ai_assistance_jobs set state = 'processing', lease_token = lease where id = j.id;
    select coalesce(jsonb_agg(jsonb_build_object('role',prior.role,'text',prior.text) order by prior.sequence),'[]') into history from (
      select m.sequence,m.role,left(m.text,800) as text from ai_assistance_messages m
      where m.session_id = j.session_id and m.sequence < coalesce((select sequence from ai_assistance_messages where id = j.user_message_id),-1)
      order by m.sequence desc limit 8
    ) prior;
    return jsonb_build_object('job',jsonb_build_object('id',j.id,'leaseToken',lease,'knowledgeVersion',j.knowledge_version,
      'text',j.text,'language',j.language,'sku',j.sku,'expiresAt',j.expires_at,'history',history,'contextAmbiguous',j.context_ambiguous));
  end if;
  if action = 'complete' then
    begin
      select * into j from ai_assistance_jobs where id = (payload->>'jobId')::uuid and state = 'processing' and lease_token = (payload->>'leaseToken')::uuid;
    exception when invalid_text_representation then
      return '{"accepted":false}';
    end;
    if not found then return '{"accepted":false}'; end if;
    legacy_mode := payload ? 'answerId';
    generated_mode := payload ? 'response';
    effective_sku := coalesce(btrim(j.sku),worker_resolved_sku);

    if legacy_mode <> generated_mode
      and not (payload - array['jobId','leaseToken','knowledgeVersion','answerId','response','resolvedSku']) <> '{}'::jsonb
      and jsonb_typeof(payload->'jobId') = 'string' and jsonb_typeof(payload->'leaseToken') = 'string'
      and jsonb_typeof(payload->'knowledgeVersion') = 'string' and payload->>'knowledgeVersion' <> ''
      and worker_resolved_sku_valid and availability = 'ready' and j.expires_at > now()
      and j.knowledge_version = payload->>'knowledgeVersion' and j.knowledge_version = r.snapshot->>'version'
      and (worker_resolved_sku is null or j.sku is null or lower(worker_resolved_sku) = lower(btrim(j.sku))) then
      if legacy_mode and not j.context_ambiguous then
        select e into entry from jsonb_array_elements(r.snapshot->'entries') e where e->>'id' = payload->>'answerId' and e->>'language' = j.language
          and (not (e ? 'sku') or lower(btrim(e->>'sku')) = lower(effective_sku)) and e->>'kind' <> 'handoff' limit 1;
        accepted := entry is not null;
      elsif generated_mode and jsonb_typeof(payload->'response') = 'object' then
        generated_response := payload->'response';
        if not (generated_response - array['text','kind','basis','sourceIds']) = '{}'::jsonb
          or not (generated_response ?& array['text','kind','basis','sourceIds']) then
          generated_valid := false;
        elsif jsonb_typeof(generated_response->'text') = 'string'
          and jsonb_typeof(generated_response->'kind') = 'string'
          and jsonb_typeof(generated_response->'basis') = 'string'
          and jsonb_typeof(generated_response->'sourceIds') = 'array' then
          response_text := generated_response->>'text';
          response_kind := generated_response->>'kind';
          response_basis := generated_response->>'basis';
          select coalesce(array_agg(source_id order by ordinal),'{}') into response_source_ids
          from jsonb_array_elements_text(generated_response->'sourceIds') with ordinality as sources(source_id,ordinal);
          generated_valid := btrim(response_text) <> '' and length(response_text) <= 3000
            and regexp_replace(response_text,E'[\n]','','g') !~ '[[:cntrl:]]'
            and response_text !~* '(^|[^[:alnum:]_])([[:alpha:]][[:alnum:]+.-]*://|(mailto|data|javascript|file):|www\.|wa\.me(/|$)|([[:alnum:]-]+\.)+[[:alpha:]]{2,63}(/|$|[^[:alnum:]_]))'
            and response_text !~* '<[[:space:]]*/?[[:space:]]*[[:alpha:]][^>]*>'
            and response_text !~ E'!?\\[[^]]*\\]\\([^)]*\\)'
            and position('[[' in response_text) = 0 and position(']]' in response_text) = 0
            and response_kind in ('answer','clarification','handoff')
            and response_basis in ('knowledge','general')
            and cardinality(response_source_ids) <= 5
            and not exists(select 1 from unnest(response_source_ids) id where id !~ '^[a-z0-9][a-z0-9._-]{0,79}$')
            and cardinality(response_source_ids) = (select count(distinct id) from unnest(response_source_ids) id)
            and ((response_basis = 'knowledge' and cardinality(response_source_ids) between 1 and 5)
              or (response_basis = 'general' and cardinality(response_source_ids) = 0))
            and (not j.context_ambiguous or (response_basis = 'general' and response_kind in ('clarification','handoff')));
          if generated_valid and response_basis = 'knowledge' then
            generated_valid := not exists(
              select 1 from unnest(response_source_ids) source_id
              where not exists(
                select 1 from jsonb_array_elements(r.snapshot->'entries') source_entry
                where source_entry->>'id' = source_id
                  and (not (source_entry ? 'sku') or (effective_sku is not null and lower(btrim(source_entry->>'sku')) = lower(effective_sku)))
              )
            );
          end if;
          accepted := generated_valid;
        end if;
      end if;
    end if;
    if accepted and generated_mode then
      insert into ai_assistance_messages(session_id,role,text,status,response_basis,source_ids)
        values(j.session_id,'assistant',response_text,case when response_kind = 'handoff' then 'handoff' else 'complete' end,response_basis,response_source_ids);
    elsif accepted then
      insert into ai_assistance_messages(session_id,role,text,status) values(j.session_id,'assistant',entry->>'answer','complete');
    else
      select e into entry from jsonb_array_elements(r.templates) e where e->>'kind' = 'handoff' and e->>'language' = j.language limit 1;
      if entry->>'answer' is not null then
        insert into ai_assistance_messages(session_id,role,text,status) values(j.session_id,'assistant',entry->>'answer','handoff');
      end if;
    end if;
    update ai_assistance_jobs set state = case when accepted and (not generated_mode or response_kind <> 'handoff') then 'complete' else 'handoff' end,
      lease_token = null where id = j.id;
    return jsonb_build_object('accepted',accepted);
  end if;

  if action not in ('session','messages','send') then raise exception 'Unsupported assistant operation'; end if;
  if lang not in ('en','id') then return '{"error":"Invalid language.","status":400}'; end if;
  select id into sid from ai_assistance_sessions where token_hash = payload->>'tokenHash';
  if sid is null and action = 'session' then
    limit_key := 'sessions';
    insert into ai_assistance_limits values(limit_key,now(),1) on conflict(key) do update set
      count = case when ai_assistance_limits.window_start < now() - interval '1 minute' then 1 else ai_assistance_limits.count + 1 end,
      window_start = case when ai_assistance_limits.window_start < now() - interval '1 minute' then now() else ai_assistance_limits.window_start end returning count into limit_count;
    if limit_count > 100 then return '{"error":"Please try again later.","status":429}'; end if;
    insert into ai_assistance_sessions(token_hash) values(payload->>'tokenHash') returning id into sid;
  end if;
  if sid is null then return '{"error":"Chat session expired.","status":401}'; end if;
  if action = 'send' then
    if not exists(select 1 from ai_assistance_jobs where session_id = sid and request_id = (payload->>'requestId')::uuid) then
      if (select count(*) from ai_assistance_jobs where session_id = sid and created_at > now() - interval '1 minute') >= 10
        or (select count(*) from ai_assistance_jobs where session_id = sid) >= 200 then return '{"error":"Please try again later.","status":429}'; end if;
      if exists(select 1 from ai_assistance_jobs where session_id = sid and state in ('queued','processing')) then return '{"error":"Wait for the current reply.","status":409}'; end if;
      select array_agg(distinct context) into sku_contexts from (
        select lower(btrim(e->>'sku')) as context from jsonb_array_elements(r.snapshot->'entries') e
          where e ? 'sku' and lower(btrim(e->>'sku')) = any(regexp_split_to_array(lower(payload->>'text'), '[^[:alnum:]_-]+'))
        union
        select lower(btrim(payload->>'sku')) where nullif(btrim(payload->>'sku'),'') is not null
      ) contexts;
      ambiguous_sku := coalesce(cardinality(sku_contexts),0) > 1;
      if not ambiguous_sku then
        select min(e->>'sku') into resolved_sku from jsonb_array_elements(r.snapshot->'entries') e
          where lower(btrim(e->>'sku')) = sku_contexts[1];
        resolved_sku := coalesce(resolved_sku,sku_contexts[1]);
      end if;
      insert into ai_assistance_messages(session_id,role,text) values(sid,'user',payload->>'text') returning id into current_message_id;
      insert into ai_assistance_jobs(session_id,request_id,text,language,sku,knowledge_version,state,context_ambiguous,user_message_id)
        values(sid,(payload->>'requestId')::uuid,payload->>'text',lang,resolved_sku,r.snapshot->>'version',case when availability = 'ready' then 'queued' else 'handoff' end,ambiguous_sku,current_message_id);
      if availability <> 'ready' then
        select e->>'answer' into fallback from jsonb_array_elements(r.templates) e where e->>'kind' = 'handoff' and e->>'language' = lang limit 1;
        if fallback is not null then
          insert into ai_assistance_messages(session_id,role,text,status) values(sid,'assistant',fallback,'handoff');
        end if;
      end if;
    end if;
  end if;
  return jsonb_build_object('messages',coalesce((select jsonb_agg(jsonb_build_object('id',m.id,'role',m.role,'text',m.text,'status',m.status,'createdAt',m.created_at) order by m.sequence) from ai_assistance_messages m where session_id = sid),'[]'),
    'availability',availability,'pending',exists(select 1 from ai_assistance_jobs where session_id = sid and state in ('queued','processing')),
    'greeting',(select e->>'answer' from jsonb_array_elements(r.templates) e where e->>'kind' = 'greeting' and e->>'language' = lang limit 1),
    'handoff',(select e->>'answer' from jsonb_array_elements(r.templates) e where e->>'kind' = 'handoff' and e->>'language' = lang limit 1));
end;
$$;

revoke all on function public.gascomp_ai_command(text,jsonb) from public, anon, authenticated;
grant execute on function public.gascomp_ai_command(text,jsonb) to service_role;
