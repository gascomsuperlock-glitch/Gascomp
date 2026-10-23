create table public.main_site_leads (
  id uuid primary key,
  kind text not null check (kind in ('contact', 'reseller')),
  name text not null check (char_length(name) between 2 and 120),
  email text not null check (char_length(email) between 3 and 254),
  phone text not null check (char_length(phone) between 7 and 30),
  message text not null check (char_length(message) between 10 and 4000),
  status text not null default 'new' check (status in ('new', 'in_progress', 'resolved')),
  created_at timestamptz not null default now()
);
alter table public.main_site_leads enable row level security;
revoke all on public.main_site_leads from public, anon, authenticated;
grant select, insert, update, delete on public.main_site_leads to service_role;
create index main_site_leads_created_at_idx on public.main_site_leads (created_at desc);
create index main_site_leads_email_created_at_idx on public.main_site_leads (email, created_at desc);

create function public.submit_main_site_lead(p_id uuid, p_kind text, p_name text, p_email text, p_phone text, p_message text)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare previous public.main_site_leads;
begin
  -- Serialize acceptance checks across all app instances, including duplicate retries.
  perform pg_advisory_xact_lock(1792723, 1);
  select * into previous from public.main_site_leads where id = p_id;
  if found then
    if (previous.kind, previous.name, previous.email, previous.phone, previous.message)
       is distinct from (p_kind, p_name, lower(p_email), p_phone, p_message) then
      raise exception 'Submission conflict' using errcode = '23505';
    end if;
    return previous.id;
  end if;
  if (select count(*) from public.main_site_leads where created_at > now() - interval '1 hour') >= 200
     or (select count(*) from public.main_site_leads where email = lower(p_email) and created_at > now() - interval '24 hours') >= 5 then
    raise exception 'Submission limit reached' using errcode = 'P0001';
  end if;
  insert into public.main_site_leads (id, kind, name, email, phone, message)
  values (p_id, p_kind, p_name, lower(p_email), p_phone, p_message);
  return p_id;
end;
$$;
revoke all on function public.submit_main_site_lead(uuid,text,text,text,text,text) from public, anon, authenticated;
grant execute on function public.submit_main_site_lead(uuid,text,text,text,text,text) to service_role;

alter table public.main_site_leads
  add column notified_at timestamptz,
  add column notification_claim uuid,
  add column notification_claimed_at timestamptz;

create function public.claim_main_site_notifications(p_claim uuid)
returns table (id uuid, kind text)
language sql security invoker set search_path = '' as $$
  update public.main_site_leads as lead
  set notification_claim = p_claim, notification_claimed_at = now()
  where lead.id in (
    select pending.id from public.main_site_leads as pending
    where pending.notified_at is null
      and (pending.notification_claimed_at is null or pending.notification_claimed_at < now() - interval '15 minutes')
    order by pending.created_at
    limit 20 for update skip locked
  )
  returning lead.id, lead.kind;
$$;
revoke all on function public.claim_main_site_notifications(uuid) from public, anon, authenticated;
grant execute on function public.claim_main_site_notifications(uuid) to service_role;
