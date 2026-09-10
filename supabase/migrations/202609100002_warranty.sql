-- Run after 202609100001_catalog.sql in Supabase SQL Editor.
-- A name collision aborts the transaction without changing existing tables.
begin;

create table public.warranty_tickets (
  ticket_id text primary key check (ticket_id ~ '^GWC-[0-9]{8}-[A-F0-9]{6}$'),
  status text not null default 'new' check (status in ('new', 'reviewing', 'approved', 'rejected', 'closed')),
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  customer_name text not null,
  customer_email text not null,
  customer_whatsapp text not null,
  product_id text references public.products(id) on delete set null,
  product_name text not null,
  sku text not null,
  store text not null,
  purchase_date date not null,
  order_number text not null,
  purchase_price numeric not null check (purchase_price >= 0),
  problem text not null
);
create index warranty_tickets_submitted_idx on public.warranty_tickets(submitted_at desc);
create index warranty_tickets_product_idx on public.warranty_tickets(product_id);

create function public.gascomp_update_warranty_timestamp() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
create trigger warranty_tickets_updated before update on public.warranty_tickets
for each row execute function public.gascomp_update_warranty_timestamp();

create table public.warranty_evidence (
  id text primary key,
  ticket_id text not null references public.warranty_tickets(ticket_id) on delete cascade,
  kind text not null check (kind in ('invoice', 'photo', 'video')),
  original_name text not null,
  storage_path text not null unique,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0),
  created_at timestamptz not null default now()
);
create index warranty_evidence_ticket_idx on public.warranty_evidence(ticket_id);

-- Customer data and evidence are only accessed through server actions/routes.
alter table public.warranty_tickets enable row level security;
alter table public.warranty_evidence enable row level security;
revoke all on public.warranty_tickets, public.warranty_evidence from anon, authenticated;
grant all on public.warranty_tickets, public.warranty_evidence to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('warranty-evidence', 'warranty-evidence', false, 12582912,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'video/mp4', 'video/webm', 'video/quicktime'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

commit;
