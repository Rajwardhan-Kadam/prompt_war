# ⚡ PROMPT WARS 2026 — Official Tournament Platform

**Prompt Wars 2026** is a full-stack Generative AI hackathon and prompt engineering competition platform built with React, Vite, TypeScript, Express, and Supabase.

---

## 🚀 Key Features & Architecture

- **Verified Participant Authentication**: Session-based login using Registration ID and Email matching pre-imported Excel records (`httpOnly` JWT cookies).
- **Per-User Submission Portals**: Unique participant identities binding each submission to a verified contestant with 1-entry-per-round constraints.
- **NLP & Forensic AI Guardrails**: Automated prompt authenticity checks using Gemini AI API with deterministic heuristic fallbacks (burstiness, entropy, cliché markers, +10 bonus points).
- **Service Role Database Security**: Row-Level Security (RLS) enabled across all Supabase tables, restricting direct client access and channeling all database queries through the Express backend via `SUPABASE_SERVICE_ROLE_KEY`.
- **Excel Importer**: Node/TypeScript CLI tool (`scripts/import-participants.ts`) with auto-detecting header matchers, normalization, duplicate detection, and `--dry-run` validation reporting.
- **Referee & Admin Console**: Passcode-secured judge dashboard for grading, rubric calibration, and embargoing/releasing live leaderboard results.

---

## 🛠️ Prerequisites

- **Node.js**: v18.x or higher
- **npm**: v9.x or higher
- **Supabase Account & Project**: Required for cloud database & storage (or runs in local fallback mode)

---

## ⚙️ Environment Configuration

Copy `.env.example` to `.env` in the root directory:

```bash
cp .env.example .env
```

Configure your environment variables:

```env
PORT=3000
NODE_ENV=development
SESSION_SECRET=a_secure_random_secret_string
ADMIN_PASSCODE=pw2026admin
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
GEMINI_API_KEY=your_gemini_api_key
```

---

## 🗄️ Database Setup (Supabase)

1. Open your **Supabase Dashboard** -> **SQL Editor**.
2. Run the base schema script located in [`supabase/schema.sql`](supabase/schema.sql).
3. Alternatively, apply incremental migrations from [`supabase/migrations/`](supabase/migrations/).

---

## 📊 Participant Excel Import

Import registered participants from an Excel spreadsheet (`.xlsx` format containing headers for Name, Email, and Registration ID):

### 1. Test run with `--dry-run` (Validates rows without writing to DB):

```bash
npm run import:participants data/participants.xlsx -- --dry-run
```

### 2. Live import (Upserts into Supabase `participants` table):

```bash
npm run import:participants data/participants.xlsx
```

---

## 💻 Running Locally

Install dependencies:

```bash
npm install
```

Start the Express backend and Vite development server:

```bash
npm run dev
```

The application will be accessible at **`http://localhost:3000`**.

---

## 📦 Build & Production Deployment

To build the static frontend bundle and start the production Express server:

```bash
npm run build
npm start
```

---

## 🧪 Acceptance Testing

Run the automated acceptance suite verifying authentication, submission binding, duplicate protection, and admin authorization:

```bash
npx tsx scripts/test-acceptance.ts
```
