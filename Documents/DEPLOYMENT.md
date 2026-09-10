# PromoTrack — Deployment Document

**Last updated:** 2026-07-29  
**Region:** eu-west-1 (Ireland)  
**Account:** 029465354181  
**Deployed by:** marindru-Isengard

---

## Architecture Overview

```
┌──────────────────────────────────────────┐
│          End Users (Browser)             │
│  Midway cookie → midwayAuth.ts → token   │
└──────────┬───────────────────────────────┘
           │ Bearer <JWT>
     ┌─────▼──────────────────────────────────────────┐
     │   Harmony Platform (Primary)                   │
     │   promo-track.harmony.a2z.com (prod)           │
     │   promo-track.beta.harmony.a2z.com (beta)      │
     │   (React SPA — static files)                   │
     └─────┬──────────────────────────────────────────┘
           │ Bearer <JWT>
     ┌─────▼──────────────────────────────────────────┐
     │   API Gateway HttpApi (Lambda REQUEST Auth)    │
     │   ┌──────────────────────────────────────────┐ │
     │   │ authorizer.mjs: aws-jwt-verify           │ │
     │   │ RS256 · Midway JWKS · alias extraction   │ │
     │   └──────────────────────────────────────────┘ │
     │   userdata: t8b50k0lwh.execute-api.eu-west-1   │
     │   review:   1jvjxaiuig.execute-api.eu-west-1   │
     │   AI proxy: 706rf9fx5c.execute-api.eu-west-1   │
     └─────┬──────────────────────────────────────────┘
           │
     ┌─────▼──────────────────────────────────────────┐
     │   DynamoDB (PAY_PER_REQUEST)                   │
     │   promo-track-users (userId = alias)           │
     │   promo-track-reviews (sessionId, TTL)         │
     └────────────────────────────────────────────────┘

     ┌────────────────────────────────────────────────┐
     │   EC2 Instance (t3.xlarge) — Ollama fallback   │
     │   3.249.190.229 · Nginx HTTPS → :11434         │
     │   Model: llama3.1:8b                           │
     └────────────────────────────────────────────────┘
```

---

## Deployment Flow

### Primary: Harmony Platform (Frontend)

```bash
# Build for Harmony (outputs to app/ directory with Harmony manifest)
npm run build-harmony-app    # = vite build --outDir app && build-harmony

# Deploy to beta stage
harmony app deploy -s beta

# Deploy to prod
harmony app deploy -s prod
```

**Prod URL:** https://promo-track.harmony.a2z.com  
**Beta URL:** https://promo-track.beta.harmony.a2z.com

### Backend: SAM Stacks (Lambda + API Gateway + DynamoDB)

Both backend services are deployed via AWS SAM. Each has its own `template.yaml` defining:
- HttpApi with CORS (explicit origins) and Lambda REQUEST authorizer
- Authorizer Lambda (Midway JWT verification via aws-jwt-verify)
- Handler Lambdas (Node.js 20, ARM64)
- DynamoDB table

```bash
# Deploy userdata API
cd backend/userdata
sam build
sam deploy    # Uses samconfig.toml defaults (eu-west-1, stack: promo-track-userdata)

# Deploy review API
cd backend/review
sam build
sam deploy    # Uses samconfig.toml defaults (eu-west-1, stack: promo-track-review)
```

**Important:** All API calls require a valid Midway JWT in the `Authorization: Bearer <token>` header. Requests without a token or with an expired/invalid token receive 401/403.

### Legacy/Secondary: AWS Amplify

An `amplify.yml` configuration exists for legacy Amplify deployments:
- Build command: `npm run build`
- Artifacts `baseDirectory`: `app`
- Three-tier cache headers: index.html (no-cache), assets (immutable), fallback (1hr)
- CSP includes `midway-auth.amazon.com` in connect-src
- App ID: `d6iifszd48m8n`

---

## Resources

### 1. Harmony App — Frontend (Primary)

| Property       | Value                                          |
|----------------|------------------------------------------------|
| App Name       | `promo-track`                                  |
| Platform       | Harmony (static hosting)                       |
| Stages         | `beta`, `prod`                                 |
| Prod URL       | https://promo-track.harmony.a2z.com            |
| Beta URL       | https://promo-track.beta.harmony.a2z.com       |
| Build Tool     | Vite 8 + @amzn/harmony-build-tools             |
| Build Command  | `npm run build-harmony-app`                    |
| Bindle         | `amzn1.bindle.resource.p35xcahiumtgmx2r4nwq`   |

### 2. Backend APIs — SAM Stacks

| API | Endpoint | Auth | Stack Name |
|-----|----------|------|------------|
| User Data | `https://t8b50k0lwh.execute-api.eu-west-1.amazonaws.com/prod` | ✅ Midway JWT | promo-track-userdata |
| Review | `https://1jvjxaiuig.execute-api.eu-west-1.amazonaws.com/prod` | ✅ Midway JWT | promo-track-review |
| AI (Bedrock proxy) | `https://706rf9fx5c.execute-api.eu-west-1.amazonaws.com` | ⚠️ None (shared service) | — |

**Authorizer Configuration:**
- Type: Lambda REQUEST
- Runtime: Node.js 20 (ARM64, esbuild)
- JWKS URI: `https://midway-auth.amazon.com/jwks.json`
- Algorithm: RS256
- Audiences: `promo-track.harmony.a2z.com,promo-track.beta.harmony.a2z.com`
- Clock Skew: 30s (default aws-jwt-verify)
- Payload Format: 2.0, `EnableSimpleResponses: false`

