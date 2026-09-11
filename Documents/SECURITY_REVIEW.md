# PromoTrack Security Posture Document

**Version:** 9.1  
**Date:** 2026-09-11  
**Application Version:** 1.3.0 (Harmony beta 3.3.2, prod 5.3.0; stacks `promo-track-backend-beta`, `promo-track-backend`)  
**Overall Risk Rating:** LOW  
**Last reviewed:** 2026-09-10

## 1. Executive Summary

PromoTrack is a single-page application (SPA) deployed on the Harmony platform for Amazon employees to build and export promotion portfolios. As of 2026-07-29, **all backend APIs are authenticated via Midway JWT tokens** with per-user alias binding. This represents a major security upgrade from the previous unauthenticated state.

The application implements comprehensive security controls including:
- **Server-side authentication**: Midway JWT validation (RS256, aws-jwt-verify) on both backend HttpApis
- **Per-user data isolation**: localStorage namespaced by verified alias; server-side alias enforcement
- **Build-time configuration**: API endpoints fixed at build time (`src/config.ts`); no runtime/localStorage override
- **Review access control**: sessions carry `ownerAlias` and an optional reviewer allowlist; owner can revoke; comments merged per entry
- **Optimistic concurrency**: versioned saves (`If-Match` → 409) prevent cross-device overwrites
- **Locked CORS**: Explicit origin allowlist per stage (no wildcard), configured at API level only
- **Input validation**: Size limits enforced server-side (1MB userdata, 4KB comments, 200 comments/session)
- **AI guardrails**: PROMO_COACH_SYSTEM grounding, delimited user-data blocks, strict response parsing against allowed guideline ids, client-side quote validation
- **Data durability**: DynamoDB tables with `DeletionPolicy: Retain`, PITR, deletion protection (prod); alarms and access logs

The app is deployed on the Harmony platform: `promo-track.beta.harmony.a2z.com` (beta, version 3.3.1, backed by the unified stack `promo-track-backend-beta`) and `promo-track.harmony.a2z.com` (prod, not yet deployed; the legacy 2026-07-29 backend stacks still serve prod data until the cut-over). Backend: one AWS SAM stack per stage (API Gateway HTTP API + Lambda nodejs24.x + DynamoDB) in eu-west-1 (account 029465354181).

## 2. Data Classification

| Data Type | Classification | At rest | Description |
|-----------|---------------|---------|-------------|
| Employee PII | Confidential | DynamoDB (AWS-owned key encryption, PITR) + browser localStorage (plaintext, per-alias key, Midway-gated host) | Names, roles, manager and STEAM chain |
| STAR Entries | Confidential | as above; review copies in `reviews` table with 7-day TTL | Performance narratives, project details |
| Performance Metrics | Confidential | as above | GSD scorecard values |
| Review Comments | Confidential | `reviews` table; merged into the owner's record on import | Manager feedback with server-attributed `commenterAlias` |
| Exported Files | Confidential | user's filesystem (plain JSON `.portfolio`, `.docx`) | Users are responsible for handling |
| AI Configuration | Internal | localStorage (device-level) | provider/model; endpoint validated on read |
| Wiki Guidelines Content | Internal | static asset `public/content/` | Sanitised at render |

Client-side encryption (AES-256-GCM, passphrase lock screen) was **removed before 2026-07-29**; older encrypted exports are rejected on import. Confidentiality at rest in the browser relies on the Midway-gated origin and per-alias namespacing; the authoritative copy lives in DynamoDB.

## 3. Security Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                      End Users (Browser)                            │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │ src/utils/midwayAuth.ts — fetches id_token from Midway SSO    │  │
│  │ (cookie-based, in-memory cache only, never localStorage)      │  │
│  └───────────────┬───────────────────────────────────────────────┘  │
│                  │ Bearer <token>                                    │
│  ┌───────────────▼───────────────────────────────────────────────┐  │
│  │ src/utils/apiFetch.ts — wraps fetch with Bearer + 401 retry   │  │
│  └───────────────┬───────────────────────────────────────────────┘  │
└──────────────────┼──────────────────────────────────────────────────┘
                   │ HTTPS
