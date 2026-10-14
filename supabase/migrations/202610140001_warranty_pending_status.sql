-- Extend the status allowlist without changing historical tickets or solutions.
begin;

alter table public.warranty_tickets
  drop constraint warranty_tickets_status_check;

alter table public.warranty_tickets
  add constraint warranty_tickets_status_check
  check (status in ('new', 'pending', 'reviewing', 'approved', 'rejected', 'closed'));

commit;
