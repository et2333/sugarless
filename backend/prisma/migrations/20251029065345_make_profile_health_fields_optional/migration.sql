-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_profiles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "dateOfBirth" DATETIME NOT NULL,
    "gender" TEXT NOT NULL,
    "phone" TEXT,
    "diabetesType" TEXT,
    "diagnosisDate" DATETIME,
    "hba1c" REAL,
    "fastingGlucose" REAL,
    "allergies" TEXT NOT NULL DEFAULT '[]',
    "dietaryPrefs" TEXT NOT NULL DEFAULT '[]',
    "activityLevel" TEXT NOT NULL DEFAULT 'moderate',
    "avatarId" TEXT DEFAULT 'avatar1',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_profiles" ("activityLevel", "allergies", "avatarId", "createdAt", "dateOfBirth", "diabetesType", "diagnosisDate", "dietaryPrefs", "fastingGlucose", "firstName", "gender", "hba1c", "id", "lastName", "phone", "updatedAt", "userId", "version") SELECT "activityLevel", "allergies", "avatarId", "createdAt", "dateOfBirth", "diabetesType", "diagnosisDate", "dietaryPrefs", "fastingGlucose", "firstName", "gender", "hba1c", "id", "lastName", "phone", "updatedAt", "userId", "version" FROM "profiles";
DROP TABLE "profiles";
ALTER TABLE "new_profiles" RENAME TO "profiles";
CREATE UNIQUE INDEX "profiles_userId_key" ON "profiles"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