┌──────────────────▼──────────────────────────────────────────────────┐
│  ONE API Gateway HttpApi per stage (Lambda REQUEST Authorizer)      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ authorizer.mjs: aws-jwt-verify against Midway JWKS             │ │
│  │ RS256 · audience per stage · 30s clock skew · 5-min cache      │ │
│  │ Returns: {alias}; Allow policy = stage wildcard ARN            │ │
│  └────────────────────────────────────────────────────────────────┘ │
│  Handlers: read alias from event.requestContext.authorizer.lambda   │
│  userdata: path alias must equal token alias (403); If-Match → 409  │
│  reviews: owner | reviewer allowlist | open link; deny → 404        │
└──────────────────┬──────────────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────────────────┐
│  DynamoDB users(-beta) / reviews(-beta): Retain, PITR, TTL 7 d      │
│  users: userId=alias, version counter · reviews: ownerAlias,        │
│  reviewerAliases, per-entry comments with commenterAlias            │
└─────────────────────────────────────────────────────────────────────┘
```

## 4. Implemented Security Controls

### 4.1 Midway JWT Authentication (NEW — 2026-07-29)
- **Scope:** The single HTTP API per stage (beta: `g093baotu0`; prod legacy: `t8b50k0lwh`, `1jvjxaiuig` until cut-over)
- **Mechanism:** Lambda REQUEST authorizer using `aws-jwt-verify` against Midway JWKS
- **JWKS URI:** `https://midway-auth.amazon.com/jwks.json`
- **Algorithm:** RS256
- **Audience:** per stage (`StageConfig` mapping) — beta accepts only the beta host
- **Policy caching:** `ReauthorizeEvery: 300`; the Allow policy is scoped to the stage wildcard ARN so the cached policy is valid for every route
- **Clock Skew:** 30 seconds
- **Alias Binding:** Handler validates URL path alias matches token `sub` claim (403 on mismatch)
- **Review Attribution:** `commenterAlias` captured from token server-side — unforgeable
- **Frontend Token Flow:** `src/utils/midwayAuth.ts` fetches from `midway-auth.amazon.com/SSO` with `credentials:'include'`; cached in-memory only (never localStorage); `apiFetch.ts` auto-attaches Bearer and retries on 401

### 4.2 Per-User Data Isolation (NEW — 2026-07-29)
- **localStorage Keys:** Namespaced per verified alias (`promo-track-<alias>:data`)
- **Migration:** One-shot migration of legacy un-namespaced keys on first authenticated load
- **Shared Browser Protection:** Multiple users on the same browser profile no longer clobber each other's data

### 4.3 CORS — Explicit Origins (FIXED — was `*`)
- **Allowed Origins:** `AllowedOrigins` stack parameter per stage (beta: beta host + localhost; prod: both Harmony hosts)
- **Allowed Headers:** `Authorization`, `Content-Type`, `If-Match`; methods GET/POST/PUT/DELETE/OPTIONS
- **Configured in:** `backend/template.yaml` `CorsConfiguration` only — handlers no longer emit CORS headers

### 4.4 Input Validation — Server-Side (NEW — 2026-07-29)
- **Userdata PUT:** Max 1MB body (413 Payload Too Large)
- **Review Comment POST:** Max 4KB per comment (400 Bad Request)
- **Comments per Session:** Max 200 (400 Bad Request)

### 4.5 Build-Time Configuration (NEW — 2026-09-10)
- API and AI endpoints resolved from `VITE_*` variables into `src/config.ts` at build time
- The former `localStorage` overrides (`promo-track-review-api`, `promo-track-userdata-api`) are removed; the AI endpoint may only be the build endpoint, `localhost` or `/api/*`
- `.env.development.local` is loaded by the dev server only; `.env.beta` is committed and secret-free

