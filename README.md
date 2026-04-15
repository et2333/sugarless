# Diabetes Care Platform

<div align="center">

**A Comprehensive Health Management Platform for Diabetes Patients and Caregivers**

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/typescript-5.3.3-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/react-18.2.0-61dafb)](https://reactjs.org/)
<br />
[Quick Start](#quick-start) &middot; [Configuration](#configuration) &middot; [Scrum Framework](#Scrum-Framework) &middot; [Documentation](#documentation) &middot; [Advanced Technologies](#advanced-technologies)

</div>

---

## Overview

Diabetes Care Platform is a full-stack web application designed to support diabetes patients and their caregivers through comprehensive health management tools. The platform integrates AI-powered features, medication tracking, blood sugar monitoring, intelligent reminders, community support, and e-commerce capabilities to provide a holistic care experience.

### Key Highlights

- **AI-Powered Health Assistant** - Natural language health consultations and personalized recommendations
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
   git clone <repository-url>
   cd 5620-Thu-11-13-Group-120
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


## Scrum Framework

This project was developed under the **Scrum** framework following the principles taught in *ELEC5620 Topic 8: Agile Software Process Model Practice*.  
Our team adopted an **adaptive**, **iterative**, and **people-oriented** approach, completing **three sprints across a 3-week development cycle**.  
The Scrum process ensured continuous integration, rapid feedback, and iterative improvement, enabling the team to balance innovation with deliverable stability.

### Scrum Overview

| Category     | Description |
|---------------|-------------|
| **Roles**     | Product Owner, Scrum Master, Development Team |
| **Artifacts** | Product Backlog, Sprint Backlog, Burndown Charts, Retrospective Notes |
| **Events**    | Sprint Planning, Daily Scrum, Sprint Review, Sprint Retrospective |
| **Iterations**| Three Sprints (Initialization, Core Development, Optimization & Delivery) |

---

### Team Roles and Responsibilities

| Role | Responsibilities |
|------|------------------|
| **Product Owner** | Defined and prioritized features in the Product Backlog, aligned sprint goals with client and rubric requirements, and ensured value delivery. |
| **Scrum Master** | Facilitated Scrum ceremonies, removed impediments, and ensured adherence to Agile principles and continuous improvement. |
| **Developers (Full Stack)** | Designed, implemented, and tested core system features including authentication, AI assistant, and reminder modules. |
| **Developers (Frontend)** | Implemented UI components, integrated API endpoints, and handled user interaction flows using React and Ant Design. |
| **Developers (Backend)** | Managed database schema (Prisma), API logic (Express), and real-time communication (Socket.IO). |
| **QA & Documentation Support** | Conducted integration testing, maintained documentation, and verified sprint acceptance criteria. |

<br />

### Sprint Summary

#### **Sprint 1 — Initialization & Setup**
**Objective:** Establish the development environment and foundational project structure.  
**Key Deliverables:**
- Initialized GitHub repository and project folder hierarchy  
- Set up JIRA backlog, defined epics, and created user stories  
- Configured CI/CD automation scripts and initial `.env` templates  
- Implemented base architecture for frontend (Vite + React) and backend (Express + Prisma)  

**Acceptance Criteria:**  
- Repository functional and synchronized across all members  
- JIRA board reflects complete backlog with prioritization  
- Environment setup verified through successful local builds  


#### **Sprint 2 — Core Development**
**Objective:** Deliver the primary functional modules.  

**Key Deliverables:**
- Completed **user authentication**, **AI health assistant**, and **smart reminder** systems  
- Developed **RESTful APIs** for medication, reminders, and blood sugar data  
- Integrated **Socket.IO** for real-time updates  
- Implemented responsive **frontend dashboards** and UI layouts  
- Conducted mid-sprint code review and unit testing  

**Acceptance Criteria:**  
- Core modules operate across backend and frontend without major issues  
- AI assistant responds correctly to basic health queries  
- Reminder system triggers notifications successfully  
- Mid-sprint retrospective completed with action points recorded  


#### **Sprint 3 — Optimization & Delivery**
**Objective:** Optimize the platform and finalize for submission.  
**Key Deliverables:**
- Conducted **integration and regression testing**  
- Enhanced UI consistency and error handling  
- Finalized database seeding scripts for demo users  
- Updated technical documentation and prepared ZIP deliverables  
- Conducted final retrospective and demo rehearsal  

**Acceptance Criteria:**  
- Stable build passes all functional test cases  
- Demo runs successfully in local and CI environments  
- Retrospective outcomes applied for post-submission improvement  


### Agile Artifacts and Workflow

| Artifact | Description |
|-----------|-------------|
| **Product Backlog** | Centralized list of all desired features including AI modules, reminders, dashboards, and integrations; managed via JIRA with prioritization labels. |
| **Sprint Backlog** | Subset of product backlog selected for each sprint, tracked with user stories and story points. |
| **Burndown Chart** | Visualized sprint progress and velocity using JIRA analytics dashboards. |
| **Retrospective Notes** | Captured insights and lessons from each sprint following Kerth’s Prime Directive. |
| **Definition of Done (DoD)** | A feature was considered done when it passed code review, unit tests, and integration verification. |
| **Feedback Loop** | Continuous communication across JIRA, GitHub commits, and daily WeChat syncs ensured transparency and quick issue resolution. |






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
5620-Thu-11-13-Group-120/
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
├── docs/                      # Documentation
│   ├── guides/
│   ├── integrations/
│   └── reports/
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

### Document Types & Locations

| Document Type         | Description                                         | Tool                        | Update Frequency | Responsible                                   |
| --------------------- | --------------------------------------------------- | --------------------------- | ---------------- | --------------------------------------------- |
| Sprint Backlog        | List of tasks for current sprint                    | JIRA                        | Daily            | Yuxin Liao, Yiting Liu                        |
| README Document       | Project documentation                               | GitHub                      | Per sprint       | Shixing Huang, Zhuoxin Chen, Yiting Liu       |
| User Stories          | Feature requirements for Initialization               | Google Docs, GitHub         | Per sprint       | Yuxin Liao                                    |
| Product Backlog       | Feature requirements for iterative refinement & prioritization | Google Docs, JIRA, GitHub | Per sprint       | Yiting Liu                                    |
| Retrospectives        | Sprint reflection notes                             | GitHub                      | Weekly           | Yuxin Liao, Yiting Liu                        |
| Source Code           | Application code                                    | GitHub                      | Per commit       | Xiangshan Wang, Shixing Huang                 |
| Lab/Meeting Notes     | Weekly sync records                                 | Google Docs                 | Weekly           | Yiting Liu                                    |
| Daily Progress Update | Daily progress update                               | WeChat                      | Daily            | Yiting Liu                                    |

Shortcuts:
- Team Contributions: `docs/CONTRIBUTIONS.md`
- Sprint Retrospectives: `docs/Sprint Retrospectives/`

### Access & Permissions

- All team members: Full access to all platforms
- Teaching Team: JIRA, GitHub (Google Docs if checking needed)
- Stakeholders: Read access to JIRA board and GitHub

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
- Gemini-powered health assistant and routes (backend/src/routes/ai.routes.ts)
- Agent-style modules for domain logic (backend/src/agents/core/BaseAgent.ts, backend/src/agents/DietAgent.ts)
- Real-time reminders and chat using Socket.IO (backend/src/server.ts, backend/src/services/reminderScheduler.ts)

---

## Troubleshooting

### Port Already in Use

```bash
# Windows (PowerShell)
Get-Process -Id (Get-NetTCPConnection -LocalPort 3001).OwningProcess -ErrorAction SilentlyContinue | Stop-Process -Force
Get-Process -Id (Get-NetTCPConnection -LocalPort 5173).OwningProcess -ErrorAction SilentlyContinue | Stop-Process -Force

# macOS/Linux
lsof -ti:3001 | xargs kill -9 || true
lsof -ti:5173 | xargs kill -9 || true
```

### Database Errors

```bash
cd backend
npx prisma migrate reset
npx prisma db seed
```

### Prisma Client Errors

```bash
cd backend
npx prisma generate
```

### Dependency Issues

```bash
rm -rf node_modules package-lock.json
rm -rf backend/node_modules backend/package-lock.json
rm -rf frontend/node_modules frontend/package-lock.json
npm run install:all
```

### Environment Variables Not Loading

Make sure your `.env` file is in the `backend` directory and contains all required variables.

---

## Contributing

We welcome contributions from all team members during the 3-week development period.

Please follow these simple steps:

1. Pull the latest code from `main`.
2. Make your changes directly on `main`.
3. Write clear commit messages describing what you changed.
4. Run and test your changes locally before pushing.
5. Push to `main` and notify teammates on Slack/JIRA.

### Code Style Guidelines

- Use TypeScript for all new code.
- Follow existing file structure and naming conventions.
- Add comments for non-trivial logic.
- Keep commits small and meaningful.
- Ensure the project still runs without errors before pushing.

### Notes

Since this is a short course project with three sprints, we skip branch management and PR reviews to save time. Please still communicate before making major changes.

---

## License

This repository is for academic coursework (ELEC5620) only and not intended for open-source distribution.

---

## Team

**5620-Thu-11-13-Group-120**

---

## Acknowledgments

- [Ant Design](https://ant.design/) - UI component library
- [Prisma](https://www.prisma.io/) - Database ORM
- [Google Gemini](https://deepmind.google/technologies/gemini/) - AI capabilities
- [React](https://react.dev/) - UI framework

---

<div align="center">

### Built with love for Diabetes Patients and Caregivers

**Start contributing today and help improve diabetes care!**

[Documentation](./docs/)

</div>



