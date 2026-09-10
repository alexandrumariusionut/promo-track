# PromoTrack — Deployment Document

**Last updated:** 2026-09-10  
**Region:** eu-west-1 (Ireland)  
**Account:** 029465354181  
**Deployed by:** marindru-Isengard

---

## Current state (2026-09-10)

| Stage | Frontend (Harmony) | Backend stack | API base URL | Tables |
|---|---|---|---|---|
| **beta** | `promo-track.beta.harmony.a2z.com` — Harmony version **3.3.1** (deployed 2026-09-10) | `promo-track-backend-beta` (unified stack) | `https://g093baotu0.execute-api.eu-west-1.amazonaws.com/prod` | `promo-track-users-beta`, `promo-track-reviews-beta` |
| **prod** | `promo-track.harmony.a2z.com` — **never deployed** (root returns 404) | legacy `promo-track-userdata` + `promo-track-review` (still running, unchanged since 2026-07-29) | `t8b50k0lwh…` (userdata), `1jvjxaiuig…` (review) | `promo-track-users`, `promo-track-reviews` |

The prod cut-over to the unified stack is documented in `backend/README.md` and has **not** been executed yet.

---

## Architecture

```
┌──────────────────────────────────────────┐
│          End Users (Browser)             │
│  Midway cookie → midwayAuth.ts → token   │
└──────────┬───────────────────────────────┘
           │ Bearer <Midway id_token>
     ┌─────▼──────────────────────────────────────────┐
     │   Harmony Platform (static SPA hosting)        │
     │   promo-track.beta.harmony.a2z.com  (beta)     │
     │   promo-track.harmony.a2z.com       (prod)     │
     │   CSP merged from .harmony/harmony-metadata    │
     └─────┬──────────────────────────────────────────┘
           │ Bearer <JWT>  (+ If-Match on PUT)
     ┌─────▼──────────────────────────────────────────┐
     │   ONE API Gateway HttpApi per stage            │
     │   Lambda REQUEST authorizer (aws-jwt-verify,   │
     │   RS256, Midway JWKS, 5-min policy cache)      │
     │   /reviews*   → review/*.mjs  (5 functions)    │
     │   /userdata/* → userdata/*.mjs (2 functions)   │
     │   Access logs (90 d) · X-Ray · 5XX/4XX alarms  │
     └─────┬──────────────────────────────────────────┘
           │
     ┌─────▼──────────────────────────────────────────┐
     │   DynamoDB (PAY_PER_REQUEST, PITR, Retain)     │
     │   users   (userId = alias, version counter)    │
     │   reviews (sessionId, TTL 7 d, ownerAlias,     │
     │            reviewerAliases, per-entry comments)│
     └────────────────────────────────────────────────┘

     ┌────────────────────────────────────────────────┐
     │   AI proxy 706rf9fx5c (Bedrock, Claude Haiku)  │
     │   NOT in this repo · NO Midway auth · OPEN item│
     └────────────────────────────────────────────────┘
```

The Ollama EC2 fallback (`3.249.190.229`) is no longer referenced by the app; the frontend only allows the build-configured AI endpoint or `localhost`.

---

## Frontend (Harmony)

### Build

```bash
npm ci
npm run build-harmony-app:beta   # vite build --mode beta --outDir app && build-harmony
npm run build-harmony-app        # production mode (reads .env.production if present)
```

- API endpoints are **baked in at build time** from `VITE_REVIEW_API_URL` / `VITE_USERDATA_API_URL` / `VITE_AI_API_URL` (`src/config.ts`). They can no longer be overridden from `localStorage`.
- `.env.beta` (committed, no secrets) points beta at the unified beta API. `.env.development.local` (gitignored) is for the dev server only — Vite never loads it for production builds.
- Bundle: route-level lazy loading plus vendor chunks (`react`, `mui`, `charts`, `docx`, `pdfgen`, `pdf`); entry chunk ≈ 75 KB.

### Deploy

```bash
harmony app deploy -s beta
harmony app deploy -s prod       # not yet done — see "Prod cut-over" below
harmony app display-versions -s beta
```

Harmony CLI must be ≥ 1.8.45 (`harmony update`); older versions fail `display-versions` with "Cannot read properties of null".

### `.harmony/harmony-metadata.json` rules (learned 2026-09-10)

- The CSP is supplied **only** through the `content-security-policy` object. Harmony merges each directive with its platform defaults (`'self'`, navbar and console hosts). Do not add `'none'` directives and do not duplicate the CSP in `headers`.
- `worker-src` must include `'self'` (PDF worker is served from the app origin) and `blob:`.
- Only Harmony-approved response headers are accepted. `Referrer-Policy`, `Permissions-Policy` and `X-Frame-Options` are **rejected at registration**; `X-Content-Type-Options: nosniff` is accepted.
- When the API host changes, add it to `connect-src`.

Effective beta CSP (verified live): `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: …; connect-src 'self' <harmony hosts> midway-auth.amazon.com <api hosts>; worker-src 'self' blob:; media-src 'self'; frame-src <harmony/midway hosts>`.

### Login flow gotcha

`/_login?targetUrlBase64=<b64>` returns **400 "Failure to contact origin"** if the base64 padding `=` is not URL-encoded (`%3D`). Browsers encode it (the Harmony landing page uses `encodeURIComponent`), so users are unaffected; only hand-written curl tests hit this. The July "beta login 400" investigation was this artefact.

