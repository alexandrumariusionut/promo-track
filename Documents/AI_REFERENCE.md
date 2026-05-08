# PromoTrack — AI Technical Reference

## Quick Facts
- React 19 + TypeScript 5.9 (strict) + Vite 8 + MUI 7
- Client-side SPA, no backend (except AI proxy)
- All state in React Context + useReducer
- Encrypted localStorage persistence (AES-256-GCM)
- Deployed to AWS Amplify (app ID: d6iifszd48m8n, region: eu-west-1)
- Tests: Vitest + jsdom (32 tests)

## Directory Structure
```
promo-track/
├── src/
│   ├── App.tsx                    # Root: ErrorBoundary → ThemeModeProvider → LockScreen | AppProvider → Router
│   ├── types/index.ts             # ALL type definitions (132 lines)
│   ├── store/
│   │   ├── AppContext.tsx          # State management: 15 actions, activity logging, auto-persist
│   │   ├── storage.ts              # localStorage: encrypt/decrypt, passphrase, lock timer, migration
│   │   └── ThemeContext.tsx         # Dark/light theme toggle
│   ├── utils/
│   │   ├── ai.ts                   # AI: config, allowlist, checkConnection, chat (rate limited)
│   │   ├── crypto.ts               # AES-256-GCM encrypt/decrypt, PBKDF2 key derivation, hashPassphrase
│   │   ├── session.ts              # Portfolio export (encrypted) / import (with migration)
│   │   ├── pdfImport.ts            # GSD PDF parsing: extractPDFText, parseGSDMetrics
│   │   ├── docPreview.ts           # generatePreviewHTML (with data-entry-id, review comments)
│   │   ├── docExport.ts            # generateDocx (Word document generation)
│   │   ├── helpers.ts              # getQuarter, lpCoverage, readinessScore
│   │   ├── starrTemplates.ts       # STARR_TEMPLATES array, createFromTemplate
│   │   ├── emlParser.ts            # parseShoutOutEml (Amazon email parsing)
│   │   └── aiPrompts.ts            # AI prompt builders for gap analysis, scope drafting
│   ├── components/
│   │   ├── ErrorBoundary.tsx        # Class component, wraps entire app
│   │   ├── ErrorSnackbar.tsx        # showError() global function
│   │   ├── UndoSnackbar.tsx         # showUndo() global function
│   │   ├── LockScreen.tsx           # Passphrase setup/unlock + Open Portfolio File
│   │   ├── PageTip.tsx              # Collapsible help tips
│   │   ├── WordCount.tsx            # Word counter for text fields
│   │   ├── GSDScorecard.tsx         # Metrics visualization with Recharts
│   │   ├── layout/Layout.tsx        # Nav sidebar, top bar, import/export in nav
│   │   ├── ai/AIAssistant.tsx       # AI panel: connection check, gap analysis, scope draft
│   │   ├── ai/ImproveSTARRButton.tsx # AI STARR improvement with streaming
│   │   └── starr/
│   │       ├── STARRCard.tsx         # Card with view/edit/duplicate/delete + comment badge
│   │       ├── STARRFormDialog.tsx   # Form: dynamic fields, fieldOrder, fieldLabels, review comments
│   │       └── TemplatePickerDialog.tsx
│   └── pages/
│       ├── DashboardPage.tsx        # Readiness score, LP chart, checklist
│       ├── STARRPage.tsx            # Grid + filters + view dialog + form dialog
│       ├── MetricsPage.tsx          # PDF import, manual add, GSD scorecard
│       ├── ShoutOutsPage.tsx        # EML import, manual add
│       ├── DocumentsPage.tsx        # Export/import portfolio, DOCX, HTML review, comment import
│       ├── ProfilePage.tsx          # User profile form, thresholds, reset
│       ├── TimelinePage.tsx         # Activity log + STARR + shout-outs with filters
│       └── FAQPage.tsx              # Accordion FAQ with 9 categories
├── package.json
├── vite.config.ts                   # React plugin + /api/ai proxy to localhost:11434
├── vitest.config.ts                 # jsdom env, globals, setup file
├── amplify.yml                      # Build config + security headers (CSP, HSTS, etc.)
└── DEPLOYMENT.md                    # AWS resources, SSH commands, costs
```