### 4.6 Review Session Access Control (NEW — 2026-09-10)
- `POST /reviews` stores `ownerAlias` (from the JWT) and a normalised `reviewerAliases` allowlist (≤10)
- `GET`, `GET /status`, `POST /comments` succeed for the owner or a listed reviewer; if the list is empty anyone authenticated with the link may access; unauthorised callers receive **404**, not 403, to prevent id probing
- Comments are merged per entry (`SET comments.#k = :v`) so reviewers cannot erase each other's feedback
- `DELETE /reviews/{id}` lets the owner revoke a link (condition expression on `ownerAlias`)
- UI: Share for Review defaults to restricting the link to the manager alias; "Manage review link" exposes revoke

### 4.7 Optimistic Concurrency for Portfolio Saves (NEW — 2026-09-10)
- Records carry a `version` counter; `PUT /userdata/{alias}` accepts `If-Match` and fails with **409** on mismatch
- Client pauses cloud sync on 409 and asks the user to load the newer copy or keep theirs — no silent overwrite
- Clients without `If-Match` still work (last-writer-wins) for backwards compatibility

### 4.8 AI Endpoint Allowlist & Rate Limiting
- **Patterns:** the build-configured AI endpoint, `localhost`/`127.0.0.1`, `/api/*` (dev proxy) — `*.amazonaws.com` wildcard removed
- **Validation:** applied on read and write of the stored config; invalid config is discarded
- **Rate Limit:** 2-second minimum between chat() calls

### 4.9 HTML Sanitization
- **Library:** DOMPurify (explicit pinned dependency: `dompurify@^3.4.12`)
- **Scope:** Wiki content rendering, preview rendering, export generation
- **XSS Protection:** Removes malicious scripts; all links forced `target=_blank rel=noopener`

### 4.10 AI Prompt Security (PROMO_COACH_SYSTEM)
- **Grounding:** All claims require verbatim-quote justifications (≤20 words) from user's text
- **Anti-Fabrication:** Never invents facts, metrics, names, dates, or events
- **Omit-over-Guess:** Empty suggestions list preferred over uncertain claims
- **No Outcome Predictions:** Never predicts promotion outcomes, timelines, or probabilities
- **Prompt-Injection Defense:** every user-authored string is length-capped, stripped of delimiter tokens and wrapped in `<<<USER_DATA … USER_DATA>>>` blocks; all system prompts (incl. the legacy `PROMPTS.*` family) carry the INJECTION DEFENSE clause
- **Response Validation:** `parseSuggestDimensionsResponse()` drops ids not in the current level's guideline list, caps 3 suggestions / 400 chars, never throws on malformed output
- **Strict JSON Output:** Enforces exact JSON schema, no prose outside structure
- **Client-Side Validation:** `validateSuggestions()` discards any suggestion whose quoted text doesn't appear verbatim (≥20 chars, whitespace/case normalized) in the entry

### 4.11 HTTP Security Headers
- **Harmony (beta, verified live 2026-09-10):** `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: …; connect-src 'self' <harmony hosts> midway-auth.amazon.com <api hosts>; worker-src 'self' blob:; media-src 'self'; frame-src <harmony/midway hosts>` — app directives from `.harmony/harmony-metadata.json` merged with Harmony platform defaults
- **X-Content-Type-Options:** nosniff (the only additional header Harmony accepts; `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options` are rejected at registration)
- **Amplify (legacy path):** full CSP with pinned `connect-src`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, three-tier `Cache-Control`
- **API Gateway:** access logs (90 days) with alias, status and latency; 5XX and 4XX-burst alarms

### 4.12 File Import Security
- **Size Validation:** Enforced limits prevent resource exhaustion
- **PDF Processing:** Layout-resilient V2 parser (`pdfImportV2.ts`) with label-anchored extraction — fails closed on mismatch; returns diagnostics
- **Prototype Pollution Guard:** `JSON.parse` reviver rejects `__proto__`, `constructor`, `prototype` keys precisely (replaced a substring scan that rejected legitimate text)
- **State Normalisation:** `normalizeState()` fills defaults and runs migrations for data from localStorage, cloud and imports, so partial records cannot crash the app

