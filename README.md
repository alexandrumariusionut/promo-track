# PromoTrack — Help Your Colleagues Get Promoted

<p align="center">
  <img src="screenshots/17-dashboard-progress.png" alt="PromoTrack Dashboard" width="800">
</p>

**PromoTrack** is a web application I built to help my colleagues navigate the promotion process and reach their next job level. The promotion journey can be overwhelming — documenting achievements, tracking metrics, covering Leadership Principles, getting manager feedback — and most people don't know where to start or how far along they are.

PromoTrack solves this by giving employees a single place to build their promotion portfolio with clear guidance, AI-powered writing assistance, and a structured path from "I want to get promoted" to "here's my complete promotion document."

---

## The Problem It Solves

Getting promoted requires:
- Writing compelling STAR narratives that demonstrate Leadership Principles
- Tracking performance metrics against level expectations
- Getting manager alignment and feedback early
- Generating a promotion document in the correct format
- Knowing which gaps to fill and what "good" looks like at the next level

Most employees struggle with this because the process is scattered across wikis, templates, and tribal knowledge. **PromoTrack brings it all together in one guided experience.**

---

## Key Features

### 📊 Dashboard — Know Where You Stand

A real-time view of your promotion readiness with a Leadership Principles coverage radar chart and a portfolio completion checklist. Set your target promotion date and see a countdown to keep you focused.

<p align="center">
  <img src="screenshots/17-dashboard-progress.png" alt="Dashboard with LP radar chart and completion checklist" width="700">
</p>

### ⭐ STAR Narratives — Build Your Promotion Story

Guided prompts help you write STAR entries across key promotion dimensions: Ambiguity, Scope & Influence, Execution, Problem Complexity, Communication, Impact, and Process Improvement. Start from scratch or use pre-built templates.

<p align="center">
  <img src="screenshots/02-star-narratives-categories.png" alt="STAR Narratives with promotion dimensions" width="700">
</p>

<p align="center">
  <img src="screenshots/03-star-templates.png" alt="Pre-built STAR templates" width="700">
</p>

### 🤖 AI-Powered Writing Improvement

Write your rough draft, then let AI polish it into professional, promotion-ready language. Give custom instructions like "make it longer and more professional" and selectively apply the improvements.

<p align="center">
  <img src="screenshots/05-ai-formatting-dialog.png" alt="AI formatting with custom instructions" width="700">
</p>

<p align="center">
  <img src="screenshots/06-ai-formatted-output.png" alt="AI-formatted STAR entry with selectable sections" width="700">
</p>

### 📈 Metrics Tracking — GSD Scorecard

Import your GSD Scorecard PDF to automatically extract performance metrics. Visual progress bars show green (meeting target) or red (below target) at a glance, so you know exactly where you stand against level expectations.

<p align="center">
  <img src="screenshots/08-metrics-scorecard.png" alt="GSD Scorecard with color-coded metrics" width="700">
</p>

### 📄 Document Generation

Preview and generate your promotion document in the official format — complete with employee information, scope of role, performance strengths, and all your STAR narratives organized by Leadership Principle.

<p align="center">
  <img src="screenshots/09-document-preview.png" alt="Promotion document preview" width="700">
</p>

### 👥 Manager Review Workflow

Share your portfolio with your manager via a single link. They can review each STAR entry and leave feedback directly in the app — no more back-and-forth emails or shared documents.

<p align="center">
  <img src="screenshots/10-share-for-review.png" alt="Share for Review with Outlook integration" width="700">
</p>

<p align="center">
  <img src="screenshots/11-manager-review.png" alt="Manager review interface with comment boxes" width="700">
</p>

### 👤 Profile & Scope of Role

Capture your employee information, management chain, and scope of role — all fields that feed directly into the promotion document.

<p align="center">
  <img src="screenshots/15-profile-page.png" alt="Profile page with employee info and management chain" width="700">
</p>

### ❓ Built-in Guidance

A comprehensive FAQ covering everything from "What should I do first?" to "How many STAR entries do I need?" — organized by category so colleagues can self-serve answers.

<p align="center">
  <img src="screenshots/16-faq-page.png" alt="FAQ page with categorized help" width="700">
</p>

---

## How It Helps People Get Promoted

| Challenge | How PromoTrack Helps |
|-----------|---------------------|
| "I don't know where to start" | Progressive onboarding guides you step by step |
| "I can't write good STAR entries" | Templates + AI formatting turn rough notes into polished narratives |
| "I don't know which LPs I'm missing" | Radar chart shows coverage gaps at a glance |
| "My metrics are scattered" | One-click PDF import from GSD Scorecard |
| "I need manager feedback" | Share link → manager reviews → comments appear in your entries |
| "I don't know what the next level looks like" | Built-in level guidelines (L3→L6) with dimension breakdowns |
| "I need to generate the promo doc" | One-click document generation in the official format |

---

## Tech Stack

- **Frontend:** React 19 + TypeScript + Material UI 7
- **Build:** Vite 8
- **Backend:** AWS SAM (Lambda + DynamoDB + API Gateway)
- **AI:** AWS Bedrock (Claude) for STAR entry improvement
- **Charts:** Recharts for LP coverage radar
- **Documents:** DOCX/PDF generation and parsing

---

## Screenshots Gallery

| Feature | Screenshot |
|---------|-----------|
| Dashboard (empty state) | ![](screenshots/01-dashboard-empty.png) |
| Dashboard (with progress) | ![](screenshots/17-dashboard-progress.png) |
| STAR Narratives | ![](screenshots/02-star-narratives-categories.png) |
| STAR Templates | ![](screenshots/03-star-templates.png) |
| STAR Editor | ![](screenshots/04-star-entry-editor.png) |
| AI Formatting | ![](screenshots/05-ai-formatting-dialog.png) |
| AI Output | ![](screenshots/06-ai-formatted-output.png) |
| STAR Cards | ![](screenshots/07-star-entries-cards.png) |
| Metrics Scorecard | ![](screenshots/08-metrics-scorecard.png) |
| Document Preview | ![](screenshots/09-document-preview.png) |
| Share for Review | ![](screenshots/10-share-for-review.png) |
| Manager Review | ![](screenshots/11-manager-review.png) |
| Review Submission | ![](screenshots/12-manager-review-submit.png) |
| Comments Submitted | ![](screenshots/13-review-submitted.png) |
| Entry with Feedback | ![](screenshots/14-star-with-comments.png) |
| Profile | ![](screenshots/15-profile-page.png) |
| FAQ | ![](screenshots/16-faq-page.png) |

---

## License

Built with ❤️ to help colleagues reach their next level.
