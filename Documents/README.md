# PromoTrack — Promotion Portfolio Builder

🚀 **Live App**: https://main.d6iifszd48m8n.amplifyapp.com

A browser-based tool for Amazon employees to build, track, and export promotion portfolios. No login required, no server storage — all your data is encrypted and stays in your browser.

## What is PromoTrack?

PromoTrack helps you organize your promotion materials in one place:
- Build STARR stories with Leadership Principle mapping
- Import metrics from GSD Scorecard PDFs
- Collect and organize shout-outs
- Track your readiness with a completion dashboard
- Export professional documents for submission
- Collaborate with your manager through review workflows

## Getting Started

1. **Open the app** at the URL above
2. **Set a passphrase** (minimum 6 characters) — this encrypts all your data
3. **Start with Profile** — fill in your employee information
4. **Add content** — create STARR entries, import metrics, collect shout-outs
5. **Check Dashboard** — see your readiness score and identify gaps

## Core Features

### 📊 Dashboard
- **Readiness Score**: 0-100% completion based on your portfolio
- **LP Coverage Chart**: Visual map of Leadership Principles coverage
- **Completion Checklist**: Track progress with customizable thresholds

### 📝 STARR Entries
Create compelling promotion stories using the STARR format:
- **S**ituation: Context and background
- **T**ask: What needed to be done
- **A**ction: What you did
- **R**esults: Measurable outcomes
- **R**eflection: What you learned

**Key Features**:
- Tag with Leadership Principles and impact levels
- Use templates for common scenarios
- **Customize fields**: Rename labels, reorder with arrows, add custom text/image fields, hide unused sections
- **View mode** (👁️ icon): Read-only preview of your stories
- **AI Enhancement**: Use "Format with AI" button for writing improvements

### 👥 Manager Review Workflow
Collaborate seamlessly with your manager:

1. **Export for Review**: Go to Documents → Export HTML
2. **Send to Manager**: Email the HTML file to your manager
3. **Manager Reviews**: They open in any browser, add comments per STARR entry, click 💾 Save File
4. **Get Feedback**: Manager emails the saved file back to you
5. **Import Comments**: Go to Documents → Import Review → select the HTML file
6. **Respond**: Comments appear on STARR cards and in edit dialogs
7. **Resolve**: Mark comments as resolved, add replies
8. **Next Export**: Shows resolved status and your replies

### 📈 Metrics
Track your performance data:
- **Auto-Import**: Upload GSD Scorecard PDFs to extract CPH, AHT, CSAT, ARR automatically
- **Manual Entry**: Add metrics by hand when needed
- **Benchmarks**: Compare against Global and Team performance

### 🎉 Shout-Outs
Organize recognition and feedback:
- **Email Import**: Upload .eml files to extract shout-outs automatically
- **Manual Entry**: Add recognition with badge types
- **LP Mapping**: Connect shout-outs to Leadership Principles

### 📄 Documents & Export
Multiple export options for different needs:
- **Portfolio Backup** (.portfolio): Encrypted backup of all your data
- **Promotion Document** (.docx): Professional template for submission
- **Manager Review** (HTML): Shareable format for feedback collection
- **JSON Backup**: Technical backup format

### 📅 Timeline
Track your portfolio development:
- **Chronological View**: See all activity in order
- **Filtering**: View All, STARR, Shout-Outs, or Activity separately
- **Change Tracking**: Every edit, import, and comment is logged

### 🔒 Security & Privacy
Your data is protected:
- **AES-256-GCM Encryption**: Military-grade encryption for all data
- **Passphrase Required**: Must enter passphrase every time you open the app
- **Encrypted Exports**: .portfolio files are encrypted
- **No Tracking**: No cookies, analytics, or data collection
- **AI Security**: AI calls only go through approved AWS endpoints

### 👤 Opening Someone Else's Portfolio
First-time users can view shared portfolios:
- Select "Open Portfolio File" option
- Choose a .portfolio file
- Enter the file's passphrase to view (read-only)

## Keyboard Shortcuts

- **Enter/Space**: Open STARR cards for editing
- **Tab**: Navigate through all interactive elements
- **Enter**: Submit replies in comment fields

## Tips for Success

1. **Start Early**: Begin building your portfolio months before promotion cycles
2. **Regular Updates**: Add new accomplishments as they happen
3. **Quality over Quantity**: Focus on high-impact stories with clear results
4. **LP Coverage**: Ensure you have examples for multiple Leadership Principles
5. **Get Feedback**: Use the manager review workflow early and often
6. **Backup Regularly**: Export .portfolio files to save your work

## Need Help?

- **FAQ Page**: Check the in-app FAQ for detailed answers
- **View Mode**: Use the eye icon to see how your stories look to others
- **Templates**: Start with STARR templates if you're unsure how to begin

## Technical Details

Built with React 19, TypeScript, Material UI 7, Vite 8, and Vitest for a modern, responsive experience.

---

**Ready to build your promotion portfolio?** [Open PromoTrack](https://main.d6iifszd48m8n.amplifyapp.com) and get started today!