# Promo Track — Review System Backend

Serverless backend for the web-based review flow. Managers receive a link, review STAR entries in-browser, and submit comments — no file exchange needed.

## Architecture

- **API Gateway HTTP API** — 4 endpoints for review CRUD
- **DynamoDB** — `promo-track-reviews` table with 7-day TTL
- **Lambda (Node.js 20, arm64)** — Minimal handlers using AWS SDK v3

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/reviews` | Create a review session |
| GET | `/reviews/{sessionId}` | Get review data for manager |
| POST | `/reviews/{sessionId}/comments` | Submit manager comments |
| GET | `/reviews/{sessionId}/status` | Poll review status |

## Deploy

Prerequisites: [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html)

```bash
cd backend/review

# Build
sam build

# Deploy (first time — guided)
sam deploy --guided --region eu-west-1

# Deploy (subsequent)
sam deploy --region eu-west-1
```

During guided deploy, accept defaults. The stack name `promo-track-review` is recommended.

## Output

After deploy, SAM prints the `ApiUrl` output — this is the base URL for all review endpoints. Update the frontend to use this URL.

## Cleanup

```bash
sam delete --region eu-west-1
```
