# Design Note

Architecture decisions, AI workflow design, and production tradeoffs for the Brand Governance Workspace.

---

## 1. Schema Decisions

### Why Draft + DraftVersion separation

A `Draft` is the **workflow entity** — it owns the status, the brief (channel/audience/topic), and moves through states. A `DraftVersion` is an **immutable content snapshot**.

Collapsing them into one table would require updating rows to "change" content, which destroys history. By separating them:

- `Draft.status` reflects where the content is in the governance process
- `DraftVersion` records are never mutated after creation — a true audit artifact
- `Draft.currentVersionNumber` is a cheap pointer to the "active" version without scanning
- The comparison UI is trivial: fetch all versions for a draft, pick any two

This mirrors how production version-controlled systems (GitHub PRs, Figma versions) separate the "container" from "snapshots".

### Why AuditLog is a separate append-only table

Application-level audit trails fail when they live inside domain tables (e.g., `draft.lastAction`). Reasons:

- Domain tables get updated/deleted; audit rows must never be
- Audit queries (who did what, when, across entity types) cross-cut the domain
- A separate table makes it easy to add `metadata` as arbitrary JSON without polluting the domain schema

`AuditLog` rows are created in every route handler that mutates state. They are never updated or deleted — `ON DELETE CASCADE` on `workspaceId` is the only exception (workspace deletion cleans up everything).

### Why SQLite stores JSON as strings

SQLite has no native JSON column type. `dos`, `donts`, `writingSamples` on `Brand` and `metadata` on `AuditLog` are stored as JSON strings and parsed at the application layer. This is a conscious tradeoff: it keeps the schema simple and Prisma-compatible. In Postgres, these would be `Json` columns with native indexing.

### Workspace isolation

Every query that touches workspace-scoped data includes `workspaceId` in the `WHERE` clause. The `[workspaceId]` layout server component validates membership before rendering any child page — a defense-in-depth approach so individual route handlers have a validated context.

---

## 2. AI Workflow

### How prompts are structured

Two prompts, two calls:

**Generation prompt** (`buildGenerationPrompt`):
```
Brand tone → Do's list → Don'ts list → Writing samples → Content brief (channel + audience + topic) → Task instruction
```

The writing samples are the most important signal. They give the model a concrete style target rather than just abstract rules. The channel context adjusts expected length and format (a LinkedIn post vs. a press release have different conventions).

**Evaluation prompt** (`buildEvaluationPrompt`):
```
Same brand guidelines → Content to evaluate → Strict JSON output spec → Scoring rubric
```

The evaluation prompt explicitly forbids markdown wrapping and defines the JSON schema. The application strips any residual code fences before parsing. Score, tone match, violations, and suggestions are stored as a JSON string on `DraftVersion.complianceJson`.

### Why prompt-based memory instead of a vector database

A vector DB (Pinecone, pgvector) adds operational complexity and latency for a problem this constrained. Each workspace's brand memory is small (< 2KB), well-structured, and fully deterministic — there's no retrieval ambiguity. The entire brand context fits comfortably within GPT-4o mini's context window.

Vector DB retrieval makes sense when:
- Brand memory exceeds context window limits (e.g., thousands of writing samples)
- Semantic similarity search is needed (find the most relevant sample for this topic)

Neither condition applies at prototype scale. If the product grows to support 50+ writing samples per brand, migrating to a hybrid approach (embed + retrieve top-3 samples) would be the right evolution.

### Why two separate OpenAI calls instead of one

Separating generation and evaluation:

1. **Clarity of instruction**: asking one model to "write content AND score it" produces inconsistent results — models optimize for the primary task
2. **Modularity**: the evaluation prompt can be improved or replaced independently
3. **Failure isolation**: if evaluation fails, the generated content is already saved — the draft is not lost

The evaluation call is wrapped in try/catch. A failure sets `complianceScore: null` and shows "Compliance pending" in the UI. This is the correct production behavior — evaluation is a value-add, not a gate.

---

## 3. Tradeoffs

### SQLite vs Postgres

| | SQLite | Postgres |
|---|---|---|
| Setup | Zero config | Requires a server |
| Concurrency | Single writer | Full concurrent writes |
| JSON | String workaround | Native `Json` columns |
| Production | Dev/demo only | Production-ready |
| Migration | Change `DATABASE_URL` | Change `DATABASE_URL` |

SQLite was chosen for zero-friction local development. The Prisma schema is Postgres-compatible — switching requires only updating `DATABASE_URL` and changing `provider = "postgresql"`.

### No background jobs

OpenAI calls are made synchronously in the API route handler. This means:

- Total request time: ~10–20 seconds (generate + evaluate)
- If the server crashes mid-request, the compliance evaluation may not run
- No horizontal scaling without sticky sessions for long requests

**Production fix:** Move OpenAI calls to a job queue (BullMQ + Redis). The API route enqueues a job and returns immediately. The UI polls or uses Server-Sent Events to show progress.

### No real-time updates

The review panel and draft list require a page refresh to see changes made by other users. This is acceptable for a prototype where the team is small and actions are infrequent.

**Production fix:** Add Server-Sent Events or WebSockets (Pusher, Ably, or native Next.js streaming) to push status changes to connected clients.

### Synchronous compliance evaluation as a gateway vs. advisory

Current behavior: compliance score is advisory — a draft can be submitted for review regardless of score. This is intentional. The score informs the reviewer; it does not block the workflow.

An alternative design would auto-reject drafts below a threshold (e.g., < 50). This was rejected because:
- AI evaluation is imperfect; a human should always make the final call
- It creates a frustrating UX loop for clients

---

## 4. Scalability Plan

### Phase 1: Database (immediate)
- Replace SQLite with Postgres (one config change)
- Add `pgvector` extension if brand memory exceeds context window

### Phase 2: AI performance (next)
- Move OpenAI calls to BullMQ job queue
- Return job ID immediately; poll `/api/jobs/[id]` for status
- Add streaming generation for real-time content display

### Phase 3: Real-time collaboration
- Add Pusher or Ably for live status updates
- Reviewers see draft submissions in real time
- Clients get notified when their draft is reviewed

### Phase 4: Enterprise features
- Email invitations (Resend/SendGrid) instead of manual member add
- SSO via SAML/OIDC for enterprise workspaces
- Workspace-level rate limits on OpenAI calls
- Fine-grained audit export (CSV, SIEM integration)
- Custom approval chains (multi-step review)

---

## 5. What I Would Change With More Time

1. **Optimistic UI updates** — currently every action requires a round-trip. Client-side state updates would make the UI feel instant.
2. **Diff highlighting** in version comparison — beyond side-by-side, highlight changed sentences using a diffing library (diff-match-patch).
3. **Webhook notifications** — notify Slack/email when a draft is submitted for review or approved.
4. **Rate limiting** on `/api/[workspaceId]/drafts/generate` — prevent accidental OpenAI bill spikes.
5. **E2E tests** — Playwright tests for the core demo flow (generate → review → approve).
