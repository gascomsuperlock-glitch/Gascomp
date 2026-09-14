-- Preserve historical tickets; enforce eligibility for new submissions only.
create or replace function public.enforce_warranty_claim_eligibility()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.purchase_date > (now() at time zone 'Asia/Jakarta')::date then
    raise exception 'future_warranty_purchase';
  end if;
  if (now() at time zone 'Asia/Jakarta')::date > (new.purchase_date + interval '1 year')::date then
    raise exception 'expired_warranty_claim';
  end if;
  -- Serialize simultaneous submissions for the same purchase and SKU.
  perform pg_advisory_xact_lock(hashtextextended(lower(btrim(new.order_number)) || chr(31) || lower(btrim(new.sku)), 0));
  if exists (
    select 1 from public.warranty_tickets
    where lower(btrim(order_number)) = lower(btrim(new.order_number))
      and lower(btrim(sku)) = lower(btrim(new.sku))
  ) then
    raise exception 'duplicate_warranty_claim';
  end if;
  return new;
end;
$$;
revoke all on function public.enforce_warranty_claim_eligibility() from public;
create trigger warranty_claim_eligibility before insert on public.warranty_tickets
for each row execute function public.enforce_warranty_claim_eligibility();
create index warranty_claim_identity_lookup on public.warranty_tickets (lower(btrim(order_number)), lower(btrim(sku)));
