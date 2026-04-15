-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_products" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "nameEn" TEXT,
    "brand" TEXT,
    "category" TEXT NOT NULL,
    "dosage" TEXT,
    "quantity" INTEGER,
    "unit" TEXT,
    "price" REAL NOT NULL,
    "vendor" TEXT NOT NULL DEFAULT 'demo_vendor',
    "inStock" BOOLEAN NOT NULL DEFAULT true,
    "stockQuantity" INTEGER DEFAULT 100,
    "prescriptionRequired" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "descriptionEn" TEXT,
    "imageUrl" TEXT,
    "diabetesRelevance" REAL DEFAULT 0.5,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_products" ("brand", "category", "createdAt", "description", "dosage", "id", "imageUrl", "inStock", "name", "price", "quantity", "unit", "vendor") SELECT "brand", "category", "createdAt", "description", "dosage", "id", "imageUrl", "inStock", "name", "price", "quantity", "unit", "vendor" FROM "products";
DROP TABLE "products";
ALTER TABLE "new_products" RENAME TO "products";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
