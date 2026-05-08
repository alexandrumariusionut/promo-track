# PromoTrack - High Level Design

**Version:** 4.0  
**Date:** 2026-02-25  
**App Version:** 1.4.0

## 1. Overview

PromoTrack is a browser-based Single Page Application (SPA) designed for Amazon employees to build comprehensive promotion portfolios. The application consolidates STARR entries, metrics, shout-outs, and profile data into a unified platform for career advancement preparation.

### Key Features
- **Portfolio Building**: Comprehensive STARR entry management with templates
- **Readiness Scoring**: Algorithmic assessment of promotion readiness
- **AI-Assisted Writing**: Optional AI integration for content enhancement
- **Document Export**: Multiple formats (DOCX, PDF, HTML, JSON)
- **Manager Review Workflow**: Comment system with resolve/reply functionality
- **Activity Logging**: Complete audit trail of user actions
- **Encrypted Storage**: Client-side data protection with passphrase security
- **Field Customization**: Reorderable fields with custom labels

## 2. Architecture

PromoTrack follows a client-side SPA architecture with all data stored in encrypted localStorage. The application integrates with Amazon Bedrock for AI capabilities through API Gateway and Lambda functions.

### Component Hierarchy
```
ErrorBoundary
└── ThemeModeProvider
    └── LockScreen (conditional)
        └── AppProvider
            └── BrowserRouter
                └── Layout
                    └── Pages (Dashboard, STARR, Metrics, etc.)
```

### AI Integration Flow
```
Client → API Gateway → Lambda → Amazon Bedrock → Response Stream
```

### Hosting
- **Platform**: AWS Amplify
- **Deployment**: Manual via Amplify CLI
- **CDN**: CloudFront distribution

## 3. Tech Stack

### Frontend
- **React**: 19.x with hooks and functional components
- **TypeScript**: 5.9 with strict mode enabled
- **Build Tool**: Vite 8.x
- **UI Framework**: Material-UI (MUI) 7.x
- **Routing**: React Router 7.x
- **Charts**: Recharts for data visualization

### State Management
- **Pattern**: React Context + useReducer
- **Persistence**: Encrypted localStorage

### Testing
- **Framework**: Vitest
- **Testing Library**: React Testing Library
- **Environment**: jsdom

### Document Processing
- **Export**: docx, jsPDF
- **Import**: pdfjs-dist
- **Sanitization**: DOMPurify
- **IDs**: uuid for unique identifiers

## 4. Data Model

### UserProfile Interface
```typescript
interface UserProfile {
  name: string;
  email: string;
  level: string;
  organization: string;
  manager: string;
  startDate: string;
  currentRole: string;
  targetLevel: string;
  targetRole: string;
  yearsAtAmazon: number;
  yearsInRole: number;
  previousRoles: string[];
  skills: string[];
  certifications: string[];
  education: string;
}
```

### CustomField Interface
```typescript
interface CustomField {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'date';
  options?: string[];
  required: boolean;
}
```

### ReviewComment Interface
```typescript
interface ReviewComment {
  id: string;
  text: string;
  date: string;
  source: 'manager' | 'self';
  resolved?: boolean;
  reply?: string;
}
```

### STARREntry Interface
```typescript
interface STARREntry {
  id: string;
  title: string;
  situation: string;
  task: string;
  action: string;
  result: string;
  reflection: string;
  category: string;
  subcategory: string;
  impact: 'low' | 'medium' | 'high';
  timeframe: string;
  skills: string[];
  metrics: string[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
  reviewComments?: ReviewComment[];
}
```

### Metric Interface
```typescript
interface Metric {
  id: string;
  name: string;
  value: number;
  unit: string;
  category: string;
  timeframe: string;
  description: string;
  createdAt: string;
}
```

### ShoutOut Interface
```typescript
interface ShoutOut {
  id: string;
  from: string;
  subject: string;
  content: string;
  date: string;
  category: string;
  impact: 'low' | 'medium' | 'high';
  skills: string[];
  createdAt: string;
}
```

### ActivityLogEntry Interface
```typescript
interface ActivityLogEntry {
  id: string;
  action: string;
  timestamp: string;
  details: Record<string, any>;
}
```

### AppState Interface
```typescript
interface AppState {
  profile: UserProfile;
  starrEntries: STARREntry[];
  metrics: Metric[];
  shoutOuts: ShoutOut[];
  customFields: CustomField[];
  fieldOrder: string[];
  fieldLabels: Record<string, string>;
  settings: AppSettings;
  lastSaved: string;
  activityLog?: ActivityLogEntry[];
}
```

