from __future__ import annotations

import unittest
from pathlib import Path


from scraping.warehouse.normalize_warehouse_xlsx import normalize


class WarehouseNormalizationTests(unittest.TestCase):
    def test_keeps_only_fields_used_by_admin_panel(self) -> None:
        products, review = normalize([{
            "Nomor SKU": "GRS-100",
            "Judul": "Regulator Gascomp",
            "Kategori": "Regulator Gas",
            "Tautan Gambar": "https://res.bigseller.pro/example.jpg",
            "Kode Produk": "88000001",
            "Modal Referensi": "50000",
            "Semua Total Stok": "100",
            "Berat Bersih(g)": "200",
            "Catatan SKU Gudang": "catatan internal",
        }])
        self.assertEqual(review, [])
        self.assertEqual(len(products), 1)
        self.assertEqual(set(products[0]), {
            "sourceProductId", "slug", "sku", "name", "model", "imageUrl",
        })
        self.assertNotIn("50000", str(products[0]))
        self.assertNotIn("catatan internal", str(products[0]))

    def test_imports_product_without_image_and_reports_it(self) -> None:
        products, review = normalize([{
            "Nomor SKU": "GHO 50 HP",
            "Judul": "GHO 50 HP",
            "Kategori": "Tidak Ada Kategori",
            "Tautan Gambar": "",
            "Kode Produk": "88000999",
        }])
        self.assertEqual(products[0]["model"], "")
        self.assertEqual(products[0]["imageUrl"], "")
        self.assertEqual(len(review), 1)
        self.assertIn("has no image link", review[0]["reason"])


if __name__ == "__main__":
    unittest.main()
