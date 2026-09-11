# PromoTrack — AI Technical Reference

**Last updated:** 2026-09-10 (app 1.3.0 · Harmony beta 3.3.1 · branch `audit-fixes`)

This document gives an AI assistant enough context to modify the codebase without exploring it. When it disagrees with the code, the code wins — update this file.

## Quick facts
- React 19 + TypeScript 5.9 (strict) + Vite 8 (rolldown) + MUI 7. Icons are imported **per path** (`@mui/icons-material/Foo`) — the barrel import is lint-forbidden.
- State: one `AppContext` (`useReducer`, 14 actions) with memoised value; persisted to localStorage per alias and to the cloud with optimistic concurrency.
- Identity: Harmony `window.harmony.user.lookup()` for the alias; Midway `id_token` (in-memory only) as Bearer for the API. On the dev server, `VITE_DEV_USER` supplies a fake alias and the `X-Dev-Alias` header for the local harness.
- Backend: **one** SAM stack (`backend/template.yaml`), one HTTP API, one Midway authorizer, 7 handler functions, 2 DynamoDB tables. Deployed as `promo-track-backend-beta`; prod still runs the two legacy stacks (see `Documents/DEPLOYMENT.md`).
- Config: API URLs come from `src/config.ts` (`VITE_*` at build time). No runtime override exists.
- Tests: 266 (Vitest; jsdom for `src/**`, node for `backend/tests/**`). Component tests use React Testing Library.
- No encryption / lock screen / shout-outs remain in the code. `session.ts` rejects old `PROMO-TRACK-ENC:` files; `storage.ts` deletes encryption-era keys on migration.

