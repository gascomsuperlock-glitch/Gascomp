-- Gascomp catalog. Run once in Supabase SQL Editor.
-- A name collision aborts the transaction instead of changing an existing table.
begin;

create table public.products (
 id text primary key,
 slug text not null unique,
 sku text not null,
 name text not null,
 model text not null default '',
 description text not null default '',
 tone text not null default 'orange' check (tone in ('orange','navy','green')),
 status text not null default 'draft' check (status in ('draft','published','archived')),
 ever_published boolean not null default false,
 attributes jsonb not null default '[]',
 source_provider text,
 source_product_id text,
 source_store_id text not null default '',
 source_synced_at timestamptz,
 created_at timestamptz not null default now(),
 unique (source_provider, source_store_id, source_product_id)
);
create index products_sku_idx on public.products (sku);

create table public.site_settings (
 id boolean primary key default true check (id),
 whatsapp_number text not null default '',
 support_hours text not null default ''
);

create table public.product_variations (
 id text primary key,
 product_id text not null references public.products(id) on delete cascade,
 name text not null,
 sku text not null,
 source_variation_id text,
 attributes jsonb not null default '[]',
 position integer not null default 0,
 unique(product_id, source_variation_id)
);

create table public.product_images (
 id text primary key,
 product_id text not null references public.products(id) on delete cascade,
 variation_id text references public.product_variations(id) on delete set null,
 name text not null default '',
 storage_path text not null unique,
 public_url text not null,
 alt text not null default '',
 is_primary boolean not null default false,
 position integer not null default 0
);
create unique index product_images_one_primary_idx on public.product_images(product_id) where is_primary;

create table public.tutorial_videos (
 id text primary key,
 product_id text not null references public.products(id) on delete cascade,
 title text not null,
 description text not null default '',
 youtube_url text not null,
 duration text not null default '',
 position integer not null default 0
);
create table public.product_issues (
 id text primary key,
 product_id text not null references public.products(id) on delete cascade,
 title text not null,
 summary text not null default '',
 steps jsonb not null default '[]',
 warning text,
 position integer not null default 0
);
create table public.faq_items (
 id text primary key,
 product_id text not null references public.products(id) on delete cascade,
 question text not null,
 answer text not null,
 position integer not null default 0
);

create table public.duoke_import_runs (
 id uuid primary key default gen_random_uuid(),
 synced_at timestamptz not null,
 imported_products integer not null default 0,
 imported_variations integer not null default 0,
 review_items integer not null default 0,
 report jsonb not null default '{}',
 created_at timestamptz not null default now()
);

alter table public.products enable row level security;
revoke all on public.products from anon, authenticated;
grant select on public.products to anon, authenticated;
grant all on public.products to service_role;

alter table public.site_settings enable row level security;
revoke all on public.site_settings from anon, authenticated;
grant select on public.site_settings to anon, authenticated;
grant all on public.site_settings to service_role;

alter table public.product_variations enable row level security;
revoke all on public.product_variations from anon, authenticated;
grant select on public.product_variations to anon, authenticated;
grant all on public.product_variations to service_role;

alter table public.product_images enable row level security;
revoke all on public.product_images from anon, authenticated;
grant select on public.product_images to anon, authenticated;
grant all on public.product_images to service_role;

alter table public.tutorial_videos enable row level security;
revoke all on public.tutorial_videos from anon, authenticated;
grant select on public.tutorial_videos to anon, authenticated;
grant all on public.tutorial_videos to service_role;

alter table public.product_issues enable row level security;
revoke all on public.product_issues from anon, authenticated;
grant select on public.product_issues to anon, authenticated;
grant all on public.product_issues to service_role;

alter table public.faq_items enable row level security;
revoke all on public.faq_items from anon, authenticated;
grant select on public.faq_items to anon, authenticated;
grant all on public.faq_items to service_role;

alter table public.duoke_import_runs enable row level security;
revoke all on public.duoke_import_runs from anon, authenticated;
grant all on public.duoke_import_runs to service_role;

create policy gascomp_public_products on public.products for select to anon, authenticated using (status = 'published' or (status = 'archived' and ever_published));
create policy gascomp_public_settings on public.site_settings for select to anon, authenticated using (true);
create index product_variations_product_idx on public.product_variations(product_id);
create policy gascomp_public_product_variations on public.product_variations for select to anon, authenticated using (exists (select 1 from public.products p where p.id = product_id and (p.status = 'published' or (p.status = 'archived' and p.ever_published))));
create index product_images_product_idx on public.product_images(product_id);
create policy gascomp_public_product_images on public.product_images for select to anon, authenticated using (exists (select 1 from public.products p where p.id = product_id and (p.status = 'published' or (p.status = 'archived' and p.ever_published))));
create index tutorial_videos_product_idx on public.tutorial_videos(product_id);
create policy gascomp_public_tutorial_videos on public.tutorial_videos for select to anon, authenticated using (exists (select 1 from public.products p where p.id = product_id and (p.status = 'published' or (p.status = 'archived' and p.ever_published))));
create index product_issues_product_idx on public.product_issues(product_id);
create policy gascomp_public_product_issues on public.product_issues for select to anon, authenticated using (exists (select 1 from public.products p where p.id = product_id and (p.status = 'published' or (p.status = 'archived' and p.ever_published))));
create index faq_items_product_idx on public.faq_items(product_id);
create policy gascomp_public_faq_items on public.faq_items for select to anon, authenticated using (exists (select 1 from public.products p where p.id = product_id and (p.status = 'published' or (p.status = 'archived' and p.ever_published))));

-- Public product photos only. Never put warranty evidence in this bucket.
-- File writes are performed by the authenticated admin's server action.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880,
 array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

insert into public.site_settings (id, whatsapp_number, support_hours)
values (true, '6281234567890', 'Monday–Saturday, 08:00–17:00 WIB');

commit;
