# Product Backlog

This backlog is a simple, prioritized list of Product Backlog Items (PBIs). Estimates use Fibonacci story points (1, 2, 3, 5, 8, 13). Higher priority numbers indicate lower priority; Priority 1 is highest.

| PBI ID | Title | Category | Description (short) | Priority | Estimate (SP) | Suggested Owner |
| --- | --- | --- | --- | ---:| ---:| --- |
| PBI-001 | Email-verified Registration & Login | Customer Feature | Register, SendGrid verification token, verified login, JWT session (backend/src/routes/auth.routes.clean.ts) | 1 | 5 | Backend + Frontend |
| PBI-002 | Blood Sugar Tracking | Customer Feature | CRUD records, insights endpoint, charts in frontend (backend/src/routes/bloodSugar.routes.ts) | 2 | 8 | Frontend + Backend |
| PBI-003 | Medication Management | Customer Feature | Manage medications, inventory linkage, refill thresholds (backend/src/routes/medication.routes.ts) | 3 | 8 | Frontend + Backend |
| PBI-004 | Reminder System with Socket.IO | Customer Feature | Create reminders, real-time schedule + responses, snooze/completion (backend/src/routes/reminder.routes.ts, services/reminderScheduler.ts) | 4 | 13 | Backend |
| PBI-005 | AI Health Assistant (Gemini) | Customer Feature | Chat, quick replies, insights; Gemini integration (backend/src/routes/ai.routes.ts) | 5 | 8 | Backend + Frontend |
| PBI-006 | Payment Checkout (Stripe) | Customer Feature | Create intents, webhook handling, status updates (backend/src/routes/payment.routes.ts) | 6 | 8 | Backend |
| PBI-007 | Merchant/Order Management | Customer Feature | User orders, merchant order views and updates (backend/src/routes/order.routes.ts, merchantOrder.routes.ts) | 7 | 8 | Backend |
| PBI-008 | E-commerce Product Catalog | Customer Feature | Product search (NLQ), detail, inventory (backend/src/routes/product.routes.ts, inventory.routes.ts) | 8 | 8 | Backend + Frontend |
| PBI-009 | Community Posts & Comments | Customer Feature | Basic social features (backend/src/routes/community.routes.ts) | 9 | 5 | Backend + Frontend |
| PBI-010 | Dashboard Overview | Customer Feature | Key metrics and shortcuts (backend/src/routes/dashboard.routes.ts) | 10 | 3 | Frontend |
| PBI-011 | Profile & Avatar | Customer Feature | User profile CRUD, avatar field (backend/src/routes/profile.routes.ts) | 11 | 5 | Frontend |
| PBI-012 | Shopping List | Customer Feature | CRUD shopping lists and items (backend/src/routes/shoppingList.routes.ts) | 12 | 3 | Frontend |
| PBI-013 | Calendar Sync (Google) | Customer Feature | OAuth, sync events for reminders (backend/src/services/calendarService.ts, routes/notification.routes.ts) | 13 | 8 | Backend |
| PBI-014 | Voice Transcription (AssemblyAI) | Customer Feature | Upload/URL transcription for AI chat (backend/src/services/ai/chatService.ts) | 14 | 5 | Backend |
| PBI-015 | Internationalization (i18n) | Internal Task | i18next setup and bilingual UI | 15 | 3 | Frontend |
| PBI-016 | Real-time Notifications | Internal Task | Socket.IO server + client setup (backend/src/server.ts) | 16 | 5 | Backend |
| PBI-017 | One-Click Dev Scripts | Internal Task | scripts/quick-start-auth.bat, clean script, backend/quick-setup.ps1 | 17 | 3 | Infra |
| PBI-018 | Database Schema & Migrations | Internal Task | Prisma schema, non-interactive deploy, seed users (backend/prisma/*) | 18 | 5 | Backend |
| PBI-019 | Email Services Hardening | Internal Task | Resend (transactional) + SendGrid (verification); env wiring | 19 | 3 | Backend |
| PBI-020 | Test Endpoints & Healthchecks | Internal Task | /health, test email/sms/stripe routes for manual QA | 20 | 2 | Backend |

Notes
- Estimates are initial team values and should be refined during sprint planning.
- PBIs 001–010 are customer features; PBIs 015–020 are internal tasks that deliver product value indirectly.
- This backlog should stay in strict priority order; reorder at each sprint planning.
