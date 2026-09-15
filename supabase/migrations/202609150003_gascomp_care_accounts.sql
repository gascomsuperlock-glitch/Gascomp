begin;

-- GascompCare accounts only. Purchases and coverage are intentionally separate future work.
create table public.care_members (
  id uuid primary key default gen_random_uuid(),
  member_number text not null unique default ('GC-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 16))),
  name text not null check (length(name) between 1 and 100),
  username text not null unique check (username ~ '^[a-z0-9._-]{3,32}$'),
  whatsapp text not null check (length(whatsapp) between 6 and 30),
  order_reference text not null default '' check (length(order_reference) <= 100),
  password_hash text not null,
  credential_version integer not null default 1,
  must_change_password boolean not null default true,
  created_at timestamptz not null default now()
);
create table public.care_sessions (
  token_hash text primary key,
  member_id uuid not null references public.care_members(id) on delete cascade,
  credential_version integer not null,
  expires_at timestamptz not null default (now() + interval '8 hours')
);
create index care_sessions_member_idx on public.care_sessions(member_id);
create table public.care_login_attempts (
  id bigint generated always as identity primary key,
  username_key text not null,
  ip_key text not null,
  attempted_at timestamptz not null default now()
);
create index care_login_attempts_time_idx on public.care_login_attempts(attempted_at);
create index care_login_attempts_username_idx on public.care_login_attempts(username_key, attempted_at);
create index care_login_attempts_ip_idx on public.care_login_attempts(ip_key, attempted_at);
alter table public.care_members enable row level security;
alter table public.care_sessions enable row level security;
alter table public.care_login_attempts enable row level security;
revoke all on public.care_members, public.care_sessions, public.care_login_attempts from anon, authenticated;
grant all on public.care_members, public.care_sessions, public.care_login_attempts to service_role;
grant usage, select on sequence public.care_login_attempts_id_seq to service_role;

create function public.care_schema_ready() returns boolean language sql security invoker set search_path = '' as $$ select true $$;

create function public.care_consume_login_attempt(p_username_key text, p_ip_key text)
returns boolean language plpgsql security invoker set search_path = '' as $$
begin
  -- Serialize the short count-and-insert transaction across application instances.
  perform pg_advisory_xact_lock(637241009);
  delete from public.care_login_attempts where attempted_at <= now() - interval '15 minutes';
  if (select count(*) from public.care_login_attempts where username_key = p_username_key) >= 5
    or (select count(*) from public.care_login_attempts where ip_key = p_ip_key) >= 30 then
    return false;
  end if;
  insert into public.care_login_attempts(username_key, ip_key) values (p_username_key, p_ip_key);
  return true;
end $$;

create function public.care_open_session(p_member_id uuid, p_version integer, p_token_hash text)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare current_version integer;
begin
  select credential_version into current_version from public.care_members where id = p_member_id for update;
  if current_version is null or current_version <> p_version then return false; end if;
  delete from public.care_sessions where expires_at <= now();
  insert into public.care_sessions(token_hash, member_id, credential_version) values (p_token_hash, p_member_id, p_version);
  return true;
end $$;

create function public.care_read_session(p_token_hash text)
returns table(id uuid, member_number text, name text, username text, whatsapp text, order_reference text, created_at timestamptz, must_change_password boolean)
language sql security invoker set search_path = '' as $$
  select m.id, m.member_number, m.name, m.username, m.whatsapp, m.order_reference, m.created_at, m.must_change_password
  from public.care_sessions s join public.care_members m on m.id = s.member_id
  where s.token_hash = p_token_hash and s.expires_at > now() and s.credential_version = m.credential_version;
$$;

create function public.care_reset_password(p_member_id uuid, p_password_hash text)
returns boolean language plpgsql security invoker set search_path = '' as $$
begin
  update public.care_members set password_hash = p_password_hash, credential_version = credential_version + 1, must_change_password = true where id = p_member_id;
  if not found then return false; end if;
  delete from public.care_sessions where member_id = p_member_id;
  return true;
end $$;

create function public.care_change_password(p_member_id uuid, p_version integer, p_token_hash text, p_password_hash text, p_new_token_hash text)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare current_version integer;
begin
  select credential_version into current_version from public.care_members where id = p_member_id for update;
  if current_version is null or current_version <> p_version then return false; end if;
  if not exists (select 1 from public.care_sessions where member_id = p_member_id and token_hash = p_token_hash and expires_at > now() and credential_version = current_version) then return false; end if;
  update public.care_members set password_hash = p_password_hash, credential_version = credential_version + 1, must_change_password = false where id = p_member_id;
  delete from public.care_sessions where member_id = p_member_id;
  insert into public.care_sessions(token_hash, member_id, credential_version) values (p_new_token_hash, p_member_id, current_version + 1);
  return true;
end $$;

revoke all on function public.care_schema_ready(), public.care_consume_login_attempt(text,text), public.care_open_session(uuid,integer,text), public.care_read_session(text), public.care_reset_password(uuid,text), public.care_change_password(uuid,integer,text,text,text) from public, anon, authenticated;
grant execute on function public.care_schema_ready(), public.care_consume_login_attempt(text,text), public.care_open_session(uuid,integer,text), public.care_read_session(text), public.care_reset_password(uuid,text), public.care_change_password(uuid,integer,text,text,text) to service_role;

commit;
