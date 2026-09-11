# PromoTrack — Promotion Portfolio Builder

🧪 **Beta (current):** https://promo-track.beta.harmony.a2z.com  
🚀 **Prod:** https://promo-track.harmony.a2z.com — live (2026-09-11)

A browser-based tool for Amazon employees to build, track and export promotion portfolios. You sign in with Midway; your identity is verified server-side and your portfolio is stored per alias both in your browser and in the cloud.

**Last updated:** 2026-09-10 (app version 1.3.0, Harmony beta 3.3.1)

## What is PromoTrack?

- Write STAR narratives and map them to the L4/L5 Role Guidelines your promo panel looks for
- Import metrics from GSD Scorecard PDFs with a layout-resilient parser
- Read the IC Promotion Guidelines (synced snapshot of the wiki)
- See a readiness score, the next step, and which guidelines still lack evidence
- Generate the promotion document (.docx) and back up your portfolio (.portfolio JSON)
- Share a read-only review link with your manager (restricted to named reviewers) and pull their comments back in
- AI coaching that grounds every suggestion in your own words

## Getting started

1. Open the beta URL (needs an active Midway session).
2. Dashboard: the first-run card walks you through guidelines → profile → first STAR entry.
3. Profile: fill in your details and management chain. Saving syncs to the cloud (see status chip top-right).
4. STAR Entries: add narratives; the readiness panel maps them to guidelines and AI suggests matches you confirm or dismiss.
5. Metrics: import your GSD scorecard PDF or add metrics manually.
6. Share for Review when ready; revoke the link any time.

## Core features

### Dashboard
Readiness score out of 100 with the recommended next step, role-guideline coverage for your target level, Leadership Principle coverage, a checklist where every item links to the page that completes it, and an optional promotion target date.

### STAR Entries
Situation / Task / Action / Results, tagged with Leadership Principles and Role Guidelines. "Format with AI" rewrites an entry in a tight, senior tone; follow-up instructions are supported. AI auto-suggests guideline matches after you save, and each suggestion must quote your text verbatim or it is dropped.

### Promotion Readiness panel
Seven role guidelines per target level with deterministic scoring (0 entries = no examples yet, 1+ = covered, aim for 3), "Coach me" prompts per guideline, and "Write a narrative for this" pre-tagged entry creation.

### Metrics
Weekly and monthly charts per KPI with target lines. The PDF importer reports what it found, what is missing and why, instead of failing silently. Status is shown with an icon and text, not colour alone.

### Guidelines
Snapshot of the IC Promotion Wiki, sanitised with DOMPurify, with the sync date and a link to the live page. Refresh with `npm run sync-wiki`.

### Manager review
- **Share for Review** creates a 7-day link. By default only the aliases you list (pre-filled from your Manager field) can open it; you can also allow anyone with the link.
- Reviewers see your entries read-only and leave a comment per entry; their alias is recorded server-side from the Midway token.
- Comments are pulled into your entries automatically (matched by id, then title); unmatched ones are kept and shown in a dialog.
- **Manage review link** lets you copy, resend or revoke the link.

### Documents
Generate the Word promotion document, preview the HTML, export a `.portfolio` backup, import a backup.

### Data & sync
- Cloud copy per alias (DynamoDB) plus a local copy in your browser, namespaced per alias so shared machines are safe.
- Saves are versioned: if the portfolio changed on another device or tab, you are asked whether to load the newer copy or keep yours — nothing is overwritten silently.
- Dark mode follows your OS setting and can be toggled.

## Security in brief
Midway JWT on every API call (RS256, verified server-side, alias bound to the URL); review links restricted to named reviewers and revocable; CORS locked to the Harmony origins; strict CSP; DOMPurify on all rendered HTML; AI prompts wrap your text as inert data and validate model output against the allowed guideline ids. Full detail in `SECURITY_REVIEW.md`.

## Development

```bash
npm install
cp .env.example .env.development.local   # local API + dev identity, dev server only
npm --prefix backend install
npm run backend:start                    # real Lambda handlers on http://127.0.0.1:3001 (in-memory DB)
npm run dev                              # http://localhost:5173
npm test                                 # 253 frontend + backend tests (vitest)
npm run lint && npm run typecheck
npm run sync-wiki                        # refresh public/content/guidelines-wiki.html (needs mwinit)
```

Set `VITE_SKIP_HARMONY_NAVBAR=1` in `.env.development.local` to run without a Midway session (headless tests).

## Deploy

```bash
# Backend (single SAM stack, beta)
cd backend && npm run deploy:beta

# Frontend (Harmony beta)
npm run build-harmony-app:beta && harmony app deploy -s beta
```

Prod cut-over: `backend/README.md` and `Documents/DEPLOYMENT.md`. CI (`.github/workflows/ci.yml`) runs audit, lint, type-check, tests, build and `sam validate` on every PR and deploys the beta backend on `main`.

## Tech stack
React 19, TypeScript 5.9, MUI 7, Vite 8, Recharts, react-hook-form, DOMPurify, pdfjs-dist, docx; Vitest + React Testing Library. Backend: AWS SAM — API Gateway HTTP API, Lambda (Node.js 24, arm64), DynamoDB, aws-jwt-verify.
