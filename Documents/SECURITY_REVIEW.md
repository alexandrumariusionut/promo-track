# PromoTrack Security Design Document

**Version:** 6.0  
**Date:** 2026-02-25  
**Application Version:** 1.4.0  
**Overall Risk Rating:** LOW  

## 1. Executive Summary

PromoTrack is a client-side single-page application (SPA) designed to handle employee promotion tracking data, including Personally Identifiable Information (PII) and confidential performance data. The application implements comprehensive security controls including AES-256-GCM encryption for all data at rest, passphrase-protected access with lock screen functionality, and a manager review workflow with secure comment exchange.

All sensitive data is encrypted using industry-standard cryptographic algorithms before storage in the browser's local storage. The application enforces strict input validation, output sanitization, and implements multiple layers of security controls to protect against common web application vulnerabilities.

## 2. Data Classification

| Data Type | Classification | Encrypted at Rest | Description |
|-----------|---------------|-------------------|-------------|
| Employee PII | Confidential | ✅ | Names, employee IDs, manager information |
| STARR Entries | Confidential | ✅ | Performance data, achievements, project details |
| Performance Metrics | Confidential | ✅ | Ratings, scores, evaluation data |
| Shout-outs | Internal | ✅ | Recognition and praise entries |
| Review Comments | Confidential | ✅ | Manager feedback and review discussions |
| Exported Files | Confidential | ✅ | Portfolio exports with encryption marker |
| AI Configuration | Internal | ✅ | Endpoint URLs, rate limiting settings |

## 3. Security Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Error Boundary                          │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                Browser Environment                    │  │
│  │  ┌─────────────┐    ┌─────────────────────────────┐   │  │
│  │  │ Lock Screen │───▶│        PromoTrack App       │   │  │
│  │  │             │    │  ┌─────────────────────────┐ │   │  │
│  │  │ Passphrase  │    │  │   Encrypted Storage    │ │   │  │
│  │  │ Validation  │    │  │   AES-256-GCM          │ │   │  │
│  │  └─────────────┘    │  └─────────────────────────┘ │   │  │
│  │                     │  ┌─────────────────────────┐ │   │  │
│  │                     │  │   AI Endpoint Allowlist │ │   │  │
│  │                     │  │   Rate Limiting         │ │   │  │
│  │                     │  └─────────────────────────┘ │   │  │
│  │                     │  ┌─────────────────────────┐ │   │  │
│  │                     │  │   File I/O Security     │ │   │  │
│  │                     │  │   Import/Export Guards  │ │   │  │
│  │                     │  └─────────────────────────┘ │   │  │
│  │                     └─────────────────────────────────┘   │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## 4. Implemented Security Controls

### 4.1 Encryption at Rest
- **Algorithm:** AES-256-GCM with PBKDF2 key derivation
- **Key Derivation:** 100,000 iterations with static salt
- **IV Generation:** Cryptographically secure random IV per encryption operation
- **Storage:** All sensitive data encrypted before localStorage persistence
- **Key Management:** Derived from user passphrase, not stored

### 4.2 Encrypted Portfolio Export/Import
- **Export Format:** PROMO-TRACK-ENC: prefix marker for encrypted files
- **Passphrase Protection:** User-defined passphrase for export encryption
- **Legacy Support:** Maintains compatibility with previous export formats
- **Import Validation:** Automatic detection of encrypted vs. plaintext imports

### 4.3 Passphrase Lock Screen
- **Setup Flow:** Initial passphrase creation with confirmation
- **Unlock Mechanism:** Passphrase verification before app access
- **Portfolio File Integration:** Direct file opening with passphrase prompt
- **Activity Tracking:** Session management without automatic lockout
- **No Lockout Policy:** Prevents denial of service from failed attempts

### 4.4 AI Endpoint Allowlist
- **Patterns:** 4 approved endpoint URL patterns
- **Enforcement Points:** 3 validation checkpoints in AI request flow
- **Validation:** Strict URL matching against allowlist
- **Rejection Handling:** Clear error messages for blocked endpoints

### 4.5 AI Rate Limiting
- **Throttle Period:** 2-second minimum between chat() function calls
- **Implementation:** Client-side rate limiting with timestamp tracking
- **Error Messaging:** User-friendly rate limit exceeded notifications
- **DoS Prevention:** Protects against rapid API consumption

