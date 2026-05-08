import { Box, Typography, Accordion, AccordionSummary, AccordionDetails, Chip } from '@mui/material';
import { ExpandMore } from '@mui/icons-material';

interface FAQItem { q: string; a: string; }
interface FAQCategory { label: string; color: 'primary' | 'secondary' | 'success' | 'warning' | 'info' | 'error'; items: FAQItem[]; }

const FAQ_CATEGORIES: FAQCategory[] = [
  {
    label: 'Getting Started',
    color: 'primary',
    items: [
      { q: 'What is Promo Tracker?', a: 'Promo Tracker is a browser-based portfolio builder for employees preparing for promotion. It helps you track STAR entries and metrics — then generates a formatted Word document ready for submission. No login or server required.' },
      { q: 'What should I do first?', a: 'Start with the Profile page — fill in your employee information and management chain. Then write your Scope of Role narrative. After that, begin adding STAR entries for your strongest examples. The Dashboard will guide you on what\'s missing.' },
      { q: 'What does the Dashboard show?', a: 'The Dashboard shows your LP Coverage as a radar chart, a Portfolio Completion tracker with a progress bar and checklist, an editable promotion countdown timer, a collapsible app walkthrough video, and a Recent Activity feed showing your latest actions.' },
      { q: 'What is the promotion countdown?', a: 'On the Dashboard, the Portfolio Completion panel includes an editable promotion target date. Click on it to set your target date — it will show a countdown of days remaining. This helps you stay on track.' },
    ],
  },
  {
    label: 'Guidelines',
    color: 'info',
    items: [
      { q: 'What is the Guidelines tab?', a: 'The Guidelines tab contains the full ITSE Promotion Wiki content, including the promotion process, timeline, performance targets, STAR method guidance, writing tips, scope of role templates, leveling guidelines, and FAQs from the official wiki. It\'s a reference to help you understand what\'s expected at each level.' },
      { q: 'Does the Guidelines page support dark mode?', a: 'Yes, the Guidelines page fully adapts to your selected theme (light or dark).' },
    ],
  },
  {
    label: 'STAR Entries',
    color: 'info',
    items: [
      { q: 'What is a STAR entry?', a: 'STAR stands for Situation, Task, Action, and Results. It\'s a structured format for documenting specific examples of how you demonstrated Leadership Principles. Each entry can be tagged with one or more LPs.' },
      { q: 'How many STAR entries do I need?', a: 'Quality matters more than quantity — a few strong, detailed examples with clear impact are better than many thin ones.' },
      { q: 'Do I need to fill in every STAR field?', a: 'No. All fields are optional. Fill in what\'s relevant to your example. At minimum, a title, the Action section, and at least one LP tag will make a useful entry.' },
      { q: 'Do I need to cover all 16 Leadership Principles?', a: 'No. Focus on the LPs most relevant to your role and promotion case. The Dashboard LP Coverage chart helps you see which ones you\'ve demonstrated and where gaps exist.' },
      { q: 'Can I use templates for STAR entries?', a: 'Yes. When creating a new STAR entry, you can select from pre-built templates that provide structure and prompts for common scenarios like project delivery, operational improvement, and mentoring.' },
      { q: 'What are review comments on STAR entries?', a: 'Review comments are notes from your manager (or yourself) attached to individual STAR entries. They help you collaborate on improving your entries before the promotion document is finalized. Comments can be marked as resolved and include replies.' },
    ],
  },
  {
    label: 'Metrics & GSD Scorecard',
    color: 'warning',
    items: [
      { q: 'How do I import metrics from my GSD Scorecard?', a: 'Go to the Metrics page and click "Import PDF". Select your GSD Scorecard PDF. The app extracts CPH, AHT, CSAT, Case ARR, and other metrics automatically. You\'ll see a preview to select which metrics to import before confirming.' },
      { q: 'What metrics does the PDF import extract?', a: 'It extracts: CPH, AHT, AHT Assist, ACW, CSAT (% of 5\'s), Case ARR, Transfer Rate, Dual Chat Overlap %, Contacts Missed %, Feedbacks Received, DSATs Received, CSAT Rating, plus Global and Team benchmarks and weekly trends.' },
      { q: 'Can I add metrics manually?', a: 'Yes. Click "Add Metric" on the Metrics page. You can enter any metric type, value, target, date, period, channel, and notes.' },
      { q: 'How are benchmark metrics used?', a: 'Benchmark metrics (Global/Team) are imported alongside your personal metrics for comparison. The Metrics page shows them separately so you can see how your performance compares to team and global averages.' },
    ],
  },
  {
    label: 'Manager Review Workflow',
    color: 'primary',
    items: [
      { q: 'How does the Share for Review feature work?', a: 'From the Documents page, click "Share as HTML" to export your promotion document as an interactive HTML file. Send this to your manager — they can add comments directly on each STAR entry in the HTML file, then send it back to you.' },
      { q: 'How do I import my manager\'s feedback?', a: 'On the Documents page, click "Import Review" and select the HTML file your manager returned. Their comments will be automatically matched to your STAR entries by ID and added as review comments.' },
      { q: 'Are review comments included in the final document?', a: 'No. Review comments are collaboration notes between you and your manager. They appear on your STAR entries for reference but are hidden from the document preview and excluded from the generated Word document.' },
    ],
  },
  {
    label: 'Document Generation',
    color: 'error',
    items: [
      { q: 'What does the generated Word document contain?', a: 'It follows the standard promotion template: 1) Employee Information table, 2) Scope of Role, 3) Promotion Assessment with metrics tables and STAR narratives with LP tags, 4) Best Reasons Not to Promote, and 5) Additional Information.' },
      { q: 'What\'s the difference between Export and Generate Doc?', a: 'Export saves your raw data as a .portfolio file to continue working later. Generate Doc creates a formatted Word document (.docx) ready for promotion submission. Export frequently; generate the doc when you\'re ready to submit.' },
      { q: 'Where do I write Scope of Role and Best Reasons Not to Promote?', a: 'These are on the Profile page. Scroll past the profile form to find three text editors: Scope of Role, Best Reasons Not to Promote, and Additional Information. Each has a word counter — aim for 300-500 words.' },
      { q: 'Can I edit the generated document?', a: 'Yes. The .docx file opens in Word or Google Docs where you can make final edits, adjust formatting, or add content before submitting.' },
    ],
  },
  {
    label: 'Timeline',
    color: 'secondary',
    items: [
      { q: 'What does the Timeline page show?', a: 'The Timeline page displays a unified chronological view of all your STAR entries and activity log events. You can filter by type and entries are grouped by month.' },
    ],
  },
  {
    label: 'Saving & Data',
    color: 'success',
    items: [
      { q: 'Where is my data stored?', a: 'All data lives in your browser\'s local storage. There is no cloud server or database. You own and control your data entirely.' },
      { q: 'How do I save my work?', a: 'Your work auto-saves to browser storage on every change. For a permanent backup, click "Export" in the top bar to download a .portfolio file. We recommend exporting after every session.' },
      { q: 'What is a .portfolio file?', a: 'A JSON file with a .portfolio extension containing your entire portfolio: profile, STAR entries, metrics, and narratives. You can back it up anywhere or share it with your manager.' },
      { q: 'How do I continue a previous session?', a: 'Click "Import" in the top bar and select your saved .portfolio file. Everything loads exactly as you left it.' },
      { q: 'Can I use this offline?', a: 'Yes. Once loaded in your browser, Promo Tracker works entirely offline. All data is stored locally. You only need internet for the initial page load.' },
      { q: 'How do I reset and start fresh?', a: 'Clear your browser\'s local storage for this site, or open DevTools → Application → Local Storage and delete the promo-track-data key. For metrics specifically, use the "Clear All" button on the Metrics page.' },
    ],
  },
  {
    label: 'Security & Privacy',
    color: 'success',
    items: [
      { q: 'Is my data secure?', a: 'When deployed on Harmony, access is protected by Midway authentication. Your portfolio data is stored in your browser\'s local storage and is only accessible to you.' },
      { q: 'Is my data sent to any server?', a: 'Your portfolio data never leaves your browser unless you explicitly use the AI features. AI requests go through AWS (Amazon Bedrock) and stay within the AWS network. No analytics, cookies, or tracking are used.' },
    ],
  },
  {
    label: 'AI Features',
    color: 'info',
    items: [
      { q: 'What can the AI assistant do?', a: 'The AI can analyze your portfolio for gaps, draft Scope of Role sections, and improve your STAR entries to be more concise and action-oriented. It uses Amazon Bedrock (Claude) and works directly from the Dashboard and STAR pages.' },
      { q: 'Why do I see "Please wait a moment" when using AI?', a: 'There is a 2-second cooldown between AI requests to prevent accidental double-clicks and excessive API usage. Wait a moment and try again.' },

    ],
  },
  {
    label: 'Customization & Accessibility',
    color: 'warning',
    items: [
      { q: 'Can I customize STAR entry fields?', a: 'Yes. In the STAR form, you can hide standard fields you don\'t need, add custom text fields or image fields, reorder fields with the up/down arrows, and rename field labels. Your customizations are saved with each entry.' },
      { q: 'Can I use the app with a keyboard only?', a: 'Yes. STAR cards, template items, and all interactive elements support keyboard navigation. Press Enter or Space to activate cards and buttons. All icon buttons have screen reader labels.' },
      { q: 'Does the app support dark mode?', a: 'Yes. Use the theme toggle in the top navigation bar to switch between light and dark mode. Your preference is saved automatically.' },
      { q: 'What happens if something goes wrong?', a: 'The app has built-in error handling. If a page crashes, you\'ll see a friendly error screen with a Reload button instead of a blank page. Errors during operations like file imports show a notification at the bottom of the screen.' },
    ],
  },
];

export default function FAQPage() {
  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>FAQ & Help</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Everything you need to know about using PromoTrack to build your promotion portfolio.
      </Typography>
      {FAQ_CATEGORIES.map(cat => (
        <Box key={cat.label} sx={{ mb: 3 }}>
          <Chip label={cat.label} color={cat.color} sx={{ mb: 1, fontWeight: 600 }} />
          {cat.items.map((item, i) => (
            <Accordion key={i} disableGutters>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography sx={{ fontWeight: 600 }}>{item.q}</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body2">{item.a}</Typography>
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      ))}
    </Box>
  );
}
