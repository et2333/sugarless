# Quick Start

## Prerequisites

- Node.js 20+
- npm

## 1. Install dependencies

From the project root:

```bash
npm install
```

## 2. Configure the backend

Create `backend/.env` from `backend/.env.example` and provide the required local values:

```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="replace-with-a-long-random-secret"
GEMINI_API_KEY="your-google-gemini-api-key"
ASSEMBLYAI_API_KEY="your-assemblyai-api-key"
FRONTEND_URL="http://localhost:5173"
PORT=3001
NODE_ENV="development"
```

Leave `HTTPS_PROXY` unset unless a working proxy is required. The `.env` file is ignored by Git and must not be committed.

## 3. Prepare the database

```bash
cd backend
npm run db:generate
npm run db:migrate
```

Optionally load development data:

```bash
npm run db:seed
```

## 4. Verify and start the backend

```bash
npm run build
npm run test:intent-router
npm run dev
```

The API runs at `http://localhost:3001`. Verify it in another terminal:

```bash
curl http://localhost:3001/health
```

Expected response:

```json
{"status":"ok","service":"diabetes-platform-api"}
```

## 5. Start the frontend

In another terminal:

```bash
cd frontend
npm run dev
```

Open `http://localhost:5173` in a browser.

## Notes

- Email, SMS, payment, and calendar integrations require their corresponding environment variables.
- A missing optional service key may disable that integration without preventing the core application from starting.
- Run `npm run db:migrate` after pulling changes that include new Prisma migrations.
