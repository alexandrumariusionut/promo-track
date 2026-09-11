# Backend

Single AWS SAM stack (`template.yaml`) exposing one Midway-authorised HTTP API:

| Route | Handler | Table |
|---|---|---|
| `POST /reviews` | `src/review/create.mjs` | reviews |
| `GET /reviews/{id}` | `src/review/get.mjs` | reviews |
| `DELETE /reviews/{id}` | `src/review/revoke.mjs` (owner only) | reviews |
| `POST /reviews/{id}/comments` | `src/review/comments.mjs` | reviews |
| `GET /reviews/{id}/status` | `src/review/status.mjs` | reviews |
| `GET /userdata/{alias}` | `src/userdata/get.mjs` | users |
| `PUT /userdata/{alias}` | `src/userdata/save.mjs` (`If-Match` → 409) | users |
| `POST /ai/chat` | `src/ai/chat.mjs` — Bedrock Converse, Ollama-compatible body, model allowlist, size caps | — |
| `GET /ai/tags` | `src/ai/tags.mjs` — allowlisted models | — |

`src/authorizer.mjs` verifies the Midway `id_token` (RS256, issuer, audience) and injects the
verified alias into `requestContext.authorizer.lambda.alias`. Handlers never trust anything else
for identity. Shared helpers live in `src/lib/http.mjs`.

## Local development

The harness fakes DynamoDB **and** Bedrock. Set `LOCAL_BEDROCK=real` to call Bedrock with your AWS credentials.

```bash
npm install
npm start          # real handlers on http://127.0.0.1:3001 against an in-memory DynamoDB shim
npm test           # vitest (shared runner with the frontend)
npm run validate   # sam validate --lint
```

Identity locally comes from the `X-Dev-Alias` header (the frontend sends it when
`VITE_DEV_USER` is set in `.env.local`). Point the frontend at the local API with
`VITE_REVIEW_API_URL=http://127.0.0.1:3001` and `VITE_USERDATA_API_URL=http://127.0.0.1:3001`.

## Deploying

```bash
npm run deploy:beta   # stack promo-track-backend-beta, tables *-beta
npm run deploy:prod   # stack promo-track-backend, existing prod tables
```

CI deploys beta automatically on pushes to `main` (see `.github/workflows/ci.yml`, needs the
`AWS_DEPLOY_ROLE_ARN` secret for OIDC). Production is manual.

## Production cut-over (done 2026-09-11)

The two legacy stacks (`promo-track-userdata`, `promo-track-review`) were deployed **without**
`DeletionPolicy: Retain` on their tables, so importing the tables into this stack (which requires
deleting the legacy stacks first) would have destroyed the data. Instead:

1. On-demand backup `promo-track-users-pre-cutover-20260911` of `promo-track-users` (5 users; `promo-track-reviews` was empty).
2. `sam deploy --config-env prod` created stack `promo-track-backend` with fresh tables
   `promo-track-users-v2` / `promo-track-reviews-v2` (Retain, PITR, deletion protection) and API `zk0njdczql`.
3. All items were copied with `batch-write-item` and verified identical (`scan` both tables, compare).
4. Prod audience tightened to `promo-track.harmony.a2z.com` only.
5. Frontend: `.env.production` points at `zk0njdczql`; Harmony CSP `connect-src` updated; Harmony prod deployed.

Still to do once nobody can be on an old bundle (no old bundle was ever live in prod, and beta moved
to `g093baotu0` on 2026-09-10):

```bash
# Legacy API stacks (their tables have NO Retain policy — delete-stack WILL delete promo-track-users / promo-track-reviews).
# The data already lives in promo-track-users-v2; the on-demand backup covers the rest.
aws cloudformation delete-stack --region eu-west-1 --stack-name promo-track-review
aws cloudformation delete-stack --region eu-west-1 --stack-name promo-track-userdata
# Standalone unauthenticated Bedrock proxy, replaced by /ai/chat:
aws apigatewayv2 delete-api --region eu-west-1 --api-id 706rf9fx5c
aws lambda delete-function --region eu-west-1 --function-name promo-track-bedrock
```

Rollback before the legacy stacks are deleted: redeploy a frontend with the old API URLs. After
that point, restore from `promo-track-users-pre-cutover-20260911` or PITR on the `-v2` tables.