### 4.6 Input Validation
- **Title Validation:** Required field validation for all entries
- **XSS Prevention:** Title field sanitization against script injection
- **File Size Limits:** 2MB for images, 5MB for document imports
- **Data Type Validation:** Strict type checking on all inputs

### 4.7 HTML Sanitization
- **Library:** DOMPurify for HTML content sanitization
- **Scope:** Applied to preview rendering and export generation
- **XSS Protection:** Removes malicious scripts and unsafe HTML
- **Content Preservation:** Maintains formatting while ensuring security

### 4.8 File Import Security
- **Size Validation:** Enforced limits prevent resource exhaustion
- **Prototype Pollution Guard:** Object.create(null) for safe parsing
- **Schema Validation:** Strict validation against expected data structure
- **Default Merging:** Safe property merging with validation
- **PDF Processing:** Bundled PDF worker for secure document parsing

### 4.9 Review Comment Security
- **Entry ID Matching:** Comments linked only to valid entry IDs
- **Deduplication:** Comment ID-based deduplication prevents duplicates
- **Class Separation:** existing-comment class isolation
- **Selector Restriction:** Only .comment-box .comments elements parsed
- **Content Validation:** Comment content validation before processing

### 4.10 HTTP Security Headers
- **CSP:** Content Security Policy with restricted sources
- **X-Frame-Options:** DENY to prevent clickjacking
- **X-Content-Type-Options:** nosniff to prevent MIME confusion
- **Referrer-Policy:** strict-origin-when-cross-origin
- **Permissions-Policy:** Restricted feature access

### 4.11 Error Boundary
- **Coverage:** React Error Boundary wrapping entire application
- **Fallback UI:** User-friendly error display instead of white screen
- **Error Isolation:** Prevents cascading failures
- **Recovery Options:** Graceful degradation with user actions

### 4.12 Consistent Error Handling
- **ErrorSnackbar:** Centralized error notification system
- **Error Pattern:** instanceof Error validation throughout codebase
- **Type Safety:** Zero any types for improved error detection
- **User Experience:** Consistent error messaging and recovery

### 4.13 Source Code Hygiene
- **Type Safety:** Zero any types enforced across codebase
- **Debug Cleanup:** No console.log statements in production
- **Test Data:** Fictional seed data only, no real PII
- **TypeScript:** No @ts-ignore directives, proper type definitions

### 4.14 Dependency Security
- **Automated Scanning:** npm audit integrated in CI pipeline
- **Package Assessment:** Risk levels assigned to all dependencies
- **Update Policy:** Regular security updates for vulnerable packages
- **Role Documentation:** Clear security roles for each dependency

## 5. STRIDE Threat Analysis

| Threat | Category | Mitigation | Status |
|--------|----------|------------|--------|
| Data theft from storage | Spoofing | AES-256-GCM encryption | ✅ Mitigated |
| Unauthorized app access | Spoofing | Passphrase lock screen | ✅ Mitigated |
| PII data modification | Tampering | Encryption + input validation | ✅ Mitigated |
| Malicious script injection | Tampering | XSS sanitization + DOMPurify | ✅ Mitigated |
| Export data interception | Information Disclosure | Encrypted export format | ✅ Mitigated |
| AI endpoint abuse | Information Disclosure | Endpoint allowlist + rate limiting | ✅ Mitigated |
| Malicious file import | Tampering | File guards + size limits | ✅ Mitigated |
| Comment injection attacks | Tampering | Comment deduplication + validation | ✅ Mitigated |
| DoS via rapid AI calls | Denial of Service | Client-side rate limiting | ✅ Mitigated |
| Application crashes | Denial of Service | Error boundary + error handling | ✅ Mitigated |
| Privilege escalation | Elevation of Privilege | Client-side only, no server privileges | ✅ Not Applicable |
| Session hijacking | Spoofing | No network sessions, local-only | ✅ Not Applicable |

## 6. Data Flow Security

### Storage Flow
```
User Input → Validation → Encryption (AES-256-GCM) → localStorage
```

### Portfolio Export
```
Encrypted Data → Decryption → Re-encryption (User Passphrase) → File Download
```

