# Warehouse SKU import

[Specification index](../spec.md)

The temporary bulk-import pipeline reads a warehouse XLSX export through `warehouse:normalize` and `warehouse:push`.

- Source columns **Nomor SKU**, **Judul**, **Kategori**, **Tautan Gambar**, and **Kode Produk** are preserved because they are external schema keys.
- Price, cost, stock, GTIN, weight, dimensions, dates, warehouse notes, brand/material/use tags, and combination-SKU details are excluded from the admin schema.
- New products are drafts. Matching uses source identity first and exact SKU second so repeated imports remain idempotent.
- Existing admin-managed names, status, images, tutorials, FAQs, and issue guides are preserved.
- New images are downloaded only from allowlisted HTTPS marketplace hosts, validated as JPG/PNG/WebP up to 5 MB, and copied to `product-images`.

Import result on September 10, 2026: 109 source rows were normalized; 108 new draft products were created; existing SKU `GRS-915` was preserved; 107 images were copied. SKU `GHO 50 HP` remains a draft without an image because the source had no image link. Products absent from the workbook were not deleted.
