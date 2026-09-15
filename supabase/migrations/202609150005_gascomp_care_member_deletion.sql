begin;

-- Preserve member identity, purchases and claim history; revoke only access.
alter table public.care_members add column deleted_at timestamptz;
create index care_members_active_idx on public.care_members(created_at desc, id) where deleted_at is null;

create function public.care_delete_members(p_member_ids uuid[])
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare requested_ids uuid[];
begin
  if p_member_ids is null or cardinality(p_member_ids) not between 1 and 100 or array_position(p_member_ids, null) is not null then
    return jsonb_build_object('deletedIds', '[]'::jsonb, 'error', 'invalidInput');
  end if;
  select array_agg(distinct value order by value) into requested_ids from unnest(p_member_ids) as value;
  -- Deterministic row locking serializes overlapping batches and credential/claim writes.
  perform id from public.care_members where id = any(requested_ids) order by id for update;
  if (select count(*) from public.care_members where id = any(requested_ids)) <> cardinality(requested_ids) then
    return jsonb_build_object('deletedIds', '[]'::jsonb, 'error', 'invalidInput');
  end if;
  update public.care_members set deleted_at = now(), credential_version = credential_version + 1
    where id = any(requested_ids) and deleted_at is null;
  delete from public.care_sessions where member_id = any(requested_ids);
  return jsonb_build_object('deletedIds', to_jsonb(requested_ids));
end $$;
revoke all on function public.care_delete_members(uuid[]) from public, anon, authenticated;
grant execute on function public.care_delete_members(uuid[]) to service_role;

create or replace function public.care_open_session(p_member_id uuid, p_version integer, p_token_hash text)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare current_version integer;
begin
  select credential_version into current_version from public.care_members where id = p_member_id and deleted_at is null for update;
  if current_version is null or current_version <> p_version then return false; end if;
  delete from public.care_sessions where expires_at <= now();
  insert into public.care_sessions(token_hash, member_id, credential_version) values (p_token_hash, p_member_id, p_version);
  return true;
end $$;

create or replace function public.care_read_session(p_token_hash text)
returns table(id uuid, member_number text, name text, username text, whatsapp text, order_reference text, created_at timestamptz, must_change_password boolean)
language sql security invoker set search_path = '' as $$
  select m.id, m.member_number, m.name, m.username, m.whatsapp, m.order_reference, m.created_at, m.must_change_password
  from public.care_sessions s join public.care_members m on m.id = s.member_id
  where s.token_hash = p_token_hash and s.expires_at > now() and s.credential_version = m.credential_version and m.deleted_at is null;
$$;

create or replace function public.care_reset_password(p_member_id uuid, p_password_hash text)
returns boolean language plpgsql security invoker set search_path = '' as $$
begin
  update public.care_members set password_hash = p_password_hash, credential_version = credential_version + 1, must_change_password = true where id = p_member_id and deleted_at is null;
  if not found then return false; end if;
  delete from public.care_sessions where member_id = p_member_id;
  return true;
end $$;

create or replace function public.care_change_password(p_member_id uuid, p_version integer, p_token_hash text, p_password_hash text, p_new_token_hash text)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare current_version integer;
begin
  select credential_version into current_version from public.care_members where id = p_member_id and deleted_at is null for update;
  if current_version is null or current_version <> p_version then return false; end if;
  if not exists (select 1 from public.care_sessions where member_id = p_member_id and token_hash = p_token_hash and expires_at > now() and credential_version = current_version) then return false; end if;
  update public.care_members set password_hash = p_password_hash, credential_version = credential_version + 1, must_change_password = false where id = p_member_id and deleted_at is null;
  delete from public.care_sessions where member_id = p_member_id;
  insert into public.care_sessions(token_hash, member_id, credential_version) values (p_new_token_hash, p_member_id, current_version + 1);
  return true;
end $$;

