begin;

create or replace function public.catalog_admin_save_snapshot()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'settings', (
      select to_jsonb(settings_row)
      from public.site_settings as settings_row
      where settings_row.id = true
    ),
    'products', coalesce((
      select jsonb_agg(to_jsonb(product_row) order by product_row.created_at, product_row.id)
      from public.products as product_row
    ), '[]'::jsonb),
    'variations', coalesce((
      select jsonb_agg(to_jsonb(variation_row) order by variation_row.product_id, variation_row.position, variation_row.id)
      from public.product_variations as variation_row
    ), '[]'::jsonb),
    'images', coalesce((
      select jsonb_agg(to_jsonb(image_row) order by image_row.product_id, image_row.position, image_row.id)
      from public.product_images as image_row
    ), '[]'::jsonb),
    'videos', coalesce((
      select jsonb_agg(to_jsonb(video_row) order by video_row.product_id, video_row.position, video_row.id)
      from public.tutorial_videos as video_row
    ), '[]'::jsonb),
    'issues', coalesce((
      select jsonb_agg(to_jsonb(issue_row) order by issue_row.product_id, issue_row.position, issue_row.id)
      from public.product_issues as issue_row
    ), '[]'::jsonb),
    'faqs', coalesce((
      select jsonb_agg(to_jsonb(faq_row) order by faq_row.product_id, faq_row.position, faq_row.id)
      from public.faq_items as faq_row
    ), '[]'::jsonb),
    'extended_video_schema', (
      select count(*) = 2
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'tutorial_videos'
        and column_name in ('video_url', 'storage_path')
    ),
    'thumbnail_schema', (
      select count(*) = 2
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'tutorial_videos'
        and column_name in ('thumbnail_url', 'thumbnail_storage_path')
    )
  );
$$;

revoke all on function public.catalog_admin_save_snapshot() from public, anon, authenticated;
grant execute on function public.catalog_admin_save_snapshot() to service_role;

commit;
