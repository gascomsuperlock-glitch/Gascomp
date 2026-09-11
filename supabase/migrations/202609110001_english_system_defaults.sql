-- Replace the original Indonesian support-hours default without overwriting custom values.
begin;

update public.site_settings
set support_hours = 'Monday–Saturday, 08:00–17:00 WIB'
where support_hours = 'Senin–Sabtu, 08.00–17.00 WIB';

update public.products
set
  name = case when name = 'Produk Baru' then 'New Product' else name end,
  model = case when model = 'Nama model' then 'Model name' else model end,
  description = case
    when description = 'Tambahkan ringkasan bantuan untuk produk ini.' then 'Add a short support summary for this product.'
    else description
  end
where source_provider is null
  and (
    name = 'Produk Baru'
    or model = 'Nama model'
    or description = 'Tambahkan ringkasan bantuan untuk produk ini.'
  );

update public.product_variations
set name = 'New variation'
where name = 'Variasi baru';

update public.product_images image
set alt = 'Photo of ' || product.name
from public.products product
where image.product_id = product.id
  and image.alt in ('Foto ' || product.name, 'Foto Produk Baru');

update public.tutorial_videos
set title = 'New tutorial'
where title = 'Tutorial baru';

update public.faq_items
set
  question = case when question = 'Pertanyaan baru' then 'New question' else question end,
  answer = case
    when answer = 'Tuliskan jawaban untuk pelanggan.' then 'Write an answer for the customer.'
    else answer
  end
where question = 'Pertanyaan baru'
  or answer = 'Tuliskan jawaban untuk pelanggan.';

commit;
