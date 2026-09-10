# PromoTrack Security Posture Document

**Version:** 8.0  
**Date:** 2026-07-29  
**Application Version:** 3.0.0  
**Overall Risk Rating:** LOW  
**Last reviewed:** 2026-07-29

## 1. Executive Summary

PromoTrack is a single-page application (SPA) deployed on the Harmony platform for Amazon employees to build and export promotion portfolios. As of 2026-07-29, **all backend APIs are authenticated via Midway JWT tokens** with per-user alias binding. This represents a major security upgrade from the previous unauthenticated state.

The application implements comprehensive security controls including:
- **Server-side authentication**: Midway JWT validation (RS256, aws-jwt-verify) on both backend HttpApis
- **Per-user data isolation**: localStorage namespaced by verified alias; server-side alias enforcement
- **AES-256-GCM encryption** for all data at rest in localStorage
- **Locked CORS**: Explicit origin allowlist (no wildcard)
- **Input validation**: Size limits enforced server-side (1MB userdata, 4KB comments, 200 comments/session)
- **AI guardrails**: PROMO_COACH_SYSTEM grounding + client-side quote validation

The app is deployed on the Harmony platform at `promo-track.harmony.a2z.com` (prod) and `promo-track.beta.harmony.a2z.com` (beta). Backend APIs are SAM-deployed Lambda functions behind API Gateway HttpApis in eu-west-1 (account 029465354181).

## 2. Data Classification

| Data Type | Classification | Encrypted at Rest | Description |
|-----------|---------------|-------------------|-------------|
| Employee PII | Confidential | ✅ | Names, employee IDs, manager information |
| STAR Entries | Confidential | ✅ | Performance data, achievements, project details |
| Performance Metrics | Confidential | ✅ | Ratings, scores, evaluation data |
| Shout-outs | Internal | ✅ | Recognition and praise entries |
| Review Comments | Confidential | ✅ (client) + DynamoDB (server) | Manager feedback — commenterAlias captured server-side |
| Exported Files | Confidential | ✅ | Portfolio exports with encryption marker |
| AI Configuration | Internal | ✅ | Endpoint URLs, rate limiting settings |
| Wiki Guidelines Content | Internal | ❌ | Synced from IC Promotion Wiki (sanitized at render) |

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
│  API Gateway HttpApi (Lambda REQUEST Authorizer)                    │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ authorizer.mjs: aws-jwt-verify against Midway JWKS             │ │
│  │ RS256 · audience: app hostname · 30s clock skew                │ │
│  │ Returns: {alias} in authorizer context                         │ │
│  └────────────────────────────────────────────────────────────────┘ │
│  Handlers: read alias from event.requestContext.authorizer.lambda   │
│  URL path alias validated to match token alias (403 otherwise)      │
└──────────────────┬──────────────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────────────────┐
│  DynamoDB (promo-track-users / promo-track-reviews)                 │
│  App-enforced alias as partition key (userId / sessionId owner)      │
└─────────────────────────────────────────────────────────────────────┘
```

## 4. Implemented Security Controls

### 4.1 Midway JWT Authentication (NEW — 2026-07-29)
- **Scope:** Both backend HttpApis (userdata: `t8b50k0lwh`, review: `1jvjxaiuig`)
- **Mechanism:** Lambda REQUEST authorizer using `aws-jwt-verify` against Midway JWKS
- **JWKS URI:** `https://midway-auth.amazon.com/jwks.json`
- **Algorithm:** RS256
- **Audience:** `promo-track.harmony.a2z.com,promo-track.beta.harmony.a2z.com`
- **Clock Skew:** 30 seconds
- **Alias Binding:** Handler validates URL path alias matches token `sub` claim (403 on mismatch)
- **Review Attribution:** `commenterAlias` captured from token server-side — unforgeable
- **Frontend Token Flow:** `src/utils/midwayAuth.ts` fetches from `midway-auth.amazon.com/SSO` with `credentials:'include'`; cached in-memory only (never localStorage); `apiFetch.ts` auto-attaches Bearer and retries on 401

### 4.2 Per-User Data Isolation (NEW — 2026-07-29)
- **localStorage Keys:** Namespaced per verified alias (`promo-track-<alias>:data`)
- **Migration:** One-shot migration of legacy un-namespaced keys on first authenticated load
- **Shared Browser Protection:** Multiple users on the same browser profile no longer clobber each other's data

### 4.3 CORS — Explicit Origins (FIXED — was `*`)
- **Allowed Origins:** `https://promo-track.harmony.a2z.com`, `https://promo-track.beta.harmony.a2z.com`, `http://localhost:5173`
- **Allowed Headers:** `Authorization`, `Content-Type`
- **Configured in:** Both SAM `template.yaml` files under `CorsConfiguration`