### 4.13 Review Comment Security
- **Server-Side Attribution:** `commenterAlias` set from verified JWT — cannot be forged by client
- **Retry/Stash Flow:** `consumeReview()` with retry counting; unmatched comments stashed after 5 attempts and surfaced in a dialog (never silently dropped)
- **Matching:** By ID (primary) then unambiguous title (fallback)

### 4.14 Error Boundary & Consistent Error Handling
- **Coverage:** React Error Boundary wrapping entire application; offers Reload, Export my data, Reset local copy; logs structured error without exposing stack traces
- **Lambda errors:** 500 responses are generic; details logged as JSON
- **ErrorSnackbar:** Centralized error notification system
- **Type Safety:** `strict` TypeScript; ESLint 0 errors including `no-explicit-any` and React hooks rules

### 4.15 Dependency Security
- **DOMPurify:** Explicit pinned dependency (`dompurify@^3.4.12`) — previously phantom/undeclared — **FIXED**
- **Automated Scanning:** `npm audit --omit=dev --audit-level=high` fails the Amplify and GitHub Actions builds
- **Runtime:** Lambda `nodejs24.x` (the previous `nodejs20.x` was deprecated and update-blocked)
- **Vite 8 beta:** Pinned — accepted risk pending stable release
- **MUI icons:** path imports enforced by lint (smaller dependency graph in dev/test)

## 5. RESOLVED Security Issues (2026-07-29 cycle)

| # | Issue (was) | Severity (was) | Resolution |
|---|-------------|----------------|------------|
| 1 | Backend APIs have NO authentication | HIGH | Both APIs now require verified Midway JWT with alias binding via Lambda REQUEST authorizer |
| 2 | CORS `*` on backend APIs | HIGH | Locked to explicit origins: promo-track.harmony.a2z.com, beta, localhost:5173 |
| 3 | DOMPurify phantom dependency | MEDIUM | Pinned in package.json (`dompurify@^3.4.12`) |
| 4 | Build path mismatch in amplify.yml | LOW | `baseDirectory` corrected to `app` |
| 5 | Shared-browser localStorage collision | MEDIUM | Keys namespaced per verified alias (`promo-track-<alias>:data`) with one-shot migration |
| 6 | Forgeable review comments | MEDIUM | `commenterAlias` captured from JWT server-side — unforgeable |
| 7 | `localhost:11434` in prod CSP | LOW | Removed from `amplify.yml` and `.harmony/harmony-metadata.json` CSP |

## 6. OPEN / Accepted-Risk Issues

| # | Issue | Severity | Status | Notes |
|---|-------|----------|--------|-------|
| A | AI proxy (`706rf9fx5c`) unauthenticated | MEDIUM | **Resolved 2026-09-11** — replaced by `/ai/chat` behind the Midway authorizer (model allowlist, size caps, 429 mapping); old API/Lambda unreferenced, deletion pending |
| B | Review session URLs rely on UUID secrecy when no reviewer allowlist is given | LOW | Mitigated | Owner can now pass `reviewerAliases` to restrict access, and can revoke via `DELETE /reviews/{id}`. Unrestricted sessions still work for backwards compatibility. |
| C | Vite 8 beta pinned | LOW | Accepted | Pre-release; `npm audit --audit-level=high` now fails the Amplify build instead of being ignored. |
| D | No IAM leading-key enforcement on DynamoDB | LOW | Accepted | App-enforced alias binding via authorizer context. |
| E | Test fixtures under `src/utils/__tests__/fixtures/` contain a real GSD scorecard extract | LOW | **Open** | Own-data only, but consider anonymising values before the repo is shared more widely. |

### 6.1 Resolved in the 2026-09-10 review cycle

