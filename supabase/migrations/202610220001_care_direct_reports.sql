create table public.care_direct_reports (
  id text primary key check (id ~ '^CD-[0-9a-f-]{36}$'),
  submission_id uuid not null unique,
  created_at timestamptz not null default now(),
  record jsonb not null,
  constraint care_direct_report_identity check (record->>'id' is not null and record->>'submissionId' is not null and record->>'id' = id and record->>'submissionId' = submission_id::text),
  constraint care_direct_report_status check (record->>'status' is not null and record->>'status' in ('new', 'in_progress', 'resolved'))
);
alter table public.care_direct_reports enable row level security;
revoke all on public.care_direct_reports from anon, authenticated;
grant select, insert, update, delete on public.care_direct_reports to service_role;
create index care_direct_reports_created_at_idx on public.care_direct_reports (created_at desc, id);
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('care-direct-evidence', 'care-direct-evidence', false, 52428800,
  array['video/mp4', 'video/quicktime', 'video/webm', 'video/x-matroska', 'video/x-msvideo', 'video/3gpp', 'video/mpeg', 'video/mp2t', 'video/x-ms-wmv', 'video/x-flv', 'video/ogg']);