**CORS Configuration (both APIs):**
```yaml
AllowOrigins:
  - "https://promo-track.harmony.a2z.com"
  - "https://promo-track.beta.harmony.a2z.com"
  - "http://localhost:5173"
AllowMethods: ["GET", "PUT/POST", "OPTIONS"]
AllowHeaders: ["Authorization", "Content-Type"]
```

### 3. DynamoDB Tables

| Table | Partition Key | TTL | Notes |
|-------|--------------|-----|-------|
| promo-track-users | `userId` (S) — verified alias | — | Userdata persistence |
| promo-track-reviews | `sessionId` (S) | `expiresAt` | Review sessions with auto-expiry |

### 4. EC2 Instance — Ollama AI Backend (Fallback)

| Property        | Value                          |
|-----------------|--------------------------------|
| Instance ID     | `i-0d248919ac611baa4`          |
| Instance Type   | `t3.xlarge` (4 vCPU, 16 GB RAM) |
| Public IP       | `3.249.190.229`                |
| Availability Zone | `eu-west-1c`                 |
| Model           | `llama3.1:8b` (~4.7 GB)       |
| Key Pair        | `promo-track-key`              |

### 5. AWS Amplify App — Frontend (Legacy)

| Property       | Value                                          |
|----------------|------------------------------------------------|
| App ID         | `d6iifszd48m8n`                                |
| Branch         | `main`                                         |
| URL            | https://main.d6iifszd48m8n.amplifyapp.com      |

---

## Access & Operations

### Redeploy frontend (Harmony)
```bash
cd promo-track
npm run build-harmony-app
harmony app deploy -s beta    # or -s prod
```

### Redeploy backend
```bash
cd backend/userdata && sam build && sam deploy
cd backend/review && sam build && sam deploy
```

### SSH into EC2 (Ollama)
```bash
ssh -i ~/.ssh/promo-track-key.pem ec2-user@3.249.190.229
```

### Sync wiki guidelines
```bash
mwinit                # Ensure Midway session is active
npm run sync-wiki     # Fetches wiki → src/content/guidelines-wiki.ts
```

### Test API authentication
```bash
# Get a Midway token (browser-based, or via mwinit + curl)
# Test with token:
curl -H "Authorization: Bearer <token>" \
  https://t8b50k0lwh.execute-api.eu-west-1.amazonaws.com/prod/userdata/<alias>

# Expected results:
# No token → 401
# Valid token, own alias → 200
# Valid token, other alias → 403
# Expired/malformed → 401
```

---

## Troubleshooting

### AuthorizationScopes Gotcha
If you see `"message": "Unauthorized"` on all requests after deploying:
- **Root Cause:** `AuthorizationScopes` property must NOT appear under a Lambda REQUEST authorizer
- SAM/CloudFormation silently enables OAuth-style scope checking when this property exists, causing all requests to fail even with valid tokens
- **Fix:** Remove any `AuthorizationScopes` lines from the HttpApi route Auth configuration in `template.yaml`

### 401 on frontend after deploy
- Verify the `AUDIENCES` environment variable on the authorizer Lambda includes the hostname the user is accessing from
- Check that `.harmony/harmony-metadata.json` CSP `connect-src` includes `midway-auth.amazon.com`

### CORS errors
- Verify `AllowOrigins` in `template.yaml` includes the exact origin (no trailing slash)
- `AllowHeaders` must include `Authorization`

### Stale bundle / old code showing
- `amplify.yml` (and Harmony) set `Cache-Control: no-cache, no-store, must-revalidate` on `index.html`
- Assets under `assets/` are fingerprinted and served with `max-age=31536000, immutable`
- If users report old behavior: hard refresh or check CDN cache

---

## Cost Estimate

| Resource          | Estimated Monthly Cost |
|-------------------|----------------------|
| EC2 t3.xlarge (on-demand, 24/7) | ~$122/month |
| EBS 30 GB gp3     | ~$2.40/month         |
| Harmony Hosting    | Internal (no cost)   |
| API Gateway + Lambda | Minimal (~$1)      |
| DynamoDB (on-demand) | Minimal (~$0.50)   |
| **Total**          | **~$126/month**      |

---

## Security Notes

- All backend APIs authenticated via Midway JWT (RS256)
- CORS locked to explicit origins (no wildcard)
- Ollama EC2 security group still open to 0.0.0.0/0 on ports 443/11434 — consider restricting
- AI proxy (`706rf9fx5c`) does not have JWT auth — shared service, monitored
- CSP in production does NOT include localhost:11434 (removed 2026-07-22)
- Review session URLs use 128-bit UUID secrecy (acceptable for internal tool)
- localStorage data namespaced per verified alias — shared browser profiles are safe

---

## Teardown

To remove all resources:

```bash
# Delete SAM stacks
aws cloudformation delete-stack --stack-name promo-track-userdata --region eu-west-1
aws cloudformation delete-stack --stack-name promo-track-review --region eu-west-1

# Terminate EC2 instance
aws ec2 terminate-instances --instance-ids i-0d248919ac611baa4 --region eu-west-1

# Delete security group (after instance terminates)
aws ec2 delete-security-group --group-id sg-065cd2d8b13cec718 --region eu-west-1

# Delete key pair
aws ec2 delete-key-pair --key-name promo-track-key --region eu-west-1
rm ~/.ssh/promo-track-key.pem

# Delete Amplify app (legacy)
aws amplify delete-app --app-id d6iifszd48m8n --region eu-west-1
```