| # | Issue (was) | Severity (was) | Resolution |
|---|-------------|----------------|------------|
| 8 | API base URLs overridable from `localStorage` (`promo-track-review-api`, `promo-track-userdata-api`, AI `endpoint`) — a tampered value redirected authenticated requests incl. the Midway Bearer token | HIGH | Removed. Endpoints resolved at build time in `src/config.ts` from `VITE_*` env vars; AI endpoint override restricted to localhost / `/api/*`. |
| 9 | Review sessions readable/writable by anyone with the UUID; `POST /comments` replaced all comments; no revoke | HIGH | `ownerAlias` + optional `reviewerAliases` stored on create; GET/status/comments enforce access (404 on deny to avoid probing); comments merged per entry; `DELETE /reviews/{id}` for owner. |
| 10 | `promo-track-users` table could be destroyed by `sam delete` / template replacement; no PITR | HIGH | `DeletionPolicy`/`UpdateReplacePolicy: Retain`, `DeletionProtectionEnabled`, PITR and KMS SSE on both tables. |
| 11 | Last-writer-wins cloud save: a stale tab/device (or a 5 s cloud timeout at boot) overwrote newer data | HIGH | Optimistic concurrency: server keeps `version`; client sends `If-Match`; 409 pauses sync and shows a "Load newer copy / Keep mine" banner. |
| 12 | Lambda 500 responses returned raw `e.message` | MEDIUM | Generic `Internal server error`; real error logged as structured JSON. |
| 13 | PII committed to git (`Shout-Out/*.eml` with colleague names, `one pager.png`), plus `.aws-sam/` build output and `coverage/` | MEDIUM | Untracked and gitignored. **History still contains them** — run `git filter-repo` before publishing the repo. |
| 14 | Harmony CSP lacked `default-src`/`script-src`/`frame-src`/`object-src`; `.harmony/` untracked | MEDIUM | Mirrors the Amplify CSP; pinned `connect-src` to the three API hosts; metadata now tracked. |
| 15 | `npm audit` result ignored (`\|\| true`) in Amplify build | LOW | Audit, lint and tests now gate the build. |
| 16 | `nodejs20.x` runtime deprecated — Lambda updates blocked since 2026-07-01 | HIGH (availability) | Both stacks moved to `nodejs24.x`. |
| 17 | Prototype-pollution guard on import rejected any file containing the word "constructor" | LOW | Replaced substring scan with a `JSON.parse` reviver that rejects the keys precisely. |

## 7. STRIDE Threat Analysis

| Threat | Category | Mitigation | Status |
|--------|----------|------------|--------|
| Unauthorized API access | Spoofing | Midway JWT + alias binding | ✅ Mitigated |
| Cross-user data access | Elevation of Privilege | Server-side alias validation + namespaced localStorage | ✅ Mitigated |
| Data theft from browser storage | Information Disclosure | Midway-gated origin, per-alias keys, strict CSP (no inline scripts) | ⚠️ Accepted (no client-side encryption) |
| Cross-device overwrite / data loss | Tampering | Versioned saves with `If-Match` → 409 + user choice | ✅ Mitigated |
| Review link shared beyond intended reviewer | Information Disclosure | Reviewer allowlist (404 on deny) + owner revoke | ✅ Mitigated |
| Token exfiltration via redirected API URL | Spoofing | Endpoints fixed at build time | ✅ Mitigated |
| Accidental table deletion | Denial of Service | Retain policies, deletion protection, PITR | ✅ Mitigated |
| CORS data exfiltration | Information Disclosure | Explicit origin allowlist | ✅ Mitigated |
| Forged review comments | Tampering | Server-side commenterAlias from JWT | ✅ Mitigated |
| Malicious script injection | Tampering | DOMPurify + XSS sanitization | ✅ Mitigated |
| AI hallucination/fabrication | Tampering | PROMO_COACH_SYSTEM grounding + quote validation | ✅ Mitigated |
| Oversized payload DoS | Denial of Service | Server-side size limits (1MB/4KB) | ✅ Mitigated |
| Stale bundle serving old code | Denial of Service | Three-tier cache headers (no-cache on index.html) | ✅ Mitigated |
| PII exposure to AI services | Information Disclosure | User-controlled, endpoint allowlist | ⚠️ Accepted risk |
| AI proxy abuse / narrative exposure | Denial of Service / Info Disclosure | Client-side rate limiting; endpoint fixed at build time | ⚠️ Open — proxy not behind Midway |

