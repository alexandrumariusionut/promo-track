import { Box, Typography, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import { ExpandMore } from '@mui/icons-material';

const FAQ = [
  { q: 'What is PromoTrack?', a: 'PromoTrack is a session-based portfolio builder for employees preparing for promotion. It helps you systematically track accomplishments, demonstrate Leadership Principles, manage metrics, and generate professional promotion documents — all without needing a database or login.' },
  { q: 'Where is my data stored?', a: 'Your data is stored in your browser\'s local storage while you work. When you export a session, it saves to a .portfolio file on your computer. There is no cloud storage or external server — you control your own data.' },
  { q: 'What is a .portfolio file?', a: 'It\'s a JSON file with a .portfolio extension containing all your profile info, STARR entries, metrics, feedback, and narrative sections. You can open it in any text editor, back it up to OneDrive/Google Drive, or share it with your manager.' },
  { q: 'How do I save my work?', a: 'Your work auto-saves to browser storage every time you make a change. For a permanent backup, click "Export" in the top bar to download a .portfolio file. We recommend exporting after every work session.' },
  { q: 'How do I continue working on a previous session?', a: 'Click "Import" in the top bar (or go to Documents page) and select your saved .portfolio file. Everything loads exactly as you left it.' },
  { q: 'What is a STARR entry?', a: 'STARR stands for Situation, Task, Action, Results, and Reflection. It\'s a structured format for documenting specific examples of how you demonstrated Leadership Principles. All fields are optional — fill in what\'s relevant to your example.' },
  { q: 'Do I need to cover all 16 Leadership Principles?', a: 'No. Focus on the LPs most relevant to your role and promotion case. Quality matters more than quantity. A few strong, well-documented examples are better than thin coverage across all 16.' },
  { q: 'How do I import metrics from my GSD Scorecard?', a: 'Go to the Metrics page and click "Import PDF". Select your GSD Scorecard PDF file. The app will extract CPH, AHT, CSAT, Case ARR, and other metrics automatically. You\'ll see a preview where you can select which metrics to import before confirming.' },
  { q: 'What metrics does the PDF import extract?', a: 'It extracts: CPH, AHT, AHT Assist, ACW, CSAT (% of 5\'s), Case ARR, Transfer Rate, Dual Chat Overlap %, Contacts Missed %, Feedbacks Received, DSATs Received, CSAT Rating, plus Global and Team benchmarks for comparison, and weekly trends.' },
  { q: 'Can I add metrics manually?', a: 'Yes. Click "Add Metric" on the Metrics page. You can also import from CSV files with columns: type, value, target, date, period, channel, notes.' },
  { q: 'What does the generated Word document look like?', a: 'It follows the standard Amazon promotion template format with sections: 1) Employee Information table, 2) Scope of Role, 3) Promotion Assessment (metrics tables + STARR narratives with LP tags), 4) Best Reasons Not to Promote, 5) Additional Information, and Feedback Summary with individual feedback sections.' },
  { q: 'Where do I write the Scope of Role and Best Reasons Not to Promote?', a: 'These are on the Profile page. Scroll down past the profile form to find three text editors: Scope of Role, Best Reasons Not to Promote, and Additional Information. Each has a word counter — aim for 300-500 words.' },
  { q: 'What\'s the difference between Export Session and Generate Doc?', a: 'Export Session saves your raw data as a .portfolio file so you can continue working later. Generate Doc creates a formatted Word document (.docx) ready for promotion submission. You\'ll typically export sessions frequently and generate the doc when you\'re ready to submit.' },
  { q: 'Can I edit entries after creating them?', a: 'Yes. STARR entries, feedback entries, and profile information all have edit buttons. For metrics, you can delete individual entries or use the selection checkboxes to bulk-delete, then re-add corrected values.' },
  { q: 'How do I reset and start fresh?', a: 'You can clear your browser\'s local storage, or simply start adding new data — it will overwrite the old. For metrics specifically, use the "Clear All" button. For a complete reset, clear your browser data for localhost:5173.' },
  { q: 'Can I use this offline?', a: 'Yes. Once the app is loaded in your browser, it works entirely offline. All data is stored locally. You only need an internet connection for the initial page load.' },
];

export default function FAQPage() {
  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>Frequently Asked Questions</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Everything you need to know about using PromoTrack to build your promotion portfolio.
      </Typography>
      {FAQ.map((item, i) => (
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
  );
}