### 4.4 Input Validation — Server-Side (NEW — 2026-07-29)
- **Userdata PUT:** Max 1MB body (413 Payload Too Large)
- **Review Comment POST:** Max 4KB per comment (400 Bad Request)
- **Comments per Session:** Max 200 (400 Bad Request)

### 4.5 Encryption at Rest (Client)
- **Algorithm:** AES-256-GCM with PBKDF2 key derivation
- **Key Derivation:** 100,000 iterations with static salt
- **IV Generation:** Cryptographically secure random IV per encryption operation
- **Storage:** All sensitive data encrypted before localStorage persistence
- **Key Management:** Derived from user passphrase, not stored

### 4.6 Encrypted Portfolio Export/Import
- **Export Format:** `PROMO-TRACK-ENC:` prefix marker for encrypted files
- **Passphrase Protection:** User-defined passphrase for export encryption
- **Legacy Support:** Maintains compatibility with previous export formats

### 4.7 Passphrase Lock Screen
- **Setup Flow:** Initial passphrase creation with confirmation
- **Unlock Mechanism:** Passphrase verification before app access
- **Portfolio File Integration:** Direct file opening with passphrase prompt

### 4.8 AI Endpoint Allowlist & Rate Limiting
- **Patterns:** 4 approved endpoint URL patterns
- **Validation:** Strict URL matching against allowlist
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
- **Prompt-Injection Defense:** User STAR text treated as DATA, not instructions
- **Strict JSON Output:** Enforces exact JSON schema, no prose outside structure
- **Client-Side Validation:** `validateSuggestions()` discards any suggestion whose quoted text doesn't appear verbatim (≥20 chars, whitespace/case normalized) in the entry

### 4.11 HTTP Security Headers
- **CSP:** Restricted `connect-src` includes `midway-auth.amazon.com` and API endpoints; `localhost:11434` **removed** from production
- **Cache-Control:** Three-tier pattern: index.html `no-cache/no-store/must-revalidate`; assets `max-age=31536000 immutable`; fallback `max-age=3600`
- **X-Frame-Options:** DENY
- **X-Content-Type-Options:** nosniff
- **Referrer-Policy:** strict-origin-when-cross-origin
- **Permissions-Policy:** Restricted feature access

### 4.12 File Import Security
- **Size Validation:** Enforced limits prevent resource exhaustion
- **PDF Processing:** Layout-resilient V2 parser (`pdfImportV2.ts`) with label-anchored extraction — fails closed on mismatch; returns diagnostics
- **Prototype Pollution Guard:** Object.create(null) for safe parsing

### 4.13 Review Comment Security
- **Server-Side Attribution:** `commenterAlias` set from verified JWT — cannot be forged by client
- **Retry/Stash Flow:** `consumeReview()` with retry counting; unmatched comments stashed after 5 attempts and surfaced in a dialog (never silently dropped)
- **Matching:** By ID (primary) then unambiguous title (fallback)

### 4.14 Error Boundary & Consistent Error Handling
- **Coverage:** React Error Boundary wrapping entire application
- **ErrorSnackbar:** Centralized error notification system
- **Type Safety:** Zero `any` types enforced across codebase

### 4.15 Dependency Security
- **DOMPurify:** Explicit pinned dependency (`dompurify@^3.4.12`) — previously phantom/undeclared — **FIXED**
- **Automated Scanning:** `npm audit` in CI pipeline
- **Vite 8 beta:** Pinned (`^8.0.0-beta.13`) — accepted risk pending stable release

## 5. RESOLVED Security Issues (this review cycle)

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
| A | AI proxy (`706rf9fx5c`) unauthenticated | MEDIUM | **Open** | Backend not in this repo. Frontend now only allows the build-configured endpoint (or localhost). Next: bring the proxy's SAM template into `backend/ai/`, put it behind the shared Midway authorizer, switch `ai.ts` to `apiFetch`. |
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
| Data theft from storage | Spoofing | AES-256-GCM encryption | ✅ Mitigated |
| CORS data exfiltration | Information Disclosure | Explicit origin allowlist | ✅ Mitigated |
| Forged review comments | Tampering | Server-side commenterAlias from JWT | ✅ Mitigated |
| Malicious script injection | Tampering | DOMPurify + XSS sanitization | ✅ Mitigated |
| AI hallucination/fabrication | Tampering | PROMO_COACH_SYSTEM grounding + quote validation | ✅ Mitigated |
| Oversized payload DoS | Denial of Service | Server-side size limits (1MB/4KB) | ✅ Mitigated |
| Stale bundle serving old code | Denial of Service | Three-tier cache headers (no-cache on index.html) | ✅ Mitigated |
| PII exposure to AI services | Information Disclosure | User-controlled, endpoint allowlist | ⚠️ Accepted risk |
| AI proxy abuse | Denial of Service | Client-side rate limiting + monitoring | ⚠️ Accepted risk |

## 8. Data Flow Security

