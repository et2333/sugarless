-- CreateTable
CREATE TABLE "supplements" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "nameEn" TEXT,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "activeIngredients" TEXT NOT NULL,
    "benefits" TEXT NOT NULL,
    "indications" TEXT NOT NULL,
    "suitableFor" TEXT NOT NULL,
    "contraindications" TEXT NOT NULL DEFAULT '[]',
    "dosage" TEXT NOT NULL,
    "sideEffects" TEXT NOT NULL DEFAULT '{}',
    "evidenceLevel" TEXT NOT NULL DEFAULT 'C',
    "evidenceSources" TEXT NOT NULL DEFAULT '[]',
    "expectedImpact" TEXT NOT NULL,
    "averagePrice" REAL,
    "imageUrl" TEXT,
    "productUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "recommendations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "focus" TEXT,
    "rationale" TEXT,
    "aiModel" TEXT,
    "confidence" REAL,
    "feedback" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "generatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "viewedAt" DATETIME,
    CONSTRAINT "recommendations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "recommendation_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "recommendationId" TEXT NOT NULL,
    "supplementId" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "strength" TEXT NOT NULL,
    "reasons" TEXT NOT NULL,
    "expectedImpact" TEXT NOT NULL,
    "evidenceLevel" TEXT NOT NULL,
    "evidenceSources" TEXT NOT NULL DEFAULT '[]',
    "interactions" TEXT NOT NULL DEFAULT '[]',
    "pricing" TEXT,
    "relevanceScore" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "recommendation_items_recommendationId_fkey" FOREIGN KEY ("recommendationId") REFERENCES "recommendations" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "recommendation_items_supplementId_fkey" FOREIGN KEY ("supplementId") REFERENCES "supplements" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "supplement_watchlist" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "supplementId" TEXT NOT NULL,
    "notes" TEXT,
    "targetPrice" REAL,
    "notifyOnPrice" BOOLEAN NOT NULL DEFAULT false,
    "addedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "supplement_watchlist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "supplement_watchlist_userId_supplementId_key" ON "supplement_watchlist"("userId", "supplementId");
