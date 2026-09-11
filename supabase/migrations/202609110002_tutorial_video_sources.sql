-- Preserve the legacy YouTube column for existing integrations and clients.
alter table public.tutorial_videos
  add column if not exists video_url text,
  add column if not exists storage_path text;

update public.tutorial_videos set video_url = youtube_url where video_url is null;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-videos', 'product-videos', true, 52428800, array['video/mp4', 'video/webm'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Uploads require an admin-authorized, single-path signed upload token.
-- No anonymous write policy is added. Public files are customer-facing tutorials.
