-- Retain claim identity and evidence for duplicate-claim enforcement.
alter table public.warranty_tickets add column if not exists deleted_at timestamptz;
