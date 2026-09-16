-- Extend the solution allowlist without changing historical tickets or statuses.
begin;

alter table public.warranty_tickets
  drop constraint warranty_tickets_solution_check;

alter table public.warranty_tickets
  add constraint warranty_tickets_solution_check
  check (solution in (
    'warranty_claim',
    'missing_item',
    'wrong_item',
    'return_refund',
    'spare_part',
    'partial_refund',
    'usage_guidance'
  ));

commit;
