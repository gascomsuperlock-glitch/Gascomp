begin;

create table public.care_purchases (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.care_members(id),
  purchase_reference text not null unique check (purchase_reference = lower(btrim(purchase_reference)) and length(purchase_reference) between 1 and 100),
  item_label text not null check (length(btrim(item_label)) between 1 and 200),
  purchase_date date not null check (purchase_date >= date '1900-01-01'),
  units integer not null check (units between 1 and 10),
  expires_on date generated always as ((purchase_date + make_interval(years => units))::date - 1) stored,
  created_at timestamptz not null default now()
);
create index care_purchases_member_idx on public.care_purchases(member_id, purchase_date);
create table public.care_claims (
  id uuid primary key default gen_random_uuid(),
  coverage_id uuid not null references public.care_purchases(id),
  reference text not null unique check (reference = lower(btrim(reference)) and length(reference) between 1 and 100),
  used_on date not null,
  created_at timestamptz not null default now()
);
create index care_claims_coverage_idx on public.care_claims(coverage_id);
alter table public.care_purchases enable row level security;
alter table public.care_claims enable row level security;
revoke all on public.care_purchases, public.care_claims from public, anon, authenticated, service_role;
grant select on public.care_purchases, public.care_claims to service_role;

-- Mutations are restricted to functions so callers cannot bypass quota/date checks.
create function public.care_add_purchase(p_member_id uuid, p_purchase_reference text, p_item_label text, p_purchase_date date, p_units integer)
returns text language plpgsql security definer set search_path = '' as $$
declare existing public.care_purchases; reference_value text := lower(btrim(p_purchase_reference));
begin
  if p_member_id is null or reference_value is null or length(reference_value) not between 1 and 100 or reference_value ~ '[[:cntrl:]]'
    or p_item_label is null or length(btrim(p_item_label)) not between 1 and 200
    or p_purchase_date is null or p_purchase_date < date '1900-01-01' or p_purchase_date > (now() at time zone 'Asia/Jakarta')::date
    or p_units is null or p_units not between 1 and 10 then return 'invalidInput'; end if;
  if not exists(select 1 from public.care_members where id = p_member_id) then return 'invalidInput'; end if;
  insert into public.care_purchases(member_id, purchase_reference, item_label, purchase_date, units)
    values (p_member_id, reference_value, btrim(p_item_label), p_purchase_date, p_units)
    on conflict (purchase_reference) do nothing;
  if found then return 'ok'; end if;
  select * into existing from public.care_purchases where purchase_reference = reference_value;
  if existing.member_id = p_member_id and existing.item_label = btrim(p_item_label) and existing.purchase_date = p_purchase_date and existing.units = p_units then return 'ok'; end if;
  return 'duplicatePurchase';
end $$;

create function public.care_record_claim(p_member_id uuid, p_coverage_id uuid, p_reference text, p_used_on date)
returns text language plpgsql security definer set search_path = '' as $$
declare coverage public.care_purchases; existing public.care_claims; reference_value text := lower(btrim(p_reference)); today date := (now() at time zone 'Asia/Jakarta')::date;
begin
  if p_member_id is null or p_coverage_id is null or reference_value is null or length(reference_value) not between 1 and 100 or reference_value ~ '[[:cntrl:]]' or p_used_on is null or p_used_on > today then return 'invalidInput'; end if;
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

create function public.care_list_coverage(p_member_id uuid)
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
  ) c where p.member_id = p_member_id;
$$;

revoke all on function public.care_add_purchase(uuid,text,text,date,integer), public.care_record_claim(uuid,uuid,text,date), public.care_list_coverage(uuid) from public, anon, authenticated;
grant execute on function public.care_add_purchase(uuid,text,text,date,integer), public.care_record_claim(uuid,uuid,text,date), public.care_list_coverage(uuid) to service_role;

commit;
