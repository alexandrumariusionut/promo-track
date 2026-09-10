# PromoTrack — Promotion Portfolio Builder

🚀 **Live App**: https://promo-track.harmony.a2z.com  
🧪 **Beta**: https://promo-track.beta.harmony.a2z.com

A browser-based tool for Amazon employees to build, track, and export promotion portfolios. Authenticated via Midway — your identity is verified server-side and all data is encrypted in your browser, namespaced to your alias.

**Last updated:** 2026-07-29

## What is PromoTrack?

PromoTrack helps you organize your promotion materials in one place:
- Build STAR stories mapped to L4/L5 Role Guidelines
- Import metrics from GSD Scorecard PDFs with resilient layout-aware parsing
- View IC Promotion Guidelines synced live from the wiki
- Track your promotion readiness with deterministic scoring
- Export professional documents for submission
- Collaborate with your manager through authenticated review workflows
- AI coaching that grounds every suggestion in your own words

## Getting Started

1. **Open the app** at the URL above (requires active Midway session)
2. **Set a passphrase** (minimum 6 characters) — this encrypts all your data locally
3. **Start with Profile** — fill in your employee information
4. **Add content** — create STAR entries, import metrics, collect shout-outs
5. **Check Promotion Readiness** — see which Role Guidelines are well-covered

## Core Features

### 📊 Promotion Readiness
- **7 L4 Role Guidelines** from the IC Promotion Wiki's GSD2 Review list (or L5 guidelines for L5 targets)
- **Accordion Cards**: Per-guideline MUI icon, bold lead clause, full guideline text in muted secondary
- **Deterministic scoring**: 0 entries = "No examples yet", 1+ = "Well covered"
- **Segmented progress rail**: 7-part accessible progress bar (solid/dashed for non-color distinction)
- **AI auto-suggest**: Fires silently after narrative save; accept/dismiss chips with quote validation
- **Coach me**: "What could I write for this?" button per guideline
- **Pre-tagged flow**: Empty guidelines offer "Write a narrative for this"
- Footer: "Also valued by reviewers: Mentoring and coaching peers · Handling difficult customer interactions"

### 📝 STAR Entries
Create compelling promotion stories:
- **S**ituation: Context and background
- **T**ask: What needed to be done
- **A**ction: What you did
- **R**esults: Measurable outcomes

**Key Features**:
- Tag entries with Role Guidelines
- Simplified entry dialog (date auto-set)
- AI is an advisor — never judges readiness, only highlights evidence gaps
- Quote validation ensures AI never fabricates claims about your work

### 📈 Metrics (MetricEvolution)
Track your performance trends:
- **Resilient PDF Import**: Layout-aware V2 parser with label-anchored per-KPI extraction, piecewise x-interpolation (recovers ~35% more data points), ISO-week dating
- **Diagnostics**: Returns `{found, missing, warnings}` — renders summary instead of hard-failing
- **Weekly view**: LineChart with axis labels like "W12 · Mar 17–Mar 23"
- **Monthly view**: Ratio metrics show "Approximate — unweighted average of weekly values" with tooltip explaining volume-weighting difference; recommends dashboard for exact figures

### 📖 Guidelines
- Content synced from the IC Promotion Wiki (`npm run sync-wiki`)
- DOMPurify-sanitized rendering with all links opening in new tabs
- Sync-date header shows when content was last refreshed
- "Open live wiki" button for the authoritative source

### 👥 Manager Review Workflow
1. **Share for Review**: Creates authenticated session via backend API
2. **Manager Reviews**: Opens review URL, adds comments per entry (commenter alias captured server-side)
3. **Import Comments**: Resilient matching by ID then title fallback; retry/stash on failures
4. **Unmatched Handling**: After 5 attempts, unmatched comments stashed and surfaced via dialog
5. **Respond**: Comments appear on STAR cards with reply capability

### 🎉 Shout-Outs
- **Email Import**: Upload .eml files to extract shout-outs
- **Manual Entry**: Add recognition with badge types
- **LP Mapping**: Connect shout-outs to Leadership Principles

### 📄 Documents & Export
- **Portfolio Backup** (.portfolio): Encrypted backup of all your data
- **Promotion Document** (.docx): Professional template for submission
- **Manager Review** (HTML): Shareable format for feedback
- **JSON Backup**: Technical backup format

### 🔒 Security & Privacy
- **Midway JWT Authentication**: All API calls authenticated server-side (RS256, aws-jwt-verify)
- **Per-User Isolation**: localStorage namespaced per verified alias — shared browsers are safe
- **AES-256-GCM Encryption**: All data encrypted at rest
- **Locked CORS**: Backend APIs accept only known origins
- **DOMPurify**: All HTML content sanitized before rendering
- **AI Guardrails**: Grounding rules prevent fabrication; client-side quote validation discards ungrounded suggestions
- **No Tracking**: No cookies, analytics, or data collection beyond what Midway provides

## Development

```bash
npm install          # Install dependencies
npm run dev          # Start dev server (localhost, no auth required)
npm test             # Run 157 frontend tests
npm run sync-wiki    # Sync wiki content (requires mwinit)
```

### Deploy Frontend (Harmony)
```bash
npm run build-harmony-app    # vite build --outDir app && build-harmony
harmony app deploy -s beta   # Deploy to beta
harmony app deploy -s prod   # Deploy to prod
```

### Deploy Backend (SAM)
```bash
cd backend/userdata && sam build && sam deploy
cd backend/review && sam build && sam deploy
```

## Tech Stack

Built with React 19, TypeScript 5.9, Material UI 7, Vite 8, Recharts, DOMPurify, Vitest, and aws-jwt-verify. Backend: AWS SAM (Lambda + API Gateway HttpApi + DynamoDB) with Midway JWT authorizers.

---

**Ready to build your promotion portfolio?** [Open PromoTrack](https://promo-track.harmony.a2z.com) and get started today!