---

## Backend (AWS SAM, single stack)

`backend/template.yaml` — parameters: `Stage` (beta|prod), `AllowedOrigins` (comma list), `AlarmEmail`, `ReviewsTableName`, `UsersTableName`.

```bash
cd backend
npm ci
npm run validate       # sam validate --lint
npm test               # vitest (shared runner with frontend)
npm run deploy:beta    # sam build (esbuild on PATH) + sam deploy --config-env beta
npm run deploy:prod    # see cut-over first
```

Stage differences: beta uses `-beta` table suffixes, `promo-track.beta.harmony.a2z.com` as the JWT audience and CORS origin (plus localhost), no deletion protection. Prod uses the existing table names, both Harmony hosts as audiences, deletion protection on the users table.

### Legacy stacks

`promo-track-userdata` and `promo-track-review` still serve prod. Their templates were removed from the repo in commit `8477102`; the last deployed version (2026-07-29) runs `nodejs20.x`, whose **updates have been blocked by Lambda since 2026-07-01**. They cannot be modified, only deleted. Do not run `sam delete` on them before completing the cut-over — both tables carry `DeletionPolicy: Retain`, but verify with `aws cloudformation get-template` first.

### Prod cut-over (not yet executed)

Follow `backend/README.md` § "One-time production migration": delete the legacy stacks (tables are retained), import `promo-track-reviews` and `promo-track-users` into a new `promo-track-backend` stack with an IMPORT change set, deploy the rest of the stack, then point the frontend build (`.env.production`) and `connect-src` at the new `ApiUrl` and deploy Harmony prod.

---

## Verification checklist after any deploy

```bash
# Auth matrix against the API (get a token via the browser or midway cookie)
A=https://<api>.execute-api.eu-west-1.amazonaws.com/prod
curl -s -o /dev/null -w '%{http_code}\n' $A/userdata/<alias>                          # 401
curl -s -o /dev/null -w '%{http_code}\n' -H 'Authorization: Bearer a.b.c' $A/userdata/<alias>  # 403
curl -s -H "Authorization: Bearer $TOK" $A/userdata/<alias>                            # 200 {"data":…,"version":n}
curl -s -o /dev/null -w '%{http_code}\n' -H "Authorization: Bearer $TOK" $A/userdata/other  # 403
curl -s -X PUT -H "Authorization: Bearer $TOK" -H 'If-Match: 0' -d '{}' $A/userdata/<alias> # 409 if record exists

# CORS preflight must be 204 with allow-headers incl. if-match and methods incl. DELETE
curl -s -D - -o /dev/null -X OPTIONS -H 'Origin: https://promo-track.beta.harmony.a2z.com' \
  -H 'Access-Control-Request-Method: PUT' -H 'Access-Control-Request-Headers: authorization,content-type,if-match' $A/userdata/x
```

Frontend: hard refresh, check `<title>PromoTrack</title>`, favicon, `/content/guidelines-wiki.html` → 200, Metrics PDF import (worker), Share for Review dialog (create, copy, revoke).

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Every request after the first returns 403 for ~5 min | Authorizer policy scoped to a single route while `ReauthorizeEvery` caches it | Policy must use the stage wildcard ARN (`stageWildcardArn()` in `authorizer.mjs`) |
| `CorsConfiguration` is `null` after deploy | `AllowOrigins` built with `!Split`/`!FindInMap` is silently dropped by SAM | Use the `AllowedOrigins` CommaDelimitedList parameter |
| Stack rollback: "KMS key … does not exist" | AWS-managed `aws/dynamodb` key is created lazily | Do not set `SSEType: KMS`; AWS-owned encryption applies by default |
| Early-validation "resource already exists" | A retained table from a rolled-back deploy | Delete the empty orphan table (check `ItemCount` first) or import it |
| `sam build`: "Cannot find esbuild" | SAM looks on PATH, not in `src/` | `npm run build` (puts `node_modules/.bin` on PATH) |
| Harmony registration fails "header not approved" | Unapproved response header in metadata | Keep only `X-Content-Type-Options`; CSP via the object |
| `Failure to contact origin. Received: 400` on `/_login` | Unencoded `=` in `targetUrlBase64` (curl only) | URL-encode the base64 |
| 401 on frontend after deploy | Authorizer `AUDIENCES` missing the host | Check `StageConfig` mapping in `template.yaml` |

---

## Cost estimate

| Resource | Estimated monthly cost |
|---|---|
| API Gateway + Lambda (2 stages) | ~ $1 |
| DynamoDB on-demand + PITR | ~ $1 |
| CloudWatch logs/alarms/X-Ray | ~ $1 |
| Harmony hosting | internal |
| EC2 t3.xlarge Ollama fallback (`i-0d248919ac611baa4`) | ~ $122 — **no longer used by the app; candidate for termination** |

---

## Teardown

```bash
# Beta backend (tables are retained; delete them explicitly if wanted)
aws cloudformation delete-stack --stack-name promo-track-backend-beta --region eu-west-1

# Legacy prod stacks — ONLY after the cut-over
aws cloudformation delete-stack --stack-name promo-track-userdata --region eu-west-1
aws cloudformation delete-stack --stack-name promo-track-review --region eu-west-1

# Unused Ollama instance
aws ec2 terminate-instances --instance-ids i-0d248919ac611baa4 --region eu-west-1
```