## 8. Data Flow Security

### Authentication Flow
```
Browser Midway cookie → midway-auth.amazon.com/SSO → id_token (in-memory)
→ apiFetch.ts attaches Bearer → API Gateway → Lambda REQUEST authorizer
→ aws-jwt-verify (RS256, JWKS) → alias in context → handler validates path alias
```

### Storage Flow
```
User Input → reducer → localStorage promo-track-<alias>:data (immediate)
           → 2 s debounce → PUT /userdata/<alias> with If-Match: <version>
           → 200 {version} | 409 → sync paused, user chooses "Load newer copy" / "Keep mine"
Boot: Harmony user → GET /userdata → normalizeState() → app; fallback localStorage
```

### Review Comment Flow
```
Owner: Share for Review → POST /reviews {entries, reviewerAliases} → ownerAlias from JWT, TTL 7 d
Reviewer: GET /reviews/{id} → canAccessReview(owner | allowlist | open) else 404
       → POST /comments → merged per entry with commenterAlias from JWT
Owner: useReviewPolling (30 s) → consumeReview() matches by id/title → retry/stash
Owner: DELETE /reviews/{id} (revoke) → subsequent access 404
```

### PDF Import Flow
```
File Upload → pdfImportV2.ts (label-anchored, per-KPI extraction)
→ {metrics, diagnostics:{found, missing, warnings}} → MetricsPage renders diagnostics
```

### AI Flow
```
Narrative save → asData()/dataBlock() wrap → PROMO_COACH_SYSTEM (+ INJECTION DEFENSE)
→ Response → parseSuggestDimensionsResponse(allowedIds) → validateSuggestions() (verbatim quote ≥20 chars)
→ Unknown ids / ungrounded quotes dropped → Pending chips displayed
```

## 9. Test Coverage

| Category | Test Count | Scope |
|----------|-----------|-------|
| Frontend unit (Vitest + jsdom) | 201 | storage, migrations, dimensionScoring, pdfImportV2, reviewImport, reviewApi, aiPrompts (data blocks, response parser), midwayAuth, apiFetch, leadClause |
| Frontend component (React Testing Library) | 8 | ShareReviewDialog (allowlist, create, revoke), Dashboard (first run, next step, links), AppProvider debounced versioned save |
| Backend (Vitest, node) | 44 | authorizer allow/deny matrix + stage wildcard (11), userdata ownership / If-Match / 409 / limits (14), review access control / merge / revoke / no error leakage (19) |
| **Total** | **253** | |

Release verification (2026-09-10, beta): browser E2E against the local harness (23 + 11 checks: boot, lazy routes, sanitised wiki, versioned save, 409 conflict banner and resolution, reviewer/stranger access, revoke, dark mode, no console errors) and a live matrix against the deployed beta API with a real Midway token: no-token→401, forged→403, own alias→200, other alias→403, stale `If-Match`→409, review create/read/status/revoke→201/200/200/200 then 404, CORS preflight→204 with `if-match` and `DELETE` for the beta origin only.

## 10. Compliance Posture

| Control | Implementation | Status |
|---------|---------------|--------|
| Authentication | Midway JWT (RS256) on all APIs | ✅ Compliant |
| Authorization | Alias binding (token sub = URL path) | ✅ Compliant |
| Encryption at Rest | DynamoDB AWS-owned key; browser copy unencrypted (Midway-gated) | ⚠️ Accepted |
| Encryption in Transit | HTTPS only | ✅ Compliant |
| Input Validation | Client + server-side size limits | ✅ Compliant |
| Output Sanitization | DOMPurify + XSS protection | ✅ Compliant |
| Security Headers | Strict CSP (Harmony-merged), nosniff; HSTS by platform | ✅ Compliant |
| CORS | Explicit origins only | ✅ Compliant |
| Dependency Scanning | npm audit in CI | ✅ Compliant |
| PII in Source Code | Removed from tree (git history purge pending) | ⚠️ In progress |
| Test Coverage | 253 tests (unit, component, backend) + release E2E | ✅ Compliant |
| Data Durability | Retain policies, PITR, deletion protection, alarms | ✅ Compliant |
| Concurrency Safety | Versioned saves, 409 handling | ✅ Compliant |