### Portfolio Import
```
File Upload → Format Detection → Decryption → Validation → Storage
```

### AI Flow
```
User Request → Endpoint Validation → Rate Limit Check → API Call → Response Sanitization
```

### HTML Review Flow
```
Comment Data → Entry ID Validation → Deduplication → Class Separation → DOM Insertion
```

### Document Export
```
Portfolio Data → Template Processing → DOMPurify Sanitization → PDF/DOCX Generation
```

## 7. Residual Risks

| Risk | Impact | Likelihood | Mitigation Status |
|------|--------|------------|-------------------|
| SHA-256 hash collision | Medium | Very Low | Accepted - cryptographically secure |
| Static salt usage | Low | N/A | Accepted - single-user application |
| No audit logging | Medium | N/A | Accepted - client-side limitation |
| Unencrypted DOCX/PDF exports | Medium | Low | Accepted - user awareness required |
| PII exposure to AI services | High | Low | Accepted - user controlled |
| EML regex bypass | Low | Low | Accepted - validation sufficient |
| unsafe-inline CSP directive | Low | Very Low | Accepted - required for functionality |
| Legacy plaintext import support | Medium | Low | Accepted - backward compatibility |
| Title sanitization regex limitations | Low | Low | Accepted - DOMPurify provides backup |
| Client-side rate limiting bypass | Low | Medium | Accepted - user impact only |

## 8. Compliance Posture

| Control | Implementation | Status |
|---------|---------------|--------|
| Encryption at Rest | AES-256-GCM | ✅ Compliant |
| Encryption in Transit | HTTPS only | ✅ Compliant |
| Access Control | Passphrase protection | ✅ Compliant |
| Input Validation | Multi-layer validation | ✅ Compliant |
| Output Sanitization | DOMPurify + XSS protection | ✅ Compliant |
| Security Headers | CSP + security headers | ✅ Compliant |
| Dependency Scanning | npm audit in CI | ✅ Compliant |
| PII in Source Code | Fictional data only | ✅ Compliant |
| Data Deletion | User-controlled deletion | ✅ Compliant |
| Rate Limiting | AI endpoint throttling | ✅ Compliant |
| Type Safety | Zero any types | ✅ Compliant |
| Test Coverage | Comprehensive testing | ✅ Compliant |
| Error Handling | Consistent error patterns | ✅ Compliant |

## 9. Future Recommendations

1. **AWS Cognito Integration:** Implement centralized authentication
2. **DynamoDB Migration:** Move from localStorage to encrypted cloud storage
3. **API Gateway Authentication:** Add server-side request validation
4. **Audit Logging:** Implement comprehensive activity logging
5. **Encrypted Export Formats:** Extend encryption to DOCX/PDF exports
6. **Passphrase Rate Limiting:** Add server-side brute force protection
7. **Per-User Salt Generation:** Implement unique salts per user
8. **Role-Based Access Control:** Add granular permission system
9. **Security Monitoring:** Implement real-time security event monitoring
10. **Penetration Testing:** Regular third-party security assessments

## 10. Security File Map

| File | Security Role | Description |
|------|---------------|-------------|
| `crypto.ts` | Encryption Core | AES-256-GCM implementation, key derivation |
| `storage.ts` | Secure Storage | Encrypted localStorage interface |
| `LockScreen.tsx` | Access Control | Passphrase validation and setup |
| `App.tsx` | Security Orchestration | Main security control integration |
| `AppContext.tsx` | State Security | Secure state management |
| `session.ts` | Session Management | Activity tracking and session control |
| `ai.ts` | AI Security | Endpoint allowlist and rate limiting |
| `pdfImport.ts` | File Security | PDF import validation and processing |
| `DocumentsPage.tsx` | Comment Security | Comment parsing and HTML export |
| `STARRFormDialog.tsx` | Input Validation | Form input sanitization |
| `ErrorBoundary.tsx` | Error Containment | Application error isolation |
| `ErrorSnackbar.tsx` | Error Handling | Consistent error messaging |
| `Layout.tsx` | UI Security | Security header integration |
| `amplify.yml` | Deployment Security | Build-time security configuration |

---

**Document Classification:** Internal Use  
**Next Review Date:** 2026-08-25  
**Approved By:** Security Team  
**Document Owner:** PromoTrack Development Team