-- Broaden private warranty evidence to the video containers verified by the server.
-- Preserve all existing allowed types, file limits, visibility, objects, and policies.
update storage.buckets
set allowed_mime_types = array(
  select distinct mime_type
  from unnest(allowed_mime_types || array[
    'video/x-matroska', 'video/x-msvideo', 'video/3gpp', 'video/mpeg',
    'video/mp2t', 'video/x-ms-wmv', 'video/x-flv', 'video/ogg'
  ]) as mime_type
)
where id = 'warranty-evidence' and allowed_mime_types is not null;
