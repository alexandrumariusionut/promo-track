# One-Page Design for PromoTrack

---

## What are we doing?

PromoTrack is a client-side web application that enables employees to build, manage, and export their promotion portfolio in a single unified tool. It replaces the current manual process of assembling STARR entries, performance metrics, peer shout-outs, and narrative sections across multiple disconnected documents and spreadsheets. The app runs entirely in the browser with encrypted local storage — no backend database required — and includes AI-assisted writing powered by Amazon Bedrock (Claude Haiku 4.5) via a serverless Lambda proxy. All portfolio data can be exported as encrypted portable files or formatted DOCX/PDF documents ready for submission.

**Stakeholders/Customers:**
- Individual contributors preparing promotion portfolios (primary users)
- Managers reviewing and approving promotion documents
- STEAM committee members evaluating promotion readiness
- IT Support / Engineering teams (initial rollout)

---

## Why are we doing it?

- The current promotion document process is fragmented — employees manually compile data from GSD scorecards, shout-out emails, and blank Word templates, leading to inconsistent quality and missed evidence
- Employees spend significant time on formatting and assembly rather than content quality
- No single tool tracks promotion readiness or identifies gaps in Leadership Principle coverage
- Managers lack visibility into portfolio completeness before the submission deadline
- Shout-out emails are frequently lost or forgotten — there is no centralized collection mechanism
- Goal: reduce portfolio preparation time and improve the quality and completeness of promotion submissions

---

## How are we doing it?

**Components:**
- Lock Screen — passphrase-based access control with AES-256-GCM encryption
- Dashboard — readiness score (0–100), LP coverage chart, gap checklist
- STARR Editor — create/edit entries with LP tagging and AI-assisted rewriting
- Metrics Importer — parse GSD scorecard PDFs and CSV files
- Shout-Outs Manager — import from EML emails, manual entry, badge display
- Documents Hub — export encrypted .portfolio files, DOCX, PDF, HTML
- Profile — employee info, promotion targets, narrative sections
- Timeline — chronological view of all portfolio activity
- AI Assistant — gap analysis, scope drafting, STARR improvement

**Technologies:**
- React 19, TypeScript, Vite 8
- MUI 7 (Material UI), Recharts
- Web Crypto API (AES-256-GCM, PBKDF2)
- docx / jsPDF (document generation)
- DOMPurify (XSS prevention)
- Amazon Bedrock (Claude Haiku 4.5) via AWS Lambda + API Gateway
- Ollama (local AI fallback) — optional

**Data stores:**
- Browser localStorage (encrypted) — sole data store, no backend database

**External dependencies:**
- AWS Amplify Hosting (static SPA deployment)
- AWS Lambda + API Gateway (serverless AI proxy)
- Amazon Bedrock — Claude Haiku 4.5 (primary AI provider)
- Ollama (optional, local LLM fallback for offline/local use)

**Personnel:**
- 1 developer (design + implementation)
- Manager review for requirements alignment
- Security review for encryption and data handling

**Backfills/modifications:**
- None — greenfield application, no existing systems modified

**Open questions:**
1. Should we add Amazon Cognito authentication for multi-user / cross-device support in a future phase?
2. Is DynamoDB-backed persistence needed, or is client-only storage sufficient for the target audience?
3. Should the DOCX export format be standardized across the organization, or remain team-configurable?
4. What is the appetite for a manager-facing read-only view of employee portfolios?

---

## How will we measure the result?

**Milestones:**
| Milestone | Target Date | Status |
|---|---|---|
| Core app (dashboard, STARR, profile, export) | 2026-02-13 | ✅ Complete |
| Metrics import (GSD scorecard PDF parsing) | 2026-02-13 | ✅ Complete |
| Shout-outs (EML import, badge display) | 2026-02-18 | ✅ Complete |
| AI integration (Ollama, gap analysis, STARR rewrite) | 2026-02-19 | ✅ Complete |
| Security hardening (encryption, lock screen, CSP, file encryption) | 2026-02-19 | ✅ Complete |
| Amplify deployment | 2026-02-20 | ✅ Complete |
| Bedrock AI integration (Lambda + API Gateway) | 2026-02-20 | ✅ Complete |
| User feedback & iteration | Ongoing | 🔲 Planned |

**Expected impact:**
- Reduce promotion portfolio preparation time from days to hours
- Increase LP coverage completeness in submitted portfolios
- Eliminate lost shout-outs through centralized collection
- Provide real-time readiness visibility to employees and managers

**KPIs / Critical metrics:**
- Portfolio readiness score at time of submission (target: >80%)
- Number of LPs covered per portfolio (target: ≥8 of 16)
- Time from first entry to export-ready document
- User adoption rate within target teams

**Summary of design review:**
- Architecture: client-side SPA with encrypted localStorage, serverless AI backend — zero idle infrastructure cost
- Security: AES-256-GCM encryption at rest and for exported files, passphrase lock screen, AI endpoint allowlist, CSP headers, DOMPurify sanitization, file import validation — overall risk rating: LOW
- AI: Amazon Bedrock (Claude Haiku 4.5) via Lambda + API Gateway — data stays within AWS, ~$0.001 per request
- Trade-off accepted: client-only storage limits cross-device sync but eliminates backend complexity, cost, and data privacy concerns
- Deployment: AWS Amplify (static hosting) + Lambda/API Gateway (AI proxy) — fully serverless, pay-per-use
