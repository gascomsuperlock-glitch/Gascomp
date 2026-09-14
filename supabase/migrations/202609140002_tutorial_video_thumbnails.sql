begin;

alter table public.tutorial_videos
  add column if not exists thumbnail_url text,
  add column if not exists thumbnail_storage_path text;

commit;
