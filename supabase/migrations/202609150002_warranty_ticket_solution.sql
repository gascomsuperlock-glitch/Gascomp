-- Existing statuses remain compatible: closed means Done; all others are Pending.
alter table public.warranty_tickets
  add column if not exists solution text
  check (solution in ('warranty_claim', 'missing_item', 'wrong_item', 'return_refund', 'spare_part', 'partial_refund'));
