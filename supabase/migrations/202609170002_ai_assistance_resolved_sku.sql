-- Allow the authenticated worker to provide a bounded product context inferred
-- from the active snapshot when the customer message did not contain a SKU.
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
  ambiguous_sku boolean := false;
begin
  -- The pilot has a single model slot. Serialize claims, publication, completion,
  -- expiry, and pause changes across every web process.
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

  -- Finalize all invalid/expired work on every operation, including heartbeats.
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
    return jsonb_build_object('job',jsonb_build_object('id',j.id,'leaseToken',lease,'knowledgeVersion',j.knowledge_version,
      'text',j.text,'language',j.language,'sku',j.sku,'expiresAt',j.expires_at));
  end if;
  if action = 'complete' then
    select * into j from ai_assistance_jobs where id = (payload->>'jobId')::uuid and state = 'processing' and lease_token = (payload->>'leaseToken')::uuid;
    if not found then return '{"accepted":false}'; end if;
    if worker_resolved_sku_valid and availability = 'ready' and j.expires_at > now() and j.knowledge_version = payload->>'knowledgeVersion' and j.knowledge_version = r.snapshot->>'version'
      and (worker_resolved_sku is null or j.sku is null or lower(worker_resolved_sku) = lower(btrim(j.sku))) then
      select e into entry from jsonb_array_elements(r.snapshot->'entries') e where e->>'id' = payload->>'answerId' and e->>'language' = j.language
        and (not (e ? 'sku') or lower(btrim(e->>'sku')) = lower(coalesce(btrim(j.sku),worker_resolved_sku))) and e->>'kind' <> 'handoff' limit 1;
      accepted := entry is not null;
    end if;
    if not accepted then
      select e into entry from jsonb_array_elements(r.templates) e where e->>'kind' = 'handoff' and e->>'language' = j.language limit 1;
    end if;
    if entry->>'answer' is not null then
      insert into ai_assistance_messages(session_id,role,text,status) values(j.session_id,'assistant',entry->>'answer',case when accepted then 'complete' else 'handoff' end);
    end if;
    update ai_assistance_jobs set state = case when accepted then 'complete' else 'handoff' end, lease_token = null where id = j.id;
    return jsonb_build_object('accepted',accepted);
  end if;

  if action not in ('session','messages','send') then raise exception 'Unsupported assistant operation'; end if;
  if lang not in ('en','id') then return '{"error":"Invalid language.","status":400}'; end if;
  select id into sid from ai_assistance_sessions where token_hash = payload->>'tokenHash';
  if sid is null and action = 'session' then
    -- Global creation cap cannot be bypassed by spoofing forwarded IP headers.
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
      -- Match whole SKU tokens only; never infer DEMO from DEMO-X. A page hint
      -- and an explicit different product must never select a product answer.
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
      insert into ai_assistance_messages(session_id,role,text) values(sid,'user',payload->>'text');
      insert into ai_assistance_jobs(session_id,request_id,text,language,sku,knowledge_version,state)
        values(sid,(payload->>'requestId')::uuid,payload->>'text',lang,resolved_sku,r.snapshot->>'version',case when availability = 'ready' and not ambiguous_sku then 'queued' else 'handoff' end);
      if availability <> 'ready' or ambiguous_sku then
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
