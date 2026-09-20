-- Add planned profile nutrition goals and bilingual supplement descriptions.
ALTER TABLE "profiles" ADD COLUMN "nutritionGoals" TEXT;
ALTER TABLE "supplements" ADD COLUMN "description" TEXT;
ALTER TABLE "supplements" ADD COLUMN "descriptionEn" TEXT;

-- Add self-referencing nested comments while preserving existing rows.
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_comments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "parentId" TEXT,
    "authorName" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "comments_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "comments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "comments_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "comments" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_comments" ("authorName", "content", "createdAt", "id", "postId", "updatedAt", "userId")
SELECT "authorName", "content", "createdAt", "id", "postId", "updatedAt", "userId" FROM "comments";

DROP TABLE "comments";
ALTER TABLE "new_comments" RENAME TO "comments";
CREATE INDEX "comments_parentId_idx" ON "comments"("parentId");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
