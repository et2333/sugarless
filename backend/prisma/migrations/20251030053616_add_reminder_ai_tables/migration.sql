-- CreateTable
CREATE TABLE "reminder_responses" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reminderId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "scheduledTime" DATETIME NOT NULL,
    "actualResponseTime" DATETIME,
    "action" TEXT NOT NULL,
    "snoozeDuration" INTEGER,
    "snoozeCount" INTEGER NOT NULL DEFAULT 0,
    "responseDelay" INTEGER,
    "dayOfWeek" INTEGER,
    "isWeekend" BOOLEAN,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "reminder_responses_reminderId_fkey" FOREIGN KEY ("reminderId") REFERENCES "reminders" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "reminder_responses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "reminder_optimization_suggestions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reminderId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "currentTime" TEXT NOT NULL,
    "suggestedTime" TEXT NOT NULL,
    "confidenceScore" REAL,
    "analysisPeriodDays" INTEGER NOT NULL DEFAULT 30,
    "totalSnoozes" INTEGER,
    "avgSnoozeMinutes" INTEGER,
    "mostCommonActualTime" TEXT,
    "suggestionReason" TEXT,
    "patternDetected" TEXT,
    "suggestionStatus" TEXT NOT NULL DEFAULT 'pending',
    "userResponseAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "reminder_optimization_suggestions_reminderId_fkey" FOREIGN KEY ("reminderId") REFERENCES "reminders" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "reminder_optimization_suggestions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "reminder_adaptation_history" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reminderId" TEXT NOT NULL,
    "oldTime" TEXT NOT NULL,
    "newTime" TEXT NOT NULL,
    "changeReason" TEXT,
    "beforeSnoozeRate" REAL,
    "afterSnoozeRate" REAL,
    "appliedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "reminder_adaptation_history_reminderId_fkey" FOREIGN KEY ("reminderId") REFERENCES "reminders" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "reminder_responses_reminderId_userId_idx" ON "reminder_responses"("reminderId", "userId");

-- CreateIndex
CREATE INDEX "reminder_responses_action_idx" ON "reminder_responses"("action");

-- CreateIndex
CREATE INDEX "reminder_optimization_suggestions_suggestionStatus_idx" ON "reminder_optimization_suggestions"("suggestionStatus");
