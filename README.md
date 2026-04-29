# Brand Governance Workspace

A production-minded, multi-tenant Brand Governance platform built as a senior-level technical assessment. Teams can define brand guidelines, generate AI-compliant content, run a structured review workflow, and maintain a full audit trail — all scoped per workspace.

---

## Tech Stack

| Tool | Justification |
|---|---|
| **Next.js 16 (App Router)** | Full-stack React with server components, API routes, and dynamic routing in one framework |
| **TypeScript** | End-to-end type safety; critical for RBAC and API contract correctness |
| **Prisma ORM** | Type-safe DB access + rapid schema iteration under a 24h constraint |
| **SQLite** | Zero-setup local dev; swap `DATABASE_URL` to a Postgres URL for production (schema is compatible) |
| **NextAuth v5 (Credentials)** | Avoids building auth from scratch; focus on product logic |
| **OpenAI GPT-4o mini** | Fast, cost-effective LLM with strong instruction-following for both generation and evaluation |
| **Tailwind CSS** | Utility-first CSS — fast to build clean UI without a design system |
| **Lucide React** | Consistent, lightweight icon set |
| **Zod** | Runtime input validation on all API routes |

---

## Features

- **Multi-tenant workspaces** with URL-based isolation (`/[workspaceId]/...`)
- **RBAC** — Admin, Reviewer, Client with enforced permissions on every route
- **Brand memory** — tone, do's/don'ts, writing samples stored per workspace and injected into every prompt
- **AI generation** — GPT-4o mini generates channel-specific content from a structured brief
- **Brand compliance scoring** — second AI call evaluates content and returns score (0–100), violations, suggestions
- **Draft versioning** — each regeneration creates an immutable new version
- **Version comparison** — side-by-side view with compliance details
- **Review workflow** — draft → in_review → approved / rejected / revision_requested
- **Audit trail** — append-only log of all workspace actions with metadata

---

## Setup

### 1. Prerequisites

- Node.js 18+
- An [OpenAI API key](https://platform.openai.com/api-keys) with credits

### 2. Clone and install

```bash
git clone <repo-url>
cd brand-governance-workspace
npm install
```

### 3. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="your-secret-min-32-chars"
NEXTAUTH_URL="http://localhost:3000"
OPENAI_API_KEY="your-openai-api-key"
```

### 4. Run database migrations

```bash
npx prisma migrate dev
```

### 5. Seed demo data

```bash
npm run db:seed
```

This creates:
- **Workspace:** EdificePowerAI Demo (`/edifice-demo`)
- **Admin:** admin@demo.com / password123
- **Reviewer:** reviewer@demo.com / password123
- **Client:** client@demo.com / password123
- Pre-configured brand guidelines + 2 sample drafts

### 6. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll be redirected to the login page.

---

## Demo Flow

1. Login as **client@demo.com** → lands on workspace dashboard
2. Go to **Drafts → New Draft** → fill brief → click Generate
3. View compliance score and violations on the draft detail page
4. Click **Submit for review**
5. Login as **reviewer@demo.com** → go to **Review Panel**
6. Click **Request revision** with a note
7. Login back as client → draft shows "REVISION REQUESTED" with reviewer note
8. Click **Regenerate** → Version 2 created with new compliance score
9. Click **Compare versions** → side-by-side diff with scores
10. Submit Version 2 for review → Reviewer approves
11. Go to **Audit Log** → see full event trail

---

## Architecture Overview

```
app/
  /(auth pages)             login, register
  /[workspaceId]/           workspace-scoped pages (layout validates membership)
    dashboard/
    brand/                  brand setup (upsert)
    drafts/                 list, new, [draftId], [draftId]/compare
    review/                 reviewer panel
    audit/                  audit log
    settings/               member management
  /api/
    auth/[...nextauth]/     NextAuth handler
    register/               user + workspace auto-creation
    workspaces/             list user workspaces (switcher)
    [workspaceId]/
      brand/                GET + POST (upsert)
      drafts/               GET list
      drafts/generate/      POST generate + evaluate
      drafts/[id]/review/   GET detail + POST workflow actions
      drafts/[id]/version/  GET versions + POST regenerate
      members/              GET list + POST add
      audit/                GET paginated logs

lib/
  db.ts          Prisma client singleton
  auth.ts        NextAuth config (credentials + JWT callbacks)
  rbac.ts        requireWorkspaceMember(), requireRole()
  audit.ts       logAudit() helper
  ai.ts          generateContent(), evaluateContent() — OpenAI calls
  prompts.ts     buildGenerationPrompt(), buildEvaluationPrompt()
  constants.ts   CHANNEL_LABELS, STATUS_CONFIG — shared UI constants
  api.ts         ok(), err(), withAuth() — API route helpers

types/
  index.ts       Role, DraftStatus, Channel, AuditAction + interfaces

middleware.ts    JWT auth check only (Edge-compatible, no Prisma)
```

### RBAC Matrix

| Action | Admin | Reviewer | Client |
|---|---|---|---|
| Create / Regenerate draft | ✅ | ❌ | ✅ |
| Submit for review | ✅ | ❌ | ✅ |
| Approve / Reject / Request revision | ✅ | ✅ | ❌ |
| Manage brand | ✅ | ❌ | ❌ |
| Manage members | ✅ | ❌ | ❌ |
| View all drafts | ✅ | ✅ | Own only |
| View audit log | ✅ | ✅ | ❌ |

Role-based access control is enforced at both the UI layer (visibility and interaction) and API layer (strict authorization via role guards), ensuring secure and predictable behavior.

---

## Production Notes

- **Auth:** Credentials-based for simplicity; extend to OAuth (Google, GitHub) in production via NextAuth providers
- **Database:** Replace `DATABASE_URL` with a Postgres connection string; Prisma schema is Postgres-compatible
- **AI latency:** GPT-4o mini evaluation is synchronous (~5–15s total). In production, move to a background queue (BullMQ + Redis)
- **Member invitations:** Prototype requires users to self-register. Production would add email invitations via Resend/SendGrid