## Type Definitions (types/index.ts)

### Constants
```typescript
LEADERSHIP_PRINCIPLES = [
  'Customer Obsession', 'Ownership', 'Invent and Simplify', 'Are Right, A Lot',
  'Learn and Be Curious', 'Hire and Develop the Best', 'Insist on the Highest Standards',
  'Think Big', 'Bias for Action', 'Frugality', 'Earn Trust', 'Dive Deep',
  'Have Backbone; Disagree and Commit', 'Deliver Results', 'Strive to be Earth\'s Best Employer',
  'Success and Scale Bring Broad Responsibility'
] // 16 items

CURRENT_VERSION = 2
APP_VERSION = '1.1.0'
DEFAULT_THRESHOLDS = { minStarrEntries: 3, minLPsCovered: 4, minShoutOuts: 2 }
```

### Core Types
```typescript
type LeadershipPrinciple = typeof LEADERSHIP_PRINCIPLES[number]
type JobLevel = 'L3' | 'L4' | 'L5' | 'L6'
type ShoutOutBadge = 'Extra Mile' | 'Helping Hand' | 'Problem Solver' | 'Team Player' | 'Innovator' | 'Other'
```

### Interfaces
```typescript
interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  level: JobLevel;
  targetLevel: JobLevel;
  proposedTitle: string;
  manager: string;
  team: string;
  startDate: string;
  targetPromotionDate: string;
  effectiveQuarter: string;
  steamMember: string;
  steamDirect: string;
  promotionApprover: string;
}

interface CustomField {
  id: string;
  label: string;
  type: 'text' | 'image';
  value: string;
}

interface ReviewComment {
  id: string;
  text: string;
  date: string;
  source: 'manager' | 'engineer';
  resolved?: boolean;
  reply?: string;
}

interface STARREntry {
  id: string;
  title: string;
  situation: string;
  task: string;
  action: string;
  results: string;
  reflection: string;
  principles: LeadershipPrinciple[];
  date: string;
  quarter: string;
  impactLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  evidenceLinks: string[];
  customFields?: CustomField[];
  hiddenFields?: string[];
  reviewComments?: ReviewComment[];
}

interface Metric {
  id: string;
  type: string;
  value: number;
  target: number;
  date: string;
  period: 'weekly' | 'monthly' | 'quarterly';
  notes: string;
  channel: string;
}

interface ShoutOut {
  id: string;
  fromName: string;
  toName: string;
  message: string;
  principles: LeadershipPrinciple[];
  date: string;
  badge: ShoutOutBadge;
  badgeImage?: string;
  type: 'direct' | 'tagged';
}

interface SessionMetadata {
  version: number;
  exportDate: string;
  lastModified: string;
  appVersion: string;
}

interface PortfolioThresholds {
  minStarrEntries: number;
  minLPsCovered: number;
  minShoutOuts: number;
}

interface ActivityLogEntry {
  timestamp: string;
  action: string;
  detail: string;
}

interface AppState {
  profile: UserProfile;
  starr: STARREntry[];
  metrics: Metric[];
  shoutOuts: ShoutOut[];
  scopeOfRole: string;
  bestReasonsNotToPromote: string;
  additionalInfo: string;
  thresholds: PortfolioThresholds;
  activityLog?: ActivityLogEntry[];
}

interface PortfolioFile {
  metadata: SessionMetadata;
  data: AppState;
}
```

## State Management (AppContext.tsx)

