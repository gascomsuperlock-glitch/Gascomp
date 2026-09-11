-- Keep warranty evidence private and preserve the existing MIME allowlist and policies.
update storage.buckets
set file_size_limit = 52428800
where id = 'warranty-evidence';