## 11. Future Recommendations

1. **Legacy teardown:** delete the unauthenticated proxy `706rf9fx5c` / `promo-track-bedrock` and the two legacy `nodejs20.x` stacks (their tables lack Retain; data is in the `-v2` tables + on-demand backup)
2. **Git history purge:** `git filter-repo` for `Shout-Out/*.eml`, `one pager.png`, `.aws-sam/` before the repo is shared more widely
3. **Prod hardening follow-ups:** subscribe `AlarmEmail` on the prod stack; consider a WAF rate limit on `/ai/chat`
4. **IAM Leading-Key Condition:** DynamoDB condition key for defence-in-depth
5. **Stabilize Vite:** move off Vite 8 beta once stable
6. **Anonymise test fixture:** `src/utils/__tests__/fixtures/gsd1-*` contains a real scorecard extract
7. **Penetration Testing:** periodic assessment

## 12. Security File Map

| File | Security Role | Description |
|------|---------------|-------------|
| `backend/src/authorizer.mjs` | Authentication | Midway JWT verification (aws-jwt-verify, RS256, JWKS); stage-wildcard policy |
| `backend/src/lib/http.mjs` | Authorization | `assertOwner`, `canAccessReview`, generic `serverError` |
| `backend/src/review/*.mjs`, `backend/src/userdata/*.mjs` | Handlers | access control, per-entry merge, `If-Match`/409 |
| `src/config.ts` | Configuration | build-time endpoints (no runtime override) |
| `src/utils/midwayAuth.ts` | Token Management | Fetches/caches Midway id_token in-memory; refresh on 401 |
| `src/utils/apiFetch.ts` | Transport Security | Wraps fetch with Bearer header + 401 auto-retry |
| `src/store/storage.ts` | Data Isolation | Per-alias namespaced localStorage; one-shot migration |
| `src/utils/session.ts` | Import Safety | JSON reviver blocking prototype-pollution keys; size limit |
| `src/store/AppContext.tsx` / `src/utils/userDataApi.ts` | Concurrency | versioned saves, `ConflictError`, conflict banner |
| `src/utils/aiPrompts.ts` | AI Guardrails | data blocks (`asData`/`dataBlock`), PROMO_COACH_SYSTEM, `parseSuggestDimensionsResponse` |
| `src/utils/ai.ts` | AI Transport | endpoint allowlist, rate limiting |
| `src/components/starr/ShareReviewDialog.tsx` | Review Sharing | reviewer allowlist UI, revoke |
| `src/utils/pdfImportV2.ts` | File Security | Layout-resilient PDF parser; label-anchored, fails closed |
| `src/utils/reviewImport.ts` | Review Security | consumeReview() with retry/stash; match by ID then title |
| `amplify.yml` | Header Security | Three-tier cache + CSP (no localhost in prod) |
| `.harmony/harmony-metadata.json` | Header Security | Harmony CSP object (merged with platform defaults) + nosniff |
| `backend/template.yaml` | Infrastructure | single SAM stack: CORS parameter, authorizer, tables (Retain/PITR), alarms, access logs |
| `.github/workflows/ci.yml` | Supply Chain | audit/lint/test/validate gates; OIDC deploy (no long-lived keys) |

---

**Document Classification:** Internal Use  
**Last reviewed:** 2026-09-10  
**Next Review Date:** 2026-12-10  
**Approved By:** Security Team  
**Document Owner:** PromoTrack Development Team
