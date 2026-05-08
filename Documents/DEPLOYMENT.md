# PromoTrack — AWS Deployment Document

**Date:** 2026-02-20  
**Region:** eu-west-1 (Ireland)  
**Account:** 029465354181  
**Deployed by:** marindru-Isengard

---

## Architecture Overview

```
┌──────────────────────────────────┐
│         End Users (Browser)      │
└──────────┬───────────────────────┘
           │
     ┌─────▼──────────────────────────────┐
     │   AWS Amplify Hosting              │
     │   https://main.d6iifszd48m8n      │
     │          .amplifyapp.com           │
     │   (React SPA — static files)       │
     └─────┬──────────────────────────────┘
           │ HTTPS (port 443)
     ┌─────▼──────────────────────────────┐
     │   EC2 Instance (t3.xlarge)         │
     │   3.249.190.229                    │
     │                                    │
     │   ┌─────────────────────────────┐  │
     │   │ Nginx (HTTPS reverse proxy) │  │
     │   │ :443 → localhost:11434      │  │
     │   └─────────────┬───────────────┘  │
     │   ┌─────────────▼───────────────┐  │
     │   │ Ollama (llama3.1:8b)        │  │
     │   │ :11434                      │  │
     │   └─────────────────────────────┘  │
     └────────────────────────────────────┘
```

---

## Resources Created

### 1. AWS Amplify App — Frontend

| Property       | Value                                          |
|----------------|------------------------------------------------|
| App Name       | `promo-track`                                  |
| App ID         | `d6iifszd48m8n`                                |
| Branch         | `main`                                         |
| Platform       | WEB (static hosting)                           |
| URL            | https://main.d6iifszd48m8n.amplifyapp.com      |
| Build Tool     | Vite (pre-built locally, manual deploy)        |
| SPA Redirect   | All non-file routes → `/index.html` (status 200) |

### 2. EC2 Instance — Ollama AI Backend

| Property        | Value                          |
|-----------------|--------------------------------|
| Instance ID     | `i-0d248919ac611baa4`          |
| Instance Type   | `t3.xlarge` (4 vCPU, 16 GB RAM) |
| AMI             | `ami-09c20105c9b62f893` (Amazon Linux 2023) |
| Public IP       | `3.249.190.229`                |
| Availability Zone | `eu-west-1c`                 |
| VPC             | `vpc-0025510a3c048928f` (default) |
| Subnet          | `subnet-0211e598abc8615c0`     |
| Root Volume     | 30 GB gp3                     |
| Key Pair        | `promo-track-key`              |
| Key File        | `~/.ssh/promo-track-key.pem`   |

**Software installed via user-data:**
- Ollama (systemd service, listening on `0.0.0.0:11434`)
- Model: `llama3.1:8b` (~4.7 GB)
- Nginx (HTTPS reverse proxy on port 443 with self-signed certificate)
- CORS headers enabled for cross-origin requests from Amplify

### 3. Security Group

| Property    | Value                              |
|-------------|------------------------------------|
| Group ID    | `sg-065cd2d8b13cec718`             |
| Group Name  | `promo-track-ollama-sg`            |
| Description | Ollama API server for PromoTrack   |

**Inbound Rules:**

| Port  | Protocol | Source    | Description |
|-------|----------|-----------|-------------|
| 22    | TCP      | 0.0.0.0/0 | SSH         |
| 443   | TCP      | 0.0.0.0/0 | HTTPS (Nginx → Ollama) |
| 11434 | TCP      | 0.0.0.0/0 | Ollama API (direct) |

### 4. Key Pair

| Property  | Value                          |
|-----------|--------------------------------|
| Key Name  | `promo-track-key`              |
| Location  | `~/.ssh/promo-track-key.pem`   |
| Permissions | `400`                        |

---

## Code Changes

### `src/utils/ai.ts`

Default AI endpoint changed from local Vite proxy to remote EC2:

```typescript
// Before
const DEFAULT_CONFIG: AIConfig = {
  provider: 'ollama',
  model: 'llama3.1:8b',
  endpoint: '/api/ai',
};

// After
const DEFAULT_CONFIG: AIConfig = {
  provider: 'remote',
  model: 'llama3.1:8b',
  endpoint: 'https://3.249.190.229/api',
};
```

---

## Access & Operations

### SSH into EC2
```bash
ssh -i ~/.ssh/promo-track-key.pem ec2-user@3.249.190.229
```

### Check Ollama status
```bash
curl -sk https://3.249.190.229/api/tags
```

### Restart Ollama
```bash
ssh -i ~/.ssh/promo-track-key.pem ec2-user@3.249.190.229 \
  "sudo systemctl restart ollama"
```

### Pull a different model
```bash
ssh -i ~/.ssh/promo-track-key.pem ec2-user@3.249.190.229 \
  "ollama pull <model-name>"
```

### Redeploy frontend
```bash
cd promo-track
npm run build
cd dist && zip -r /tmp/promo-track-dist.zip . -x '*.DS_Store'
# Then use Amplify create-deployment + start-deployment CLI commands
```

---

## Cost Estimate

| Resource          | Estimated Monthly Cost |
|-------------------|----------------------|
| EC2 t3.xlarge (on-demand, 24/7) | ~$122/month |
| EBS 30 GB gp3     | ~$2.40/month         |
| Amplify Hosting    | Free tier (up to 5 GB served/month) |
| Data Transfer      | Minimal (~$0)        |
| **Total**          | **~$125/month**      |

> 💡 To reduce costs: stop the EC2 instance when not in use, or switch to a smaller instance type if performance allows.

---

## Security Notes

- Ollama API is exposed to `0.0.0.0/0` — consider restricting the security group to known IPs
- Nginx uses a self-signed SSL certificate — browsers will show a warning on direct API access
- SSH is open to `0.0.0.0/0` — consider restricting to your IP
- No authentication on the Ollama API — anyone with the IP can use it
- The app's `ALLOWED_ENDPOINTS` whitelist permits `*.amazonaws.com` and the EC2 IP

---

## Teardown

To remove all resources:

```bash
# Terminate EC2 instance
aws ec2 terminate-instances --instance-ids i-0d248919ac611baa4 --region eu-west-1

# Delete security group (after instance terminates)
aws ec2 delete-security-group --group-id sg-065cd2d8b13cec718 --region eu-west-1

# Delete key pair
aws ec2 delete-key-pair --key-name promo-track-key --region eu-west-1
rm ~/.ssh/promo-track-key.pem

# Delete Amplify app
aws amplify delete-app --app-id d6iifszd48m8n --region eu-west-1
```
