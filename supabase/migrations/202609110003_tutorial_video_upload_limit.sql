-- The project-wide Storage file size limit must also allow at least 157286400 bytes.
-- Preserve the bucket's visibility, MIME allowlist, existing objects, and policies.
update storage.buckets
set file_size_limit = 157286400
where id = 'product-videos';