### All 15 Actions
```typescript
type Action =
  | { type: 'SET_PROFILE'; payload: UserProfile }           // Updates profile info
  | { type: 'ADD_STARR'; payload: STARREntry }              // Appends to starr[]
  | { type: 'UPDATE_STARR'; payload: STARREntry }           // Replaces by id, detects comment imports
  | { type: 'DELETE_STARR'; payload: string }               // Filters out by id
  | { type: 'ADD_METRIC'; payload: Metric }                 // Appends to metrics[]
  | { type: 'DELETE_METRIC'; payload: string }              // Filters out by id
  | { type: 'IMPORT_METRICS'; payload: Metric[] }           // Appends array to metrics[]
  | { type: 'ADD_SHOUTOUT'; payload: ShoutOut }             // Appends to shoutOuts[]
  | { type: 'DELETE_SHOUTOUT'; payload: string }            // Filters out by id
  | { type: 'SET_SCOPE_OF_ROLE'; payload: string }          // Updates scopeOfRole
  | { type: 'SET_BEST_REASONS'; payload: string }           // Updates bestReasonsNotToPromote
  | { type: 'SET_ADDITIONAL_INFO'; payload: string }        // Updates additionalInfo
  | { type: 'SET_THRESHOLDS'; payload: PortfolioThresholds } // Updates thresholds
  | { type: 'LOAD_STATE'; payload: AppState }               // Replaces entire state, keeps old activityLog
  | { type: 'RESET_STATE'; payload: AppState }              // Replaces state with empty activityLog
```

### State Behavior
- Every action (except RESET_STATE) auto-appends to activityLog
- State auto-persists to encrypted localStorage on every change
- Auto-save interval: 5 minutes
- Activity tracking: click/keydown events refresh lock timer
- UPDATE_STARR detects comment imports by comparing reviewComments length

## Key Patterns

### HTML Review Comment Flow
1. **docPreview.ts** generates HTML with `<h3 data-entry-id="UUID">` per STARR entry
2. **DocumentsPage.tsx** wrapSections() splits on `<h2>` and `<h3>`, wraps each in `.section` with `.comment-box`
3. Exported HTML has self-modifying save: saveFile() serializes current DOM as new HTML download
4. Manager adds comments via addComment() JS → stored in `.comment-box .comments .comment`
5. Existing app comments rendered as `.existing-comment` inside contenteditable div
6. parseReviewComments() only selects `.comment-box .comments .comment` (skips `.existing-comment`)
7. Matching: by `data-entry-id` attribute first, falls back to title.toLowerCase()
8. mergeComments() deduplicates by comment.id (date + text prefix)

### Encryption Flow
- PBKDF2 (100k iterations, SHA-256) derives AES key from passphrase
- Static salt: 'promo-track-v1'
- Random 12-byte IV per encryption
- Storage keys: promo-track-encrypted, promo-track-pass-hash, promo-track-lock-ts
- Lock timeout: 15 minutes
- Portfolio files prefixed with 'PROMO-TRACK-ENC:'

