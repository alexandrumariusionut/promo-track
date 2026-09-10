# One-Page Design for PromoTrack

**Last updated:** 2026-07-29

---

## What are we doing?

PromoTrack is a client-side web application that enables employees to build, manage, and export their promotion portfolio in a single unified tool. It replaces the current manual process of assembling STAR entries, performance metrics, peer shout-outs, and narrative sections across multiple disconnected documents and spreadsheets. The app runs in the browser with AES-256-GCM encrypted local storage namespaced per user, authenticated via Midway JWT, and includes AI-assisted coaching powered by Amazon Bedrock (Claude Haiku 4.5) via a serverless Lambda proxy. The AI is an advisor only — it grounds every suggestion in the user's own words (verbatim-quote justification) and never judges promotion readiness. All portfolio data can be exported as encrypted portable files or formatted DOCX/PDF documents ready for submission.

**Deployment:** Harmony platform at `promo-track.harmony.a2z.com` (prod) and `promo-track.beta.harmony.a2z.com` (beta). Backend APIs via AWS SAM (Lambda + API Gateway + DynamoDB) in eu-west-1, authenticated with Midway JWT.

**Stakeholders/Customers:**
- Individual contributors preparing promotion portfolios (primary users)
- Managers reviewing and approving promotion documents
- STEAM committee members evaluating promotion readiness
- IT Support / Engineering teams (initial rollout)

---

## Why are we doing it?

- The current promotion document process is fragmented — employees manually compile data from GSD scorecards, shout-out emails, and blank Word templates, leading to inconsistent quality and missed evidence
- Employees spend significant time on formatting and assembly rather than content quality
- No single tool tracks promotion readiness or identifies gaps in Role Guideline coverage
- Managers lack visibility into portfolio completeness before the submission deadline
- Shout-out emails are frequently lost or forgotten — there is no centralized collection mechanism
- Goal: reduce portfolio preparation time and improve the quality and completeness of promotion submissions

---

## How are we doing it?

**Components:**
- Lock Screen — passphrase-based access control with AES-256-GCM encryption
- Promotion Readiness — 7 L4 Role Guideline accordion cards, per-guideline icons, segmented progress rail, deterministic scoring, AI auto-suggest with accept/dismiss
- STAR Editor — create/edit entries with Role Guideline tagging; simplified dialog (date auto-set)
- Guidelines Page — IC Promotion Wiki content synced via `npm run sync-wiki`, DOMPurify-sanitized
- Metrics (MetricEvolution) — weekly + monthly LineCharts; layout-resilient PDF parser with diagnostics
- Shout-Outs Manager — import from EML emails, manual entry, badge display
- Documents Hub — export encrypted .portfolio files, DOCX, PDF, HTML
- Profile — employee info, promotion targets, narrative sections
- Timeline — chronological view of all portfolio activity
- AI Coach — grounded suggestions (PROMO_COACH_SYSTEM), quote validation, gap analysis
- Manager Review — authenticated share-for-review with retry/stash comment import

**Technologies:**
- React 19, TypeScript 5.9, Vite 8, MUI 7, Recharts
- Web Crypto API (AES-256-GCM, PBKDF2)
- docx / jsPDF (document generation)
- DOMPurify (XSS prevention, wiki content sanitization)
- Amazon Bedrock (Claude Haiku 4.5) via AWS Lambda + API Gateway
- aws-jwt-verify (backend Midway JWT validation)
- @amzn/harmony-build-tools (deployment)
- Ollama (local AI fallback) — optional

**Data stores:**
- Browser localStorage (encrypted, per-alias namespaced) — primary client data
- DynamoDB: promo-track-users (cloud persistence), promo-track-reviews (review sessions with TTL)

**External dependencies:**
- Harmony Platform (primary static SPA deployment)
- AWS Lambda + API Gateway (authenticated backend APIs + AI proxy)
- Amazon Bedrock — Claude Haiku 4.5 (primary AI provider)
- Midway (authentication — JWT validation via JWKS)
- IC Promotion Wiki (guidelines sync source via mcurl + Midway)
- Ollama (optional, local LLM fallback for offline/local use)