### PortfolioFile Interface
```typescript
interface PortfolioFile {
  version: string;
  data: AppState;
  encrypted: boolean;
  checksum: string;
}
```

## 5. Component Architecture

### App.tsx Structure
```
App
├── ErrorBoundary
│   └── ThemeModeProvider
│       └── LockScreen (conditional)
│           └── AppProvider
│               └── BrowserRouter
│                   └── Layout
│                       └── Routes
```

### Page Components
- **Dashboard**: Overview with readiness score and recent activity
- **STARR**: Entry management with templates and AI assistance
- **Metrics**: Quantitative achievement tracking
- **ShoutOuts**: Recognition and feedback collection
- **Documents**: Export/import functionality
- **Profile**: Personal and professional information
- **Timeline**: Activity log visualization
- **FAQ**: Help documentation with 9 categories

### STARR Components
- **STARRCard**: View/edit/duplicate/delete with comment badge
- **STARRFormDialog**: Dynamic fields with fieldOrder/fieldLabels, review comments with resolve/reply
- **TemplatePickerDialog**: Pre-built STARR templates

### Global Components
- **ErrorBoundary**: Application-level error handling
- **ErrorSnackbar**: Error message display with showError function
- **UndoSnackbar**: Action reversal with showUndo function
- **LockScreen**: Passphrase entry with open portfolio file option

## 6. Page/Feature Map

| Route | Component | Features |
|-------|-----------|----------|
| `/` | Dashboard | Readiness score, recent activity, quick stats |
| `/starr` | STARR | Entry CRUD, templates, AI assistance, comments |
| `/metrics` | Metrics | Quantitative data, charts, CSV import |
| `/shoutouts` | ShoutOuts | Recognition tracking, EML import |
| `/documents` | Documents | Export/import, multiple formats |
| `/profile` | Profile | Personal info, career progression |
| `/timeline` | Timeline | Activity log, audit trail |
| `/faq` | FAQ | Help documentation, 9 categories |

## 7. State Management

### Actions (15 total)
1. `SET_PROFILE` - Update user profile data
2. `ADD_STARR_ENTRY` - Create new STARR entry
3. `UPDATE_STARR_ENTRY` - Modify existing entry
4. `DELETE_STARR_ENTRY` - Remove entry
5. `ADD_METRIC` - Create new metric
6. `UPDATE_METRIC` - Modify existing metric
7. `DELETE_METRIC` - Remove metric
8. `ADD_SHOUT_OUT` - Create new shout-out
9. `UPDATE_SHOUT_OUT` - Modify existing shout-out
10. `DELETE_SHOUT_OUT` - Remove shout-out
11. `UPDATE_SETTINGS` - Modify application settings
12. `SET_FIELD_ORDER` - Reorder form fields
13. `SET_FIELD_LABELS` - Update field labels
14. `IMPORT_DATA` - Load external data
15. `RESET_STATE` - Clear all data (clears activityLog)

### Features
- **Activity Logging**: Every action logged with timestamp and details
- **Auto-Persist**: Encrypted localStorage on every state change
- **Auto-Save**: Automatic save every 5 minutes
- **Lock Timer**: Refresh on user activity

## 8. AI Integration

### Providers
- **ollama**: Local AI models
- **bedrock**: Amazon Bedrock via Lambda
- **remote**: Custom API endpoints

### Configuration
```typescript
interface AIConfig {
  provider: 'ollama' | 'bedrock' | 'remote';
  endpoint: string;
  model: string;
  enabled: boolean;
}
```

### Features
- **Endpoint Allowlist**: Security restriction on AI endpoints
- **Rate Limiting**: 2-second minimum between requests
- **Streaming Support**: Real-time response handling
- **Prompt Builders**: Context-aware prompt generation

## 9. Manager Review Workflow

### Complete Flow
1. **Export HTML**: Generate review document with data-entry-id attributes
2. **Manager Comments**: Manager adds comments to HTML document
3. **Self-Modifying Save**: HTML saves itself with embedded comments
4. **Import Review**: User imports modified HTML file
5. **Match by Entry ID**: Comments matched to entries via data-entry-id
6. **Deduplicate**: Prevent duplicate comment imports
7. **Resolve/Reply**: User can resolve comments and add replies
8. **Re-Export**: Status indicators show comment resolution state

## 10. Import/Export Flows

### Supported Formats
- **Portfolio (.portfolio)**: Encrypted full application state
- **DOCX**: Microsoft Word document export
- **PDF**: Portable document format
- **HTML Review**: Manager review workflow format
- **JSON Backup**: Raw data backup
- **CSV Metrics**: Spreadsheet-compatible metrics
- **EML ShoutOuts**: Email format for recognition
- **PDF GSD Scorecard**: Performance scorecard import