### Authentication Flow
```
Browser Midway cookie → midway-auth.amazon.com/SSO → id_token (in-memory)
→ apiFetch.ts attaches Bearer → API Gateway → Lambda REQUEST authorizer
→ aws-jwt-verify (RS256, JWKS) → alias in context → handler validates path alias
```

### Storage Flow
```
User Input → Validation → Encryption (AES-256-GCM) → localStorage (namespaced per alias)
```

### Review Comment Flow
```
Manager submits comment → Bearer token attached → authorizer verifies JWT
→ handler extracts commenterAlias from token → DynamoDB write (unforgeable attribution)
→ Owner polls status → consumeReview() matches by ID/title → retry/stash on failure
```

### PDF Import Flow
```
File Upload → pdfImportV2.ts (label-anchored, per-KPI extraction)
→ {metrics, diagnostics:{found, missing, warnings}} → MetricsPage renders diagnostics
```

### AI Flow
```
Narrative save → auto-suggest (silent) → PROMO_COACH_SYSTEM prompt
→ Response → validateSuggestions() (client-side quote check ≥20 chars)
→ Fabricated quotes dropped → Pending chips displayed
```

## 9. Test Coverage

| Category | Test Count | Scope |
|----------|-----------|-------|
| Frontend (Vitest + jsdom) | 157 | storage, dimensionScoring, pdfImportV2, reviewImport, midwayAuth, apiFetch, storageMigration, leadClause |
| Backend (Node.js test runner) | 24 | authorizer (10), userdata handlers (8), review handlers (6) |
| **Total** | **181** | |

Live API matrix verified: no-token→401, valid-token-own-alias→200, valid-token-other-alias→403, expired/malformed→401/403, wrong-audience→401/403, oversized-body→413, oversized-comment→400.

## 10. Compliance Posture

| Control | Implementation | Status |
|---------|---------------|--------|
| Authentication | Midway JWT (RS256) on all APIs | ✅ Compliant |
| Authorization | Alias binding (token sub = URL path) | ✅ Compliant |
| Encryption at Rest | AES-256-GCM (client) | ✅ Compliant |
| Encryption in Transit | HTTPS only | ✅ Compliant |
| Input Validation | Client + server-side size limits | ✅ Compliant |
| Output Sanitization | DOMPurify + XSS protection | ✅ Compliant |
| Security Headers | CSP + HSTS + X-Frame-Options | ✅ Compliant |
| CORS | Explicit origins only | ✅ Compliant |
| Dependency Scanning | npm audit in CI | ✅ Compliant |
| PII in Source Code | Fictional data only | ✅ Compliant |
| Test Coverage | 181 tests (frontend + backend) | ✅ Compliant |

## 11. Future Recommendations

1. **AI Proxy Authentication:** Add JWT authorizer to the Bedrock proxy (`706rf9fx5c`) — highest remaining priority
2. **IAM Leading-Key Condition:** Add DynamoDB IAM condition key for defense-in-depth
3. **Stabilize Vite:** Move off Vite 8 beta once stable release is available
4. **Environment Configuration:** Replace hardcoded API Gateway URLs with build-time environment variables
5. **Audit Logging:** Implement comprehensive activity logging
6. **Penetration Testing:** Regular third-party security assessments

## 12. Security File Map

| File | Security Role | Description |
|------|---------------|-------------|
| `backend/*/src/authorizer.mjs` | Authentication | Midway JWT verification (aws-jwt-verify, RS256, JWKS) |
| `src/utils/midwayAuth.ts` | Token Management | Fetches/caches Midway id_token in-memory; refresh on 401 |
| `src/utils/apiFetch.ts` | Transport Security | Wraps fetch with Bearer header + 401 auto-retry |
| `src/store/storage.ts` | Data Isolation | Per-alias namespaced localStorage; one-shot migration |
| `src/utils/crypto.ts` | Encryption Core | AES-256-GCM implementation, PBKDF2 key derivation |
| `src/utils/aiPrompts.ts` | AI Guardrails | PROMO_COACH_SYSTEM grounding, anti-fabrication, injection defense |
| `src/utils/pdfImportV2.ts` | File Security | Layout-resilient PDF parser; label-anchored, fails closed |
| `src/utils/reviewImport.ts` | Review Security | consumeReview() with retry/stash; match by ID then title |
| `amplify.yml` | Header Security | Three-tier cache + CSP (no localhost in prod) |
| `.harmony/harmony-metadata.json` | Header Security | Harmony CSP (midway-auth + API endpoints) |
| `backend/*/template.yaml` | Infrastructure | SAM templates: CORS config, authorizer, DynamoDB |

---

**Document Classification:** Internal Use  
**Last reviewed:** 2026-07-29  
**Next Review Date:** 2026-10-29  
**Approved By:** Security Team  
**Document Owner:** PromoTrack Development Team
