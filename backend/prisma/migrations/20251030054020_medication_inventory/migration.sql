-- CreateTable
CREATE TABLE "MedicationInventory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "medicationName" TEXT NOT NULL,
    "dosageStrength" TEXT,
    "form" TEXT,
    "initialQuantity" INTEGER NOT NULL,
    "currentQuantity" REAL NOT NULL,
    "quantityUnit" TEXT,
    "dosagePerTime" INTEGER NOT NULL,
    "timesPerDay" INTEGER NOT NULL,
    "dosageTimes" TEXT NOT NULL,
    "dailyConsumption" REAL,
    "daysRemaining" INTEGER,
    "expectedEmptyDate" DATETIME,
    "autoReminderEnabled" BOOLEAN NOT NULL DEFAULT true,
    "reminderIds" TEXT,
    "lowStockThreshold" INTEGER NOT NULL DEFAULT 10,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "medicationId" TEXT,
    CONSTRAINT "MedicationInventory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MedicationInventory_medicationId_fkey" FOREIGN KEY ("medicationId") REFERENCES "medications" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MedicationConsumptionLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "medicationInventoryId" TEXT NOT NULL,
    "reminderId" TEXT,
    "consumedQuantity" REAL NOT NULL,
    "consumptionTime" DATETIME NOT NULL,
    "remainingQuantity" REAL NOT NULL,
    "consumptionType" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MedicationConsumptionLog_medicationInventoryId_fkey" FOREIGN KEY ("medicationInventoryId") REFERENCES "MedicationInventory" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MedicationRefillLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "medicationInventoryId" TEXT NOT NULL,
    "refillQuantity" INTEGER NOT NULL,
    "refillDate" DATETIME NOT NULL,
    "pharmacy" TEXT,
    "prescriptionNumber" TEXT,
    "cost" REAL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MedicationRefillLog_medicationInventoryId_fkey" FOREIGN KEY ("medicationInventoryId") REFERENCES "MedicationInventory" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