### Export Features
- **Template Selection**: Multiple document templates
- **Custom Formatting**: User-defined layouts
- **Batch Operations**: Multiple format export

## 11. Deployment

### AWS Amplify Deployment
```bash
# Install Amplify CLI
npm install -g @aws-amplify/cli

# Initialize project
amplify init

# Add hosting
amplify add hosting

# Build and deploy
npm run build
amplify publish
```

### Configuration
- **Build Command**: `npm run build`
- **Build Directory**: `dist`
- **Node Version**: 18.x

## 12. Key Design Decisions

### Architecture Decisions
- **Client-Only Storage**: Privacy-first approach, no server-side data
- **No Authentication**: Single-user application model
- **Optional AI**: AI features are enhancement, not requirement
- **Bedrock via Lambda**: Secure AI integration through AWS services

### Technical Decisions
- **Context over Redux**: Simpler state management for single-user app
- **Client-Side Doc Generation**: No server dependency for exports
- **Version-Aware Migrations**: Backward compatibility for data upgrades
- **Entry ID-Based Comment Matching**: Reliable review workflow
- **Self-Modifying HTML**: Innovative manager review solution

## 13. Readiness Scoring Algorithm

### Point Breakdown
- **STARR Entries**: 40 points (8 entries × 5 points each)
- **Metrics**: 20 points (quantitative achievements)
- **ShoutOuts**: 15 points (peer recognition)
- **Profile Completeness**: 15 points (career information)
- **Documentation**: 10 points (export readiness)

### Scoring Logic
```typescript
const calculateReadinessScore = (state: AppState): number => {
  const starrScore = Math.min(state.starrEntries.length * 5, 40);
  const metricsScore = Math.min(state.metrics.length * 2, 20);
  const shoutOutsScore = Math.min(state.shoutOuts.length * 3, 15);
  const profileScore = calculateProfileCompleteness(state.profile);
  const docScore = state.lastSaved ? 10 : 0;
  
  return starrScore + metricsScore + shoutOutsScore + profileScore + docScore;
};
```

## 14. Security

### Data Protection
- **Encryption**: AES-256 encryption for localStorage
- **Passphrase**: User-defined encryption key
- **Allowlist**: Restricted AI endpoint access
- **Sanitization**: DOMPurify for HTML content

### Application Security
- **Rate Limiting**: AI request throttling
- **Error Boundary**: Graceful error handling
- **CSP Headers**: Content Security Policy enforcement
- **Input Validation**: TypeScript strict mode

## 15. Testing

### Test Suite
- **Framework**: Vitest with React Testing Library
- **Coverage**: 26 tests total
  - 9 crypto/encryption tests
  - 17 storage/persistence tests
- **Environment**: jsdom for DOM simulation

### Test Scripts
```json
{
  "test": "vitest",
  "test:ui": "vitest --ui",
  "test:coverage": "vitest --coverage"
}
```

## 16. Accessibility

### WCAG Compliance
- **ARIA Labels**: Screen reader support
- **Keyboard Navigation**: Full keyboard accessibility
- **Semantic Roles**: Proper HTML semantics
- **Color Contrast**: WCAG AA compliance
- **Focus Management**: Logical tab order

### Implementation
- Material-UI built-in accessibility features
- Custom ARIA attributes for complex components
- Screen reader testing with NVDA/JAWS

## 17. Error Handling

### Three-Layer Approach
1. **ErrorBoundary**: Application-level React error boundary
2. **ErrorSnackbar**: User-friendly error messages with showError function
3. **Component-Level**: Try-catch blocks in async operations

### Error Types
- **Validation Errors**: Form input validation
- **Storage Errors**: localStorage/encryption failures
- **AI Errors**: API communication failures
- **Import/Export Errors**: File processing failures

## 18. Future Considerations

### Potential Enhancements
- **DynamoDB Integration**: Cloud-based data persistence
- **Amazon Cognito**: Multi-user authentication
- **Manager Dashboard**: Dedicated manager review interface
- **Push Notifications**: Deadline and milestone reminders
- **Collaborative Editing**: Real-time multi-user editing
- **Mobile App**: React Native companion application
- **Advanced Analytics**: Usage patterns and insights
- **Integration APIs**: Connect with HR systems

### Technical Debt
- **Bundle Size Optimization**: Code splitting and lazy loading
- **Performance Monitoring**: Real user monitoring integration
- **Automated Testing**: E2E test coverage expansion
- **Documentation**: API documentation generation

---

*This document reflects the current state of PromoTrack Version 4.0 as of 2026-02-25. For technical implementation details, refer to the source code and component documentation.*