create or replace function public.care_add_purchase(p_member_id uuid, p_purchase_reference text, p_item_label text, p_purchase_date date, p_units integer)
returns text language plpgsql security definer set search_path = '' as $$
declare existing public.care_purchases; reference_value text := lower(btrim(p_purchase_reference));
begin
  if p_member_id is null or reference_value is null or length(reference_value) not between 1 and 100 or reference_value ~ '[[:cntrl:]]'
    or p_item_label is null or length(btrim(p_item_label)) not between 1 and 200
    or p_purchase_date is null or p_purchase_date < date '1900-01-01' or p_purchase_date > (now() at time zone 'Asia/Jakarta')::date
    or p_units is null or p_units not between 1 and 10 then return 'invalidInput'; end if;
  perform 1 from public.care_members where id = p_member_id and deleted_at is null for update;
  if not found then return 'invalidInput'; end if;
  insert into public.care_purchases(member_id, purchase_reference, item_label, purchase_date, units)
    values (p_member_id, reference_value, btrim(p_item_label), p_purchase_date, p_units)
    on conflict (purchase_reference) do nothing;
  if found then return 'ok'; end if;
  select * into existing from public.care_purchases where purchase_reference = reference_value;
  if existing.member_id = p_member_id and existing.item_label = btrim(p_item_label) and existing.purchase_date = p_purchase_date and existing.units = p_units then return 'ok'; end if;
  return 'duplicatePurchase';
end $$;

create or replace function public.care_record_claim(p_member_id uuid, p_coverage_id uuid, p_reference text, p_used_on date)
returns text language plpgsql security definer set search_path = '' as $$
declare coverage public.care_purchases; existing public.care_claims; reference_value text := lower(btrim(p_reference)); today date := (now() at time zone 'Asia/Jakarta')::date;
begin
  if p_member_id is null or p_coverage_id is null or reference_value is null or length(reference_value) not between 1 and 100 or reference_value ~ '[[:cntrl:]]' or p_used_on is null or p_used_on > today then return 'invalidInput'; end if;
  -- All coverage writes take the member lock before the purchase lock.
  perform 1 from public.care_members where id = p_member_id and deleted_at is null for update;
  if not found then return 'coverageNotFound'; end if;
  select * into coverage from public.care_purchases where id = p_coverage_id and member_id = p_member_id for update;
  if not found then return 'coverageNotFound'; end if;
  select * into existing from public.care_claims where reference = reference_value;
  if found then
    if existing.coverage_id = p_coverage_id and existing.used_on = p_used_on then return 'ok'; end if;
    return 'duplicateClaim';
  end if;
  if today > coverage.expires_on then return 'coverageExpired'; end if;
  if p_used_on < coverage.purchase_date or p_used_on > coverage.expires_on then return 'invalidInput'; end if;
  if (select count(*) from public.care_claims where coverage_id = p_coverage_id) >= coverage.units * 3 then return 'coverageExhausted'; end if;
  insert into public.care_claims(coverage_id, reference, used_on) values (p_coverage_id, reference_value, p_used_on)
    on conflict (reference) do nothing;
  if not found then return 'duplicateClaim'; end if;
  return 'ok';
end $$;

create or replace function public.care_list_coverage(p_member_id uuid)
returns jsonb language sql security invoker set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', p.id, 'memberId', p.member_id, 'purchaseReference', p.purchase_reference,
    'itemLabel', p.item_label, 'purchaseDate', p.purchase_date, 'expiresOn', p.expires_on,
    'units', p.units, 'claimLimit', p.units * 3, 'claimsUsed', c.used, 'claimsRemaining', greatest(0, p.units * 3 - c.used),
    'status', case when (now() at time zone 'Asia/Jakarta')::date > p.expires_on then 'expired' when c.used >= p.units * 3 then 'exhausted' else 'active' end,
    'claims', c.claims
  ) order by p.purchase_date desc, p.id), '[]'::jsonb)
  from public.care_purchases p cross join lateral (
    select count(*)::integer as used, coalesce(jsonb_agg(jsonb_build_object('id', id, 'reference', reference, 'usedOn', used_on) order by used_on desc, id), '[]'::jsonb) as claims
    from public.care_claims where coverage_id = p.id
  ) c where p.member_id = p_member_id and exists (select 1 from public.care_members m where m.id = p.member_id and m.deleted_at is null);
$$;

commit;
