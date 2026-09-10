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

`src/authorizer.mjs` verifies the Midway `id_token` (RS256, issuer, audience) and injects the
verified alias into `requestContext.authorizer.lambda.alias`. Handlers never trust anything else
for identity. Shared helpers live in `src/lib/http.mjs`.

## Local development

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

## One-time production migration (two legacy stacks → this stack)

The legacy stacks (`backend/review`, `backend/userdata` in git history) each own a table by
fixed name: `promo-track-reviews` and `promo-track-users`. CloudFormation will not let a second
stack create a table with the same name, and deleting the legacy stacks must not delete data.
Both tables already carry `DeletionPolicy: Retain` (deployed in phase 1), so the safe sequence is:

1. Deploy the beta stack and verify the frontend against it end to end.
2. **Detach the tables from the legacy stacks without deleting them.** In each legacy stack,
   confirm the table resource has `DeletionPolicy: Retain` in the *deployed* template
   (`aws cloudformation get-template --stack-name <legacy>`). If it does not, deploy the
   phase-1 templates first — that is a metadata-only change.
3. Delete the two legacy stacks:
   `aws cloudformation delete-stack --stack-name <review-stack>` and the userdata one.
   The API Gateways and Lambdas are removed; the tables are retained (orphaned).
   Existing clients get errors from this point until step 5 — do it in a quiet window.
4. Import the orphaned tables into the new stack:
   ```bash
   sam build
   sam deploy --config-env prod --no-execute-changeset   # produces packaged template + change set; cancel it
   aws cloudformation create-change-set \
     --stack-name promo-track-backend --change-set-type IMPORT \
     --change-set-name import-tables \
     --resources-to-import '[
       {"ResourceType":"AWS::DynamoDB::Table","LogicalResourceId":"ReviewsTable","ResourceIdentifier":{"TableName":"promo-track-reviews"}},
       {"ResourceType":"AWS::DynamoDB::Table","LogicalResourceId":"UsersTable","ResourceIdentifier":{"TableName":"promo-track-users"}}]' \
     --template-body file://.aws-sam/build/template.yaml \
     --parameters ParameterKey=Stage,ParameterValue=prod \
                  ParameterKey=ReviewsTableName,ParameterValue=promo-track-reviews \
                  ParameterKey=UsersTableName,ParameterValue=promo-track-users \
     --capabilities CAPABILITY_IAM
   aws cloudformation execute-change-set --stack-name promo-track-backend --change-set-name import-tables
   ```
   An IMPORT change set may only contain the imported resources on a brand-new stack, so the
   first import creates the stack with just the two tables.
5. Deploy the rest of the stack normally: `npm run deploy:prod`.
6. Take the `ApiUrl` output and set both `VITE_REVIEW_API_URL` and `VITE_USERDATA_API_URL`
   to it (Amplify environment variables + `.harmony/harmony-metadata.json` `connect-src`), then
   redeploy the frontend. Remove the two old API hostnames from the CSP afterwards.

Rollback at any point before step 6: redeploy the phase-1 legacy templates; they will
recreate their APIs and, because the tables still exist by name, fail on table creation —
so import the tables back into them the same way, or simply keep the new stack and finish.
