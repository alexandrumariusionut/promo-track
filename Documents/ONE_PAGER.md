# One-Page Design for PromoTrack

**Last updated:** 2026-09-10

---

## What are we doing?

PromoTrack is a web application that lets employees build, manage and export their promotion portfolio in one place. It replaces the manual assembly of STAR entries, performance metrics and narrative sections across disconnected documents. Users sign in with Midway; the portfolio is stored per alias in the browser and in a serverless backend (DynamoDB) with conflict-safe sync, so it follows the user across devices without silent overwrites. AI coaching (Amazon Bedrock, Claude Haiku 4.5) is advisory only: every suggestion must quote the user's own words and is validated against the allowed role guidelines before it is shown. Portfolios export as a formatted DOCX and a portable JSON backup, and can be shared read-only with named reviewers through a revocable link.

**Deployment:** Harmony platform — `promo-track.beta.harmony.a2z.com` (beta, live) and `promo-track.harmony.a2z.com` (prod, live since 2026-09-11). Backend: one AWS SAM stack per stage (Lambda + API Gateway HTTP API + DynamoDB) in eu-west-1, Midway-JWT authorised.

**Stakeholders/Customers:**
- Individual contributors preparing promotion portfolios (primary users)
- Managers reviewing and commenting on promotion documents
- STEAM committee members evaluating promotion readiness
- IT Support / Engineering teams (initial rollout)

---

## Why are we doing it?

- The promotion document process is fragmented — employees compile data from GSD scorecards and blank Word templates, leading to inconsistent quality and missed evidence
- Time goes into formatting and assembly rather than content quality
- No tool shows readiness against the actual Role Guidelines or where evidence is missing
- Managers lack a lightweight way to review and comment before submission
- Goal: reduce preparation time and improve completeness and quality of submissions

---

## How are we doing it?

**Components:**
- Dashboard — readiness score with next step, role-guideline and LP coverage, linked checklist, first-run guidance
- STAR Editor — narratives tagged with LPs and Role Guidelines; "Format with AI"; AI auto-suggested guideline matches with verbatim-quote validation
- Promotion Readiness panel — 7 guidelines per target level, deterministic scoring, coaching prompts
- Metrics — layout-resilient GSD scorecard PDF parser with diagnostics; weekly/monthly charts
- Guidelines — sanitised snapshot of the IC Promotion Wiki, refreshed by script
- Documents — DOCX generation, HTML preview, `.portfolio` backup/restore
- Manager Review — share link restricted to named reviewers (or anyone with the link), per-entry comments attributed server-side, revoke, automatic import of comments
- Profile & Timeline — employee details, narrative sections, activity history

**Technologies:**
- React 19, TypeScript 5.9, Vite 8, MUI 7 (tokenised theme, dark mode), Recharts, react-hook-form
- pdfjs-dist, docx, DOMPurify
- AWS SAM: API Gateway HTTP API, Lambda (Node.js 24, arm64), DynamoDB (PITR, Retain), CloudWatch alarms, X-Ray
- aws-jwt-verify (Midway RS256 JWT), Harmony build tools, GitHub Actions (OIDC)
- Amazon Bedrock via `/ai/chat` on the unified API (Midway-authorised, model allowlist)

**Data stores:**
- DynamoDB `users` (one record per alias, version counter for optimistic concurrency) and `reviews` (7-day TTL, owner and reviewer allowlist)
- Browser localStorage per alias as the offline/working copy

**External dependencies:** Harmony platform, Midway, IC Promotion Wiki (sync source), Amazon Bedrock

**Personnel:** 1 developer; manager review for requirements; security review of the September audit

**Backfills/modifications:** Prod cut-over copied the 5 existing user records into the new stack's tables unchanged (verified identical); legacy stacks remain until torn down.

**Open questions:**
1. When to delete the legacy stacks and the old unauthenticated AI proxy (data is already migrated and backed up)?
2. Should the DOCX export be standardised across the organisation or remain team-configurable?
3. Appetite for a manager-facing read-only portfolio view beyond the review link?

---

## How will we measure the result?

**Milestones:**
| Milestone | Date | Status |
|---|---|---|
| Core app (dashboard, STAR, profile, export) | 2026-02-13 | ✅ |
| Metrics import (GSD scorecard PDF) | 2026-02-13 | ✅ |
| AI integration (gap analysis, STAR rewrite) | 2026-02-19 | ✅ |
| Bedrock AI proxy (Lambda + API Gateway) | 2026-02-20 | ✅ |
| Harmony deployment (beta) | 2026-07-21 | ✅ |
| Wiki sync + Guidelines page; Readiness rebuild on Role Guidelines | 2026-07-21 | ✅ |
| Resilient PDF parser V2; MetricEvolution charts | 2026-07-24 | ✅ |
| Midway JWT auth + per-user isolation | 2026-07-29 | ✅ |
| Security/tech audit phase 1: config hardening, versioned sync, table protection, runtime upgrade, lint/test gates | 2026-09-10 | ✅ |
| Review restrictions (reviewer allowlist, revoke); prompt-injection hardening | 2026-09-10 | ✅ |
| Unified backend stack + CI; beta deployed (Harmony 3.3.1) | 2026-09-10 | ✅ |
| Design system tokens, dashboard redesign, component tests | 2026-09-10 | ✅ |
| AI proxy behind Midway (`/ai/chat` on the unified API) | 2026-09-11 | ✅ |
| Prod cut-over to unified stack + first prod Harmony deploy (5.3.0) | 2026-09-11 | ✅ |
| Legacy stack / old proxy teardown | TBD | 🔲 |
| User feedback & iteration | Ongoing | 🔲 |

**Expected impact:** preparation time from days to hours; higher Role Guideline coverage in submissions; real-time readiness visibility for employees and managers.

**KPIs:** readiness score at submission (target > 80); Role Guidelines covered per portfolio (target 7/7); time from first entry to export-ready document; adoption within target teams.

**Summary of design review:**
- Architecture: SPA on Harmony + one serverless stack per stage; zero idle cost; beta and prod fully isolated (tables, origins, audiences)
- Security: Midway JWT on every API call with alias binding; review links restricted and revocable; strict CSP; DOMPurify; AI input wrapped as inert data and output validated; tables retained, PITR, alarms — overall risk **LOW** (AI proxy now behind Midway; legacy unauthenticated proxy awaiting deletion)
- Reliability: optimistic concurrency prevents cross-device overwrites; state normalisation on load; error boundary with data export
- Quality: 266 automated tests (unit + component + backend), lint/type gates in CI, browser E2E used for release verification
- Cost: ≈ $3/month for the serverless backend; the legacy Ollama EC2 instance (~$122/month) is unused and should be terminated