## Directory structure
```
promo-track/
├── src/
│   ├── main.tsx / App.tsx           # boot(): Harmony user → cloud record (5 s) → localStorage; lazy routes; 404 → /
│   ├── config.ts                    # REVIEW_API_URL, USERDATA_API_URL, AI_API_URL, AI_DEFAULT_MODEL, DEV_USER, APP_NAME
│   ├── vite-env.d.ts
│   ├── types/index.ts               # LEADERSHIP_PRINCIPLES, JobLevel, UserProfile, STAREntry, Metric, AppState, …
│   ├── data/levelGuidelines.ts      # GUIDELINES{L4,L5} (7 each), BONUS_TAGS, id maps for migrations
│   ├── store/
│   │   ├── AppContext.tsx            # reducer + provider: debounced versioned cloud save, syncConflict, reloadFromCloud, forceCloudSave
│   │   ├── storage.ts                # per-alias keys, loadState/saveState, normalizeState(), migrations
│   │   └── ThemeContext.tsx          # buildTheme(mode): tokens (brand, surface), dark surfaces, focus ring, reduced motion
│   ├── context/OnboardingContext.tsx # stage 0-3, CELEBRATION_MESSAGES, PROGRESSIVE_UNLOCK_ENABLED=false (all tabs open)
│   ├── hooks/useReviewPolling.ts     # 30 s poll while a review link is pending; merges comments
│   ├── utils/
│   │   ├── apiFetch.ts               # Bearer attach, 401 retry, X-Dev-Alias in dev
│   │   ├── midwayAuth.ts             # silent SSO token fetch, in-memory cache
│   │   ├── harmonyUser.ts            # Harmony user or DEV_USER
│   │   ├── userDataApi.ts            # loadUserData → {data,version,updatedAt}; saveUserData(userId,data,expectedVersion) → 409 ConflictError
│   │   ├── reviewApi.ts              # createReviewSession({…,reviewerAliases}), getReview, submitComments, checkReviewStatus, revokeReviewSession
│   │   ├── reviewImport.ts           # consumeReview(): match by id → title, retry/stash after 5 attempts
│   │   ├── ai.ts                     # getAIConfig/saveAIConfig (endpoint allowlist: build endpoint, localhost, /api/*), chat(), chatMessages()
│   │   ├── aiPrompts.ts              # asData()/dataBlock() injection defence, PROMO_COACH_SYSTEM, suggestDimensions, qualityChecklist, gapCoaching, PROMPTS.*, parseSuggestDimensionsResponse()
│   │   ├── dimensionScoring.ts       # scoreDimensions(), validateSuggestions() (verbatim-quote check)
│   │   ├── pdfImport.ts / pdfImportV2.ts # GSD scorecard parser (label-anchored, ISO weeks, diagnostics)
│   │   ├── docExport.ts / docPreview.ts # DOCX generation (lazy-loaded), HTML preview
│   │   ├── session.ts                # export/import .portfolio (JSON; reviver blocks __proto__/constructor/prototype)
│   │   ├── wikiContent.ts            # fetch /content/guidelines-wiki.{html,meta.json}
│   │   ├── alias.ts                  # normalizeAlias('Bob@amazon.com') → 'bob'
│   │   ├── motion.ts                 # prefersReducedMotion()
│   │   ├── helpers.ts                # getQuarter, lpCoverage, readinessScore
│   │   └── starrTemplates.ts
│   ├── components/
│   │   ├── ErrorBoundary.tsx         # reload / export my data / reset local copy
│   │   ├── ErrorSnackbar.tsx, UndoSnackbar.tsx  # showError()/showUndo() registered in effects
│   │   ├── MetricEvolution.tsx       # weekly/monthly LineCharts, theme-aware colours
│   │   ├── PageTip.tsx, WordCount.tsx
│   │   ├── layout/Layout.tsx         # AppBar, drawer, skip link, sync chip, conflict banner, Suspense around <Outlet/>
│   │   ├── onboarding/{OnboardingProgress,CelebrationOverlay,TrophyModal}.tsx
│   │   ├── ai/{AIAssistant,ImproveSTARRButton}.tsx
│   │   ├── starr/{STARRCard,STARRFormDialog,DimensionCoveragePanel,TemplatePickerDialog,ShareReviewDialog}.tsx
│   │   └── __tests__/{Dashboard,ShareReviewDialog}.test.tsx
│   └── pages/ Dashboard, STARR, Metrics, Documents, Profile, FAQ, Guidelines, Review, Timeline
├── public/
│   ├── content/guidelines-wiki.html + .meta.json   # wiki snapshot (npm run sync-wiki)
│   ├── favicon.svg, pdf.worker.min.mjs, walkthrough.mov, wiki-assets/
├── backend/
│   ├── template.yaml                # single stack; Stage, AllowedOrigins, AlarmEmail, *TableName params
│   ├── samconfig.toml               # [beta] / [prod] deploy envs
│   ├── package.json                 # aws-jwt-verify; dev: aws-sdk v3, esbuild, express, cors
│   ├── src/authorizer.mjs           # Midway JWT (RS256, JWKS w/ use:sig patch), stageWildcardArn() for cached policies
│   ├── src/lib/http.mjs             # respond/error/serverError/callerAlias/parseJsonBody/assertOwner/canAccessReview/isExpired
│   ├── src/review/{create,get,comments,status,revoke}.mjs
│   ├── src/userdata/{get,save}.mjs
│   ├── src/ai/{chat,tags}.mjs        # Bedrock Converse behind Midway; Ollama-compatible contract
│   ├── local/                       # dev harness: Express → real handlers; in-memory DynamoDB + fake Bedrock via module hook
│   ├── local-server.mjs             # npm start → http://127.0.0.1:3001
│   ├── tests/*.test.mjs             # vitest, 57 tests
│   └── README.md                    # routes, local dev, prod cut-over runbook
├── .github/workflows/ci.yml         # audit, lint, tsc, tests, build, sam validate; OIDC beta deploy on main
├── .harmony/harmony-metadata.json   # CSP object + X-Content-Type-Options (only approved header)
├── .env.example, .env.beta          # dev template; beta build endpoints
├── vite.config.ts                   # navbar plugin (skippable in dev), manualChunks (react/mui/charts/docx/pdfgen/mammoth)
├── vitest.config.ts                 # projects: frontend (jsdom) + backend (node)
└── amplify.yml                      # legacy Amplify build (audit/lint/test gated)
```

## Data model (types/index.ts)
- `UserProfile`: id, name, email, role, level, targetLevel (`'L3'|'L4'|'L5'|'L6'`), proposedTitle, manager, team, startDate, targetPromotionDate, effectiveQuarter, steamMember, steamDirect, promotionApprover
- `STAREntry`: id, title, situation, task, action, results, principles[], date, quarter, impactLevel, evidenceLinks[], dimensions?[] (guideline ids), themes?[], aiSuggestedDimensions?, customFields?, hiddenFields?, reviewComments?[], levelDimension? (legacy)
- `Metric`: id, type, value, target, date, period (`weekly|monthly|quarterly`), notes, channel
- `AppState`: profile, star[], metrics[], scopeOfRole, bestReasonsNotToPromote, additionalInfo, activityLog?, dimensionAnalysis?
- `CURRENT_VERSION = 2`, `APP_VERSION = '1.1.0'` (portfolio file format)

## State (AppContext.tsx)
Actions: `SET_PROFILE, ADD_STAR, UPDATE_STAR, DELETE_STAR, ADD_METRIC, DELETE_METRIC, IMPORT_METRICS, SET_SCOPE_OF_ROLE, SET_BEST_REASONS, SET_ADDITIONAL_INFO, LOAD_STATE, RESET_STATE, SET_DIMENSION_ANALYSIS, SET_ENTRY_AI_SUGGESTIONS`.

Persistence:
1. Every state change → `saveState()` to `promo-track-<alias>:data`.
2. With a `userId`, a 2 s debounce → `saveUserData(userId, state, versionRef)` with `If-Match`. Server returns the new `version`.
3. `409` → `syncConflict=true`, cloud sync pauses, `Layout` shows "Load newer copy / Keep mine" (`reloadFromCloud()` / `forceCloudSave()`).
4. Boot (`App.tsx`): cloud record wins when present and is passed through `normalizeState()`; otherwise localStorage, pre-filled with the Harmony name/email.

## Backend contract
| Route | Auth/ownership | Notes |
|---|---|---|
| `GET /userdata/{alias}` | alias must equal token `sub` (403) | `{data, version, updatedAt}` |
| `PUT /userdata/{alias}` | same; optional `If-Match: <version>` | 1 MB max; 409 on version mismatch; `{success, version, updatedAt}` |
| `POST /reviews` | any authenticated user | body `{entries, employeeName, targetLevel, reviewerAliases?}`; ≤100 entries, ≤10 aliases; stores `ownerAlias`; TTL 7 d |
| `GET /reviews/{id}` | owner, or listed reviewer, or anyone if list empty; otherwise **404** | returns `isOwner` |
| `GET /reviews/{id}/status` | same | comments only when `status='reviewed'` |
| `POST /reviews/{id}/comments` | same | per-entry merge `SET comments.#k = :v`; 4 KB/comment, ≤200 |
| `DELETE /reviews/{id}` | owner only (condition expression) | revoke |
| `POST /ai/chat` | any authenticated user | Ollama-shaped `{model, messages, stream}` → `{message:{content}}`; model allowlist (`AiAllowedModels`), ≤40 msgs / 60 KB, 1500 output tokens, 429 on throttling |
| `GET /ai/tags` | any authenticated user | allowlisted models |
Errors: 500 bodies are always `{"error":"Internal server error"}`; details go to structured logs. CORS is API-level only (handlers set no CORS headers).

## AI integration
- Default provider Bedrock (Claude Haiku 4.5) via `AI_API_URL` = `<USERDATA_API_URL>/ai`, i.e. `backend/src/ai/chat.mjs` behind the Midway authorizer; requests go through `apiFetch` (Bearer). Local: the harness fakes Bedrock; Ollama via the Vite `/api/ai` proxy remains possible. Endpoint override limited to the build endpoint, `localhost`, `/api/*`.
- The legacy standalone proxy `706rf9fx5c` is no longer referenced by the app and can be deleted once prod is on the unified stack.
- All user text goes through `asData()` (delimiter stripping, length caps) inside `<<<USER_DATA … USER_DATA>>>` blocks; every system prompt carries `INJECTION_DEFENSE`.
- `parseSuggestDimensionsResponse(raw, allowedIds)` tolerates fences/prose, drops unknown ids, caps 3 suggestions/400 chars; then `validateSuggestions()` requires a verbatim ≥20-char quote.
- Rate limit 2 s between calls (`chat`, `chatMessages`).