**Personnel:**
- 1 developer (design + implementation)
- Manager review for requirements alignment
- Security review for encryption and data handling

**Backfills/modifications:**
- None — greenfield application, no existing systems modified

**Open questions:**
1. ~~Should we add authentication for multi-user / cross-device support?~~ **DONE** — Midway JWT landed 2026-07-29
2. Is DynamoDB-backed full-state persistence needed, or is client-only + userdata API sufficient?
3. Should the DOCX export format be standardized across the organization, or remain team-configurable?
4. What is the appetite for a manager-facing read-only view of employee portfolios?

---

## How will we measure the result?

**Milestones:**
| Milestone | Target Date | Status |
|---|---|---|
| Core app (dashboard, STAR, profile, export) | 2026-02-13 | ✅ Complete |
| Metrics import (GSD scorecard PDF parsing) | 2026-02-13 | ✅ Complete |
| Shout-outs (EML import, badge display) | 2026-02-18 | ✅ Complete |
| AI integration (Ollama, gap analysis, STAR rewrite) | 2026-02-19 | ✅ Complete |
| Security hardening (encryption, lock screen, CSP, file encryption) | 2026-02-19 | ✅ Complete |
| Amplify deployment | 2026-02-20 | ✅ Complete |
| Bedrock AI integration (Lambda + API Gateway) | 2026-02-20 | ✅ Complete |
| Harmony deployment (primary) | 2026-07-21 | ✅ Complete |
| Wiki sync + Guidelines page | 2026-07-21 | ✅ Complete |
| Promotion Readiness rebuild (L4 Role Guidelines) | 2026-07-21 | ✅ Complete |
| MetricEvolution (weekly/monthly LineCharts) | 2026-07-21 | ✅ Complete |
| Metrics PDF resilient parser (V2 — label-anchored, piecewise interpolation) | 2026-07-24 | ✅ Complete |
| Honest monthly display (unweighted average labeling + tooltip) | 2026-07-24 | ✅ Complete |
| Readiness panel redesign (accordion cards, icons, progress rail, Coach me) | 2026-07-24 | ✅ Complete |
| Share-for-review robustness (retry/stash, ID-primary matching) | 2026-07-22 | ✅ Complete |
| Cache hardening (3-tier headers: no-cache / immutable / 1hr) | 2026-07-22 | ✅ Complete |
| Midway JWT auth + per-user isolation (both APIs, CORS lock, server-side alias) | 2026-07-29 | ✅ Complete |
| User feedback & iteration | Ongoing | 🔲 Planned |

**Expected impact:**
- Reduce portfolio preparation time from days to hours
- Increase Role Guideline coverage completeness in submitted portfolios
- Eliminate lost shout-outs through centralized collection
- Provide real-time readiness visibility to employees and managers

**KPIs / Critical metrics:**
- Portfolio readiness score at time of submission (target: >80%)
- Number of Role Guidelines covered per portfolio (target: all 7)
- Time from first entry to export-ready document
- User adoption rate within target teams

**Summary of design review:**
- Architecture: client-side SPA with encrypted localStorage + authenticated serverless backend (SAM) — zero idle infrastructure cost
- Security: Midway JWT auth on all APIs (RS256, alias binding), AES-256-GCM encryption at rest, passphrase lock screen, locked CORS, DOMPurify sanitization, AI grounding rules, per-user data isolation — overall risk rating: **LOW**
- AI: Amazon Bedrock (Claude Haiku 4.5) via Lambda + API Gateway — data stays within AWS, ~$0.001 per request. AI is advisor-only: grounded suggestions, quote validation, no outcome predictions
- Trade-off accepted: client-primary storage limits cross-device sync but eliminates backend complexity and data privacy concerns; userdata API provides optional cloud backup
- Deployment: Harmony platform (primary) + SAM backend (Lambda/API Gateway/DynamoDB) + Amplify (legacy) — pay-per-use
- Tests: 181 tests (157 frontend + 24 backend) across storage, scoring, PDF parsing, auth, review import
