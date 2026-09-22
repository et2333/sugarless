# SugarLess — Diabetes Care Platform

<div align="center">

**A Comprehensive Health Management Platform for Diabetes Patients and Caregivers**

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/typescript-5.3.3-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/react-18.2.0-61dafb)](https://reactjs.org/)
<br />
[Quick Start](#quick-start) &middot; [Configuration](#configuration) &middot; [Scrum Framework](#scrum-framework) &middot; [Documentation](#documentation) &middot; [Advanced Technologies](#advanced-technologies)

</div>

---

## Overview

Diabetes Care Platform is a full-stack web application designed to support diabetes patients and their caregivers through comprehensive health management tools. The platform integrates AI-powered features, medication tracking, blood sugar monitoring, intelligent reminders, community support, and e-commerce capabilities to provide a holistic care experience.

### Key Highlights

- **AI-Powered Health Assistant** - Safety-first hybrid intent routing, health consultations, and personalized recommendations
- **Comprehensive Health Tracking** - Blood sugar monitoring, medication management, and activity logging
- **Smart Adaptive Reminders** - AI-driven reminder system that learns from user behavior
- **Medication Management** - Inventory tracking, refill alerts, and consumption logs
- **E-Commerce Integration** - Product search, shopping lists, and order management with Stripe payments
- **Community Features** - Social posts, comments, and engagement
- **Multi-language Support** - English and Chinese interfaces

---

## Features

### Core Features

#### 1. **User Authentication & Profile Management**
- Secure JWT-based authentication
- Email verification system
- User profiles with health information
- Role-based access (user, merchant, admin)

#### 2. **AI Health Assistant**
- Natural language health consultations
- Voice input and transcription support
- Emergency detection and response
- Personalized health recommendations
- Quick reply suggestions
- Multi-language support (English/Chinese)

#### 3. **Blood Sugar Tracking**
- Record and track blood sugar levels
- Multiple measurement types (fasting, post-prandial, random, HbA1c)
- Data visualization and trend analysis
- AI-powered insights and alerts
- Historical data management

#### 4. **Medication Management**
- Medication inventory tracking
- Consumption logging
- Refill alerts and forecasting
- Medication reminders integration
- Dosage and schedule management

#### 5. **Smart Reminder System**
- **AI-Powered Adaptive Reminders**
  - Behavior tracking (snooze, complete, dismiss patterns)
  - Automatic time optimization suggestions
  - Smart notifications after 5 consecutive snoozes
  - Automatic schedule adjustment based on response delays
- Multiple reminder types:
  - Medication reminders
  - Blood sugar check reminders
  - Exercise reminders
  - Follow-up reminders
- Rich notification options:
  - System notifications
  - Sound alerts
  - Voice messages
  - Vibration
  - In-app popups
- Snooze options: 1 minute, 10 minutes, 1 hour
- Priority levels: High, Medium, Low
- Recurrence patterns: Daily, Weekly, One-time

#### 6. **Check-in System**
- User action tracking (complete, snooze, dismiss)
- Check-in history and statistics
- Streak tracking
- Response delay analysis
- Visual check-in calendar

#### 7. **Meal Planning & Nutrition**
- AI-generated personalized meal plans
- Dietary preference management
- Allergy tracking
- Nutrition analysis
- Shopping list generation

#### 8. **Product Search & E-Commerce**
- Natural Language Query (NLQ) search
- Product recommendations based on health profile
- Shopping lists and vendors
- Order management
- Stripe payment integration
- Merchant dashboard

#### 9. **Community Features**
- Social posts and discussions
- Comments and likes
- Health topic forums
- Community engagement tracking

#### 10. **Dashboard & Analytics**
- Health metrics overview
- Quick access to key features
- Recent activity summary
- Visual data representations

---

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** - Fast build tool and dev server
- **Ant Design 5** - Enterprise UI component library
- **React Router v6** - Client-side routing
- **Zustand** - Lightweight state management
- **TanStack Query** - Data fetching and caching
- **Socket.IO Client** - Real-time communication
- **i18next** - Internationalization (i18n)
- **Recharts** - Data visualization
- **Day.js** - Date manipulation
- **Stripe.js** - Payment processing

### Backend
- **Node.js** with **Express** and TypeScript
- **Prisma** - Next-generation ORM
- **SQLite** - Database (development)
- **Socket.IO** - Real-time notifications
- **JWT** - Authentication tokens
- **bcrypt** - Password hashing
- **Zod** - Schema validation
- **node-cron** - Scheduled tasks

### AI & External Services
- **Google Gemini AI** - Health assistant and recommendations
- **AssemblyAI** - Voice transcription
- **Stripe API** - Payment processing
- **Resend** - Transactional/general emails (welcome, notifications)
- **SendGrid** - Email verification (verification link emails)

### Development Tools
- **TypeScript** - Type safety
- **ESLint** - Code linting
- **Concurrently** - Run multiple commands
- **tsx** - TypeScript execution

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (React)                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐     │ 
│  │  Pages   │  │Components│  │   API    │  │  Stores  │     │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘     │
│       │             │             │              │          │
│       └─────────────┴─────────────┴──────────────┘          │
│                          │                                  │
│                    Socket.IO Client                         │
└──────────────────────────┼──────────────────────────────────┘
                           │ HTTP/WebSocket
┌──────────────────────────┼───────────────────────────────────┐
│                    Backend (Express)                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │  Routes  │  │Services  │  │Middleware│  │  Utils   │      │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘      │
│       │             │             │              │           │
│       └─────────────┴─────────────┴──────────────┘           │
│                          │                                   │
│  ┌───────────────────────┴───────────────────────┐           │
│  │                  Prisma ORM                   │           │
│  └───────────────────────┬───────────────────────┘           │
│                          │                                   │
│                    SQLite Database                           │
└──────────────────────────────────────────────────────────────┘
                           │
┌──────────────────────────┼──────────────────────────────────┐
│                  External Services                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
│  │ Gemini AI│  │  Stripe  │  │  Resend  │  │Calendar  │     │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘     │
└─────────────────────────────────────────────────────────────┘
```

---

## Quick Start

### Prerequisites

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- **Git**

### Windows (One-Click Startup)

- From the repo root, double-click: `scripts/quick-start-auth.bat`.
- What it does:
  - Installs dependencies for root, backend and frontend.
  - Creates `backend/.env` from `backend/.env.example` if missing.
  - Runs `npx prisma generate` and `npx prisma migrate deploy`.
  - Seeds demo accounts (demo and merchant) for quick login.
  - Starts backend and frontend concurrently.

Helper script:
- `scripts/clean-users-keep-tests.bat`: resets the local SQLite DB, reapplies migrations, and ensures only the two test accounts remain.

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/et2333/sugarless.git
   cd sugarless
   ```

2. **Install dependencies**
   ```bash
   npm run install:all
   ```
   This installs dependencies for root, backend, and frontend.

3. **Set up the backend**
   
   Navigate to the backend directory:
   ```bash
   cd backend
   ```

   **Windows (PowerShell):**
   ```powershell
   .\quick-setup.ps1
   ```
   
   **macOS/Linux:**
   ```bash
   chmod +x quick-setup.sh
   ./quick-setup.sh
   ```

   **Or manually:**
   ```bash
   # Copy environment template
   cp .env.example .env
   
   # Edit .env and add your API keys (see Configuration section)
   
   # Generate Prisma Client
   npx prisma generate
   
   # Run database migrations
   npx prisma migrate deploy
   
   # Seed the database
   npx prisma db seed
   ```

4. **Start the development servers**

   **From root directory:**
   ```bash
   npm run dev
   ```

   **Or use the quick start script:**
   - Windows: Double-click `scripts/quick-start-auth.bat`
   - macOS/Linux: `./scripts/quick-start-auth.sh`

5. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3001
   - Prisma Studio: `cd backend && npx prisma studio` (http://localhost:5555)

### Test Accounts

```
Regular User:
  Email: demo@example.com
  Password: Demo123456!

Merchant Account:
  Email: merchant@example.com
  Password: Merchant123456!
```



---


## Configuration

### Environment Variables

Create a `.env` file in the `backend` directory based on `.env.example`:

```env
# Database
DATABASE_URL="file:./dev.db"

# JWT
JWT_SECRET="your-secret-key-here"

# Server
PORT=3001
NODE_ENV=development

# AI Services
GEMINI_API_KEY="your-google-gemini-api-key"
ASSEMBLYAI_API_KEY="your-assemblyai-api-key"

# Email Service
RESEND_API_KEY="your-resend-api-key"
SENDGRID_API_KEY="your-sendgrid-api-key"
SENDGRID_FROM_EMAIL="noreply@yourdomain.com"
FRONTEND_URL="http://localhost:5173"

# Payment (Stripe)
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."

# SMS (Optional)
CLICKSEND_USERNAME="your-username"
CLICKSEND_API_KEY="your-api-key"

# Google Calendar (Optional)
GOOGLE_CLIENT_ID="your-client-id"
GOOGLE_CLIENT_SECRET="your-client-secret"
GOOGLE_REDIRECT_URI="http://localhost:3001/api/auth/google/callback"
```

### Required API Keys

1. **Google Gemini API**: Get from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. **Resend API**: Get from [Resend](https://resend.com)
3. **SendGrid API** (email verification): Get from [SendGrid](https://app.sendgrid.com/settings/api_keys)
4. **Stripe API**: Get from [Stripe Dashboard](https://dashboard.stripe.com/test/apikeys)

### Optional Services

- **AssemblyAI**: For voice transcription features
- **ClickSend**: For SMS notifications
- **Google Calendar**: For calendar integration

---

## Project Structure

```
sugarless/
├── backend/                    # Backend API server
│   ├── src/
│   │   ├── routes/            # API route handlers
│   │   │   ├── ai.routes.ts
│   │   │   ├── auth.routes.ts
│   │   │   ├── reminder.routes.ts
│   │   │   ├── medication.routes.ts
│   │   │   ├── bloodSugar.routes.ts
│   │   │   └── ...
│   │   ├── services/          # Business logic
│   │   │   ├── ai/
│   │   │   │   └── chatService.ts
│   │   │   ├── reminderScheduler.ts
│   │   │   └── ...
│   │   ├── middleware/        # Express middleware
│   │   │   ├── auth.ts
│   │   │   └── errorHandler.ts
│   │   ├── agents/            # AI agents
│   │   │   ├── DietAgent.ts
│   │   │   └── RecommendationAgent.ts
│   │   ├── utils/             # Utilities
│   │   └── server.ts          # Express server setup
│   ├── prisma/
│   │   ├── schema.prisma      # Database schema
│   │   ├── migrations/        # Database migrations
│   │   └── seed-all.ts        # Database seeding
│   ├── tests/                  # Deterministic unit and integration tests
│   ├── evals/intent/           # Intent datasets, runners, and baselines
│   ├── scripts/                # Backend maintenance scripts
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/                   # Frontend React app
│   ├── src/
│   │   ├── pages/             # Page components
│   │   │   ├── Dashboard.tsx
│   │   │   ├── AIAssistant.tsx
│   │   │   ├── Reminders.tsx
│   │   │   ├── BloodSugarTracker.tsx
│   │   │   └── ...
│   │   ├── components/        # Reusable components
│   │   │   ├── ai/
│   │   │   ├── reminder/
│   │   │   └── ...
│   │   ├── api/               # API client functions
│   │   ├── services/          # Frontend services
│   │   │   ├── reminderNotificationService.ts
│   │   │   └── pushService.ts
│   │   ├── stores/            # State management (Zustand)
│   │   ├── utils/             # Utilities
│   │   └── App.tsx            # Main app component
│   ├── public/
│   │   └── sw.js              # Service Worker
│   ├── package.json
│   └── vite.config.ts
│
├── docs/                      # Quick start, routing, and project documentation
│
├── scripts/                   # Utility scripts
├── docker-compose.yml         # Docker configuration
├── package.json               # Root package.json
└── README.md                  # This file
```

---

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `GET /api/auth/verify` - Verify email

### AI Assistant
- `POST /api/ai/chat` - Send message to AI assistant
- `POST /api/ai/transcribe` - Transcribe audio
- `GET /api/ai/quick-replies` - Get quick reply suggestions

### Reminders
- `GET /api/reminders` - Get all reminders
- `POST /api/reminders` - Create reminder
- `PUT /api/reminders/:id` - Update reminder
- `DELETE /api/reminders/:id` - Delete reminder
- `POST /api/reminders/:id/complete` - Mark reminder as complete
- `POST /api/reminders/record-response` - Record user action (snooze/complete/dismiss)
- `POST /api/reminders/:id/analyze` - Trigger AI analysis
- `GET /api/reminders/responses/recent` - Get recent check-ins

### Blood Sugar
- `GET /api/blood-sugar` - Get blood sugar records
- `POST /api/blood-sugar` - Create blood sugar record
- `GET /api/blood-sugar/insights` - Get AI insights

### Medications
- `GET /api/medications` - Get medications
- `POST /api/medications` - Add medication
- `PUT /api/medications/:id` - Update medication
- `DELETE /api/medications/:id` - Delete medication

### Meal Plans
- `GET /api/meal-plans` - Get meal plans
- `POST /api/meal-plans/generate` - Generate AI meal plan

### Products
- `GET /api/products/nlq-search` - Natural language product search
- `GET /api/products/:id` - Get product details

For detailed API documentation, see the individual route files in `backend/src/routes/`.

---

## Development

### Running in Development Mode

```bash
# Start both frontend and backend
npm run dev

# Or start separately
npm run dev:backend  # Backend only (port 3001)
npm run dev:frontend # Frontend only (port 5173)
```

### Database Management

```bash
cd backend

# Generate Prisma Client
npx prisma generate

# Create a new migration
npx prisma migrate dev --name migration_name

# Reset database ( deletes all data)
npx prisma migrate reset

# Open Prisma Studio (database GUI)
npx prisma studio

# Seed database
npx prisma db seed
```

### Testing API Endpoints

Use VS Code with the REST Client extension and open:
- `backend/test-api.http` - General API tests
- `backend/test-b1-nlq-api.http` - NLQ search tests
- `backend/test-b2-recommendations.http` - Recommendation tests

 

## Documentation

### Tools

- JIRA: Sprint planning, task tracking, acceptance criteria
- GitHub: Source code, technical docs, version control, sprint retrospectives, user story summaries
- Google Docs: Lab/meeting notes, team decisions, sprint product backups
- WeChat: Daily progress sync

### Document Workflow

- Discussion & Planning: Google Docs (User Stories, Product Backlog) -> JIRA Backlog (Sprint Backlog)
- Development: JIRA tracking -> GitHub commits
- Daily Sync & Review: WeChat -> GitHub Push -> JIRA updates
- Iteration & Refinement (Sprint Summary): JIRA + Google Docs -> Sprint Retrospectives in GitHub

---

## Advanced Technologies

### Application Frameworks
- Frontend: React 18 + TypeScript, Vite, Ant Design 5, React Router, TanStack Query, Zustand, Socket.IO Client (frontend/package.json)
- Backend: Node.js + Express + TypeScript, Prisma ORM (SQLite for dev), Socket.IO, Zod validation, tsx dev runner (backend/package.json, backend/src/server.ts)

### Cloud Services
- Email: Resend (transactional) and SendGrid (verification) configured via `RESEND_API_KEY`, `SENDGRID_API_KEY` (backend/src/services/emailService.ts, backend/src/services/sendgridService.ts)
- Payments: Stripe intents/webhooks (backend/src/routes/payment.routes.ts, test-stripe.routes.ts)
- AI: Google Gemini via `@google/generative-ai` (backend/src/routes/ai.routes.ts)
- Speech: AssemblyAI transcription (backend/src/services/ai/chatService.ts)
- Calendar: Google Calendar OAuth integration and event sync (backend/src/services/calendarService.ts, backend/src/routes/notification.routes.ts)

### Deployment Systems
- Monorepo with npm workspaces (root package.json) and `concurrently` for unified dev (`npm run dev`)
- Database migrations with non-interactive `prisma migrate deploy`; seed scripts for demo users
- One-Click startup/reset: `scripts/quick-start-auth.bat`, `scripts/clean-users-keep-tests.bat`, backend `quick-setup.ps1`
- Note: Docker Compose is not included; local dev relies on npm scripts + Prisma

### New AI Tools or Techniques
- Safety-first hybrid intent routing with deterministic fast paths, Gemini semantic parsing, Zod validation, and multi-turn slot completion
- Versioned intent evaluation with frozen holdouts, safety metrics, latency tracking, and model-token accounting
- Agent-style modules for diet planning and recommendation domain logic
- Real-time reminders and chat using Socket.IO (backend/src/server.ts, backend/src/services/reminderScheduler.ts)

---

## License

This repository originated as a course project created by
**our team (G1ori0u_S, Leslie, Shixing, Xiangshan, et)** and has since been independently maintained and
substantially extended by the repository owner. Sincere thanks to every member
of the original course team for their shared effort. The project is provided for
educational and portfolio purposes; no separate open-source license is granted
unless explicitly stated.

---

## Acknowledgments

- [Ant Design](https://ant.design/) - UI component library
- [Prisma](https://www.prisma.io/) - Database ORM
- [Google Gemini](https://deepmind.google/technologies/gemini/) - AI capabilities
- [React](https://react.dev/) - UI framework

---

<div align="center">

### Built with love for Diabetes Patients and Caregivers

**Supporting safer and more accessible diabetes care.**

[Documentation](./docs/)

</div>