## Key patterns and gotchas
- **Never** write refs during render or call setState synchronously in effects — `react-hooks` rules are errors in ESLint.
- Snackbars register their setter in `useEffect`; call `showError()/showUndo()` from anywhere.
- `Layout` owns `Suspense`; `App` only wraps `ReviewPage`. This keeps the shell mounted while lazy pages load.
- `ProfilePage` resets its `react-hook-form` when `state.profile` changes externally.
- `DimensionCoveragePanel` and the dashboard both use `scoreDimensions(state.star, GUIDELINES[targetLevel])`.
- Wiki HTML is fetched at runtime (`wikiContent.ts`), sanitised (`sanitizeWikiHTML` + `cleanupWikiHTML` in `GuidelinesPage`), and accordion handlers are bound after the HTML lands.
- Harmony metadata: CSP via object only; only `X-Content-Type-Options` allowed in `headers`; `worker-src` needs `'self' blob:`.
- Authorizer: Allow policy must be the stage wildcard (`…/prod/*`) because `ReauthorizeEvery: 300` caches it.
- SAM: `AllowOrigins` must be a CommaDelimitedList parameter; do not pin `SSEType: KMS`.
- `.env.development.local` is dev-only. Production builds read `.env.production` / `.env.beta` (`--mode beta`).

## localStorage keys
Per alias (`promo-track-<alias>:…`): `data`, `pending-review`, `review-retry-count`, `unmatched-review`, `dismissed-tips`, `trophy-shown`, `was-reset`, `promo-track-migration-done`.  
Device-level: `promo-track-ai-config` (provider/model/endpoint — endpoint validated on read), `promo-track-onboarding`, `promo-track-theme`.  
Removed: `promo-track-review-api`, `promo-track-userdata-api`, all `*-encrypted/pass-hash/lock-ts` keys.

## Tests (266)
| File | Tests | Scope |
|---|---|---|
| src/utils/__tests__/pdfImportV2.test.ts | 43 | parser perturbation + golden |
| src/data/__tests__/leadClause.test.ts | 42 | lead clause is verbatim substring |
| src/store/__tests__/storage.test.ts | 32 | keys, load/save, migrations |
| src/utils/__tests__/dimensionScoring.test.ts | 19 | scoring, quote validation |
| src/utils/__tests__/reviewImport.test.ts | 18 | matching, retry/stash |
| src/utils/__tests__/reviewApi.test.ts | 11 | alias normalisation, create/revoke |
| src/utils/__tests__/aiPrompts.test.ts | 9 | data blocks, response parser |
| src/utils/__tests__/midwayAuth.test.ts | 9 | token fetch/cache |
| src/store/__tests__/storageMigration.test.ts | 8 | legacy key migration |
| src/utils/__tests__/apiFetch.test.ts | 7 | Bearer + 401 retry |
| src/components/__tests__/ShareReviewDialog.test.tsx | 4 | allowlist, create, revoke |
| src/components/__tests__/Dashboard.test.tsx | 4 | first run, next step, links, debounced versioned save |
| src/utils/__tests__/pdfImport.test.ts | 3 | wrapper |
| backend/tests/ai.handlers.test.mjs | 13 | model allowlist, Converse mapping, limits, 429, no leakage |
| backend/tests/review.handlers.test.mjs | 19 | access control, merge, revoke, no leakage |
| backend/tests/userdata.handlers.test.mjs | 14 | ownership, If-Match/409, limits |
| backend/tests/authorizer.test.mjs | 11 | allow/deny matrix, stage wildcard |

Run: `npm test` · `npm run test:backend` · `npm run test:coverage`. Browser E2E scripts used for the September verification live outside the repo (Playwright + installed Chrome against `npm run dev` + `npm run backend:start`).

## Open items
1. Prod cut-over to the unified stack (`backend/README.md`).
2. `git filter-repo` to purge `Shout-Out/*.eml`, `one pager.png`, `.aws-sam/` from history.
3. Deferred refactors: STAR editor as drawer/page, split `STARRFormDialog`/`DimensionCoveragePanel`/`GuidelinesPage`, selector hooks over `AppContext`, tighter `Metric` types, Vite stable, anonymise GSD test fixture.