### AI Integration
- Providers: ollama, bedrock, remote
- Default: bedrock with Claude Haiku 4.5 via API Gateway
- Endpoint allowlist: /api/*, localhost, 127.0.0.1, *.amazonaws.com
- Rate limit: 2s between chat() calls
- Config in localStorage: promo-track-ai-config

### STARRFormDialog Field System
- FormState has fieldOrder: string[] and fieldLabels: Record<string, string>
- DEFAULT_STARR_FIELDS: ['situation', 'task', 'action', 'result', 'reflection']
- allFields computed from fieldOrder, merging standard + custom fields
- moveField swaps in fieldOrder array
- setFieldLabel updates fieldLabels for standard, updateCustomField for custom
- **CRITICAL**: Standard field key in form is 'result' (not 'results') — mapped to entry.results in buildEntryFromForm

## Common Modification Patterns

### Adding a new page
1. Create src/pages/NewPage.tsx
2. Add route in App.tsx: `<Route path="/new" element={<NewPage />} />`
3. Add nav item in Layout.tsx

### Adding a new field to AppState
1. Add to interface in types/index.ts
2. Add to defaultState in storage.ts
3. Add action in AppContext.tsx (type + reducer case + log entry)
4. Add migration in migrateState() if needed

### Adding a new STARR field
1. Add to STARREntry interface in types/index.ts
2. Add to FormState in STARRFormDialog.tsx
3. Add to emptyForm() and fromEntry()
4. Add to buildEntryFromForm()
5. Add to view dialog in STARRPage.tsx
6. Add to docPreview.ts and docExport.ts

### Deploying
```bash
npm run build
cd dist && zip -r /tmp/promo-track-dist.zip . -x '*.DS_Store'
aws amplify create-deployment --app-id d6iifszd48m8n --branch-name main --region eu-west-1
curl -T /tmp/promo-track-dist.zip "<zipUploadUrl>"
aws amplify start-deployment --app-id d6iifszd48m8n --branch-name main --job-id <jobId> --region eu-west-1
```

## localStorage Keys
- **promo-track-data**: plaintext state (legacy)
- **promo-track-encrypted**: AES-GCM ciphertext
- **promo-track-pass-hash**: SHA-256 hash of passphrase
- **promo-track-lock-ts**: last activity timestamp
- **promo-track-was-reset**: reset flag
- **promo-track-ai-config**: AI provider config

## Test Files
- **src/utils/__tests__/crypto.test.ts**: 9 tests (encrypt/decrypt round-trips, wrong passphrase, unicode, empty string, hash consistency)
- **src/store/__tests__/storage.test.ts**: 17 tests (passphrase management, lock timer, plaintext/encrypted state, clearAllData, getDefaultState)
- Run: `npm test` / `npm run test:watch` / `npm run test:coverage`

## Known Quirks
- **STARRFormDialog field mapping**: Uses 'result' (singular) in FormState but 'results' (plural) in STARREntry
- FIELD_ROWS uses 'result' key
- fromEntry maps entry.results → form.result; buildEntryFromForm maps form.result → entry.results
- The `any` type in setField was kept because FormState values are mixed types (string, string[], CustomField[])
- DOMPurify is used for HTML export sanitization
- The wrapSections function splits on regex `(?=<h[23])` — lookahead for h2 or h3 tags

## File-Specific Implementation Details

### App.tsx Flow
```
ErrorBoundary → ThemeModeProvider → (unlocked ? AppProvider → Router : LockScreen)
```

### Storage Migration (storage.ts)
- Migrates legacy 'feedback' field to 'shoutOuts'
- Migrates legacy 'minFeedback' threshold to 'minShoutOuts'
- Ensures all Metric fields have defaults
- Seed data includes 4 sample shout-outs

### Crypto Implementation (crypto.ts)
```typescript
// Static salt for key derivation
const SALT = new TextEncoder().encode('promo-track-v1');
const IV_LENGTH = 12;

// PBKDF2 with 100k iterations
async function deriveKey(passphrase: string): Promise<CryptoKey>

// AES-256-GCM with random IV
export async function encrypt(data: string, passphrase: string): Promise<string>
export async function decrypt(encoded: string, passphrase: string): Promise<string>

// SHA-256 hash with salt for verification
export async function hashPassphrase(passphrase: string): Promise<string>
```

### AI Configuration (ai.ts)
```typescript
const DEFAULT_CONFIG: AIConfig = {
  provider: 'bedrock',
  model: 'eu.anthropic.claude-haiku-4-5-20251001-v1:0',
  endpoint: 'https://706rf9fx5c.execute-api.eu-west-1.amazonaws.com',
};

const ALLOWED_ENDPOINTS = [
  /^\/api\//,                              // local proxy
  /^https?:\/\/localhost(:\d+)?\//,        // localhost
  /^https?:\/\/127\.0\.0\.1(:\d+)?\//,    // loopback
  /^https:\/\/[^/]*\.amazonaws\.com/,     // AWS services
];
```

### Build Configuration
- **vite.config.ts**: React plugin + proxy `/api/ai` → `localhost:11434`
- **vitest.config.ts**: jsdom environment, globals enabled, setup file
- **amplify.yml**: CSP headers, HSTS, cache control, security headers

### Dependencies (package.json)
- **React 19** + **TypeScript 5.9** + **Vite 8** + **MUI 7**
- **Recharts** for metrics visualization
- **docx** for Word document generation
- **pdf-parse** + **pdfjs-dist** for PDF import
- **react-hook-form** + **yup** for form validation
- **uuid** for ID generation
- **dayjs** for date handling

This document provides complete technical context for AI assistants to understand and modify the PromoTrack codebase without exploration.