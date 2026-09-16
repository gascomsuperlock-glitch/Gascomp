-- Empty service center directory. Apply before enabling database-backed editing.
begin;

create table public.service_centers (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 150),
  province_code text not null check (province_code in (
    '11', '12', '13', '14', '15', '16', '17', '18', '19', '21',
    '31', '32', '33', '34', '35', '36', '51', '52', '53',
    '61', '62', '63', '64', '65', '71', '72', '73', '74', '75', '76',
    '81', '82', '91', '92', '94', '95', '96', '97'
  )),
  city text not null check (char_length(btrim(city)) between 1 and 120),
  address text not null check (char_length(btrim(address)) between 1 and 1000),
  phone text not null default '' check (char_length(phone) <= 30),
  whatsapp text not null default '' check (char_length(whatsapp) <= 30),
  hours text not null default '' check (char_length(hours) <= 300),
  maps_url text not null default '' check (char_length(maps_url) <= 2048),
  latitude double precision not null check (latitude between -11.1 and 6.2),
  longitude double precision not null check (longitude between 94.9 and 141.1),
  active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index service_centers_active_province_idx on public.service_centers (province_code) where active;

create function public.gascomp_update_service_center_timestamp() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
create trigger service_centers_updated before update on public.service_centers
for each row execute function public.gascomp_update_service_center_timestamp();

alter table public.service_centers enable row level security;
revoke all on public.service_centers from anon, authenticated;
grant all on public.service_centers to service_role;
-- Directory reads use the application server, which returns active locations only.
-- Keep direct API access private during local testing and after deployment.
revoke all on function public.gascomp_update_service_center_timestamp() from public, anon, authenticated;

commit;
