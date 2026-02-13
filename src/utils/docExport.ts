import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell,
  WidthType, AlignmentType, BorderStyle, PageBreak,
} from 'docx';
import { saveAs } from 'file-saver';
import { AppState, LEADERSHIP_PRINCIPLES, LeadershipPrinciple, STARREntry, Metric, Project, FeedbackEntry, Goal } from '../types';
import { lpCoverage, readinessScore } from './helpers';

const BORDER = { style: BorderStyle.SINGLE, size: 1, color: '000000' };
const BORDERS = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER };

function cell(text: string, bold = false, width?: number) {
  return new TableCell({
    children: [new Paragraph({ children: [new TextRun({ text, bold, size: 20, font: 'Calibri' })] })],
    borders: BORDERS,
    ...(width ? { width: { size: width, type: WidthType.PERCENTAGE } } : {}),
  });
}

function heading(text: string, level = HeadingLevel.HEADING_1) {
  return new Paragraph({ text, heading: level, spacing: { before: 300, after: 100 } });
}

function para(text: string, bold = false) {
  return new Paragraph({
    children: [new TextRun({ text, bold, size: 22, font: 'Calibri' })],
    spacing: { after: 120 },
  });
}

function emptyPara() {
  return new Paragraph({ children: [new TextRun({ text: '', size: 22 })], spacing: { after: 60 } });
}

export async function generateDocx(state: AppState) {
  const { profile, starr, metrics, projects, feedback, goals, scopeOfRole, bestReasonsNotToPromote, additionalInfo } = state;
  const coverage = lpCoverage(starr);

  const children: (Paragraph | Table)[] = [];

  // ===== 1. EMPLOYEE INFORMATION =====
  children.push(new Paragraph({
    children: [new TextRun({ text: '1. EMPLOYEE INFORMATION', bold: true, size: 24, font: 'Calibri' })],
    spacing: { after: 200 },
  }));

  children.push(new Table({
    rows: [
      new TableRow({ children: [
        cell('Employee Name:', true, 18), cell(profile.name, false, 15),
        cell('Current Job Title:', true, 18), cell(profile.role, false, 15),
        cell('Effective Quarter:', true, 18), cell(profile.effectiveQuarter, false, 16),
      ]}),
      new TableRow({ children: [
        cell('Manager Name:', true), cell(profile.manager),
        cell('Proposed Job Title:', true), cell(profile.proposedTitle),
        cell('Proposed Level:', true), cell(profile.targetLevel),
      ]}),
      new TableRow({ children: [
        cell('Steam Member:', true), cell(profile.steamMember),
        cell('Current Business Title:', true), cell(profile.role),
        cell('Time in Level:', true), cell(profile.startDate ? calculateTenure(profile.startDate) : ''),
      ]}),
      new TableRow({ children: [
        cell('Steam Direct:', true), cell(profile.steamDirect),
        cell('Proposed Business Title:', true), cell(profile.proposedTitle),
        cell('Promotion Approver:', true), cell(profile.promotionApprover),
      ]}),
    ],
    width: { size: 100, type: WidthType.PERCENTAGE },
  }));

  children.push(emptyPara());

  // ===== 2. SCOPE OF ROLE =====
  children.push(new Paragraph({
    children: [new TextRun({ text: '2. SCOPE OF ROLE', bold: true, size: 24, font: 'Calibri' })],
    spacing: { before: 300, after: 100 },
  }));
  children.push(new Paragraph({
    children: [new TextRun({ text: 'The scope of role section should be written as it would apply to any person in this role. (500 words or fewer are recommended)', italics: true, size: 20, font: 'Calibri', color: '666666' })],
    spacing: { after: 100 },
  }));
  if (scopeOfRole) {
    scopeOfRole.split('\n').forEach((line: string) => { if (line.trim()) children.push(para(line)); });
  }
  children.push(emptyPara());

  // ===== 3. PROMOTION ASSESSMENT =====
  children.push(new Paragraph({
    children: [new TextRun({ text: '3. PROMOTION ASSESSMENT', bold: true, size: 24, font: 'Calibri' })],
    spacing: { before: 300, after: 100 },
  }));
  children.push(new Paragraph({
    children: [new TextRun({ text: 'Describe how the employee has performed at the next level; provide examples of how they demonstrate our Leadership Principles.', italics: true, size: 20, font: 'Calibri', color: '666666' })],
    spacing: { after: 200 },
  }));

  // Metrics summary paragraph
  if (metrics.length > 0) {
    const personalMetrics = metrics.filter((m: Metric) => m.channel !== 'Benchmark');
    if (personalMetrics.length > 0) {
      children.push(para('Metrics and performance:', true));
      children.push(emptyPara());

      const find = (type: string, channel = 'Total') => metrics.find((m: Metric) => m.type === type && m.channel === channel);
      const bench = (prefix: string, type: string) => metrics.find((m: Metric) => m.type === `${prefix} ${type}` && m.channel === 'Benchmark');
      const fmt = (m: Metric | undefined, pct = false) => m ? `${m.value}${pct ? '%' : ''}` : '—';
      const isPct = (type: string) => ['CSAT', 'Case ARR', 'Transfer Rate', 'Dual Chat Overlap %', 'Dual Chat Rate', 'Contacts Missed %'].includes(type);

      // --- KPI Summary Table ---
      const kpis: { label: string; type: string; pct: boolean; lowerBetter: boolean }[] = [
        { label: 'CPH', type: 'CPH', pct: false, lowerBetter: false },
        { label: 'AHT (minutes)', type: 'AHT', pct: false, lowerBetter: true },
        { label: 'ACW (minutes)', type: 'ACW', pct: false, lowerBetter: true },
        { label: 'CSAT (% of 5\'s)', type: 'CSAT', pct: true, lowerBetter: false },
        { label: 'Case ARR', type: 'Case ARR', pct: true, lowerBetter: false },
        { label: 'Contacts Missed', type: 'Contacts Missed %', pct: true, lowerBetter: true },
        { label: 'Dual Chat Overlap %', type: 'Dual Chat Overlap %', pct: true, lowerBetter: false },
        { label: 'CSAT Rating', type: 'CSAT Rating', pct: false, lowerBetter: false },
      ];

      const kpiRows = [
        new TableRow({ children: [
          cell('Metric', true), cell('Value', true), cell('Global Avg', true), cell('Team Avg', true), cell('vs Global', true),
        ]}),
        ...kpis.filter(k => find(k.type)).map(k => {
          const m = find(k.type)!;
          const g = bench('Global', k.type);
          const t = bench('Team', k.type);
          const diff = g ? (k.lowerBetter ? g.value - m.value : m.value - g.value) : 0;
          const diffStr = g ? (diff > 0 ? `+${diff.toFixed(2)}` : diff.toFixed(2)) : '—';
          return new TableRow({ children: [
            cell(k.label, true), cell(fmt(m, k.pct)), cell(g ? fmt(g, k.pct) : '—'), cell(t ? fmt(t, k.pct) : '—'), cell(diffStr),
          ]});
        }),
      ];
      children.push(new Table({ rows: kpiRows, width: { size: 100, type: WidthType.PERCENTAGE } }));
      children.push(emptyPara());

      // --- Contact Channels Breakdown Table ---
      const channels = ['Total', 'Chat', 'Task', 'Voice'];
      const channelTypes = ['CPH', 'AHT', 'AHT Assist', 'ACW', 'Escalated', 'Transfer Rate', 'Dual Chat Overlap %', 'Dual Chat Rate'];
      const hasChannelData = channels.some(ch => channelTypes.some(t => find(t, ch)));
      if (hasChannelData) {
        children.push(para('Contact Channels Breakdown:', true));
        const chRows = [
          new TableRow({ children: [
            cell('Channel', true), cell('CPH', true), cell('AHT', true), cell('AHT Assist', true),
            cell('ACW', true), cell('Escalated', true), cell('Transfer Rate', true),
            cell('Dual Chat Overlap %', true),
          ]}),
          ...channels.filter(ch => find('CPH', ch) || find('AHT', ch)).map(ch => new TableRow({ children: [
            cell(ch, ch === 'Total'),
            cell(fmt(find('CPH', ch))),
            cell(fmt(find('AHT', ch))),
            cell(fmt(find('AHT Assist', ch))),
            cell(fmt(find('ACW', ch))),
            cell(fmt(find('Escalated', ch))),
            cell(find('Transfer Rate', ch) ? `${find('Transfer Rate', ch)!.value}%` : '—'),
            cell(find('Dual Chat Overlap %', ch) ? `${find('Dual Chat Overlap %', ch)!.value}%` : '—'),
          ]})),
        ];
        children.push(new Table({ rows: chRows, width: { size: 100, type: WidthType.PERCENTAGE } }));
        children.push(emptyPara());
      }

      // --- Customer Satisfaction Table ---
      const hasCsatData = channels.some(ch => find('CSAT', ch) || find('Feedbacks Received', ch));
      if (hasCsatData) {
        children.push(para('Customer Satisfaction:', true));
        const csatRows = [
          new TableRow({ children: [
            cell('Channel', true), cell('% of 5\'s', true), cell('Feedbacks Received', true),
            cell('DSATs Received', true), cell('CSAT Rating', true),
          ]}),
          ...channels.filter(ch => find('CSAT', ch) || find('Feedbacks Received', ch)).map(ch => new TableRow({ children: [
            cell(ch, ch === 'Total'),
            cell(find('CSAT', ch) ? `${find('CSAT', ch)!.value}%` : '—'),
            cell(fmt(find('Feedbacks Received', ch))),
            cell(fmt(find('DSATs Received', ch))),
            cell(fmt(find('CSAT Rating', ch))),
          ]})),
        ];
        children.push(new Table({ rows: csatRows, width: { size: 100, type: WidthType.PERCENTAGE } }));
        children.push(emptyPara());
      }
    }
  }

  // STARR entries grouped by title (each as a section like the template)
  starr.forEach((entry: STARREntry) => {
    children.push(new Paragraph({
      children: [new TextRun({ text: entry.title, bold: true, size: 22, font: 'Calibri' })],
      spacing: { before: 200, after: 60 },
    }));
    children.push(new Paragraph({
      children: [
        new TextRun({ text: 'Leadership Principle(s): ', bold: true, size: 20, font: 'Calibri' }),
        new TextRun({ text: entry.principles.join(', '), italics: true, size: 20, font: 'Calibri' }),
      ],
      spacing: { after: 100 },
    }));
    // Combine STARR into a narrative paragraph (matching the template style)
    const narrative = [entry.situation, entry.task, entry.action, entry.results, entry.reflection]
      .filter(Boolean).join(' ');
    children.push(para(narrative));
    children.push(emptyPara());
  });

  // ===== 4. BEST REASONS NOT TO PROMOTE =====
  children.push(new Paragraph({
    children: [new TextRun({ text: '4. BEST REASONS NOT TO PROMOTE', bold: true, size: 24, font: 'Calibri' })],
    spacing: { before: 300, after: 100 },
  }));
  children.push(new Paragraph({
    children: [new TextRun({ text: "At the time of promotion, it's expected that an employee will have some areas for growth at the next level. (500 words or fewer are recommended)", italics: true, size: 20, font: 'Calibri', color: '666666' })],
    spacing: { after: 100 },
  }));
  if (bestReasonsNotToPromote) {
    bestReasonsNotToPromote.split('\n').forEach((line: string) => { if (line.trim()) children.push(para(line)); });
  }
  children.push(emptyPara());

  // ===== 5. KEY PROJECTS =====
  if (projects.length > 0) {
    children.push(new Paragraph({
      children: [new TextRun({ text: '5. KEY PROJECTS & ACCOMPLISHMENTS', bold: true, size: 24, font: 'Calibri' })],
      spacing: { before: 300, after: 100 },
    }));
    projects.forEach((p: Project) => {
      children.push(para(`${p.title} (${p.status})`, true));
      if (p.description) children.push(para(p.description));
      if (p.impact) children.push(para(`Impact: ${p.impact}`));
      if (p.outcomes.length) p.outcomes.forEach((o: string) => children.push(para(`• ${o}`)));
      children.push(emptyPara());
    });
  }

  // ===== 6. ADDITIONAL INFORMATION =====
  children.push(new Paragraph({
    children: [new TextRun({ text: '6. ADDITIONAL INFORMATION (optional)', bold: true, size: 24, font: 'Calibri' })],
    spacing: { before: 300, after: 100 },
  }));
  if (additionalInfo) {
    additionalInfo.split('\n').forEach((line: string) => { if (line.trim()) children.push(para(line)); });
  }
  children.push(emptyPara());

  // ===== FEEDBACK SUMMARY TABLE =====
  if (feedback.length > 0) {
    children.push(new Paragraph({
      children: [new TextRun({ text: 'Feedback Summary', bold: true, size: 22, font: 'Calibri' })],
      spacing: { before: 200, after: 100 },
    }));

    const fbRows = [
      new TableRow({ children: [
        cell('Provider', true), cell('Relationship', true), cell('Support promotion', true),
      ]}),
      ...feedback.map((f: FeedbackEntry) => new TableRow({ children: [
        cell(`${f.fromName}${f.fromTitle ? '  ' + f.fromTitle : ''}`),
        cell(f.relationship),
        cell(f.supportsPromotion ? 'Yes, I support' : 'No'),
      ]})),
    ];
    children.push(new Table({ rows: fbRows, width: { size: 100, type: WidthType.PERCENTAGE } }));
    children.push(emptyPara());

    // Individual feedback sections
    children.push(new Paragraph({ children: [new TextRun({ text: '', size: 22 })], pageBreakBefore: true }));
    feedback.forEach((f: FeedbackEntry) => {
      children.push(new Table({
        rows: [
          new TableRow({ children: [
            cell('FEEDBACK', true), cell(''),
          ]}),
          new TableRow({ children: [
            cell('Feedback Provider:', true), cell(f.fromName),
          ]}),
          new TableRow({ children: [
            cell('BUSINESS TITLE & JOB LEVEL:', true), cell(f.fromTitle),
          ]}),
          new TableRow({ children: [
            cell('Relationship to Candidate:', true), cell(f.relationship),
          ]}),
          new TableRow({ children: [
            cell('FEEDBACK PROVIDER STEAM:', true), cell(f.steamDirect),
          ]}),
          new TableRow({ children: [
            cell('Support Promotion?', true), cell(f.supportsPromotion ? 'Yes' : 'No'),
          ]}),
          new TableRow({ children: [
            cell('DATE OF FEEDBACK:', true), cell(f.date),
          ]}),
        ],
        width: { size: 100, type: WidthType.PERCENTAGE },
      }));
      children.push(para('Reasons to support: (250 words or less are recommended)', true));
      children.push(para(f.content));
      children.push(para('Reasons not to support: (250 words or less are recommended)', true));
      children.push(para(f.reasonsNotToSupport || ''));
      children.push(emptyPara());
    });
  }

  // ===== GOALS =====
  if (goals.length > 0) {
    children.push(heading('Development Goals'));
    goals.forEach((g: Goal) => {
      children.push(para(`${g.title} [${g.category}] — ${g.status} (${g.progress}%)`, true));
      if (g.description) children.push(para(g.description));
    });
  }

  const doc = new Document({ sections: [{ children }] });
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${profile.name.replace(/\s+/g, '_')}_${profile.level}_to_${profile.targetLevel}_Promotion.docx`);
}

function calculateTenure(startDate: string): string {
  const start = new Date(startDate);
  const now = new Date();
  const months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  const years = Math.floor(months / 12);
  const rem = months % 12;
  if (years > 0) return `${years} year${years > 1 ? 's' : ''} ${rem} month${rem !== 1 ? 's' : ''}`;
  return `${rem} month${rem !== 1 ? 's' : ''}`;
}

function buildMetricsSummary(personal: Metric[], benchmarks: Metric[]): string {
  const parts: string[] = [];
  const byType = new Map<string, Metric[]>();
  personal.filter((m: Metric) => m.channel === 'Total').forEach((m: Metric) => {
    if (!byType.has(m.type)) byType.set(m.type, []);
    byType.get(m.type)!.push(m);
  });

  const getBenchmark = (type: string, prefix: string) => {
    const b = benchmarks.find((m: Metric) => m.type === `${prefix} ${type}`);
    return b ? b.value : null;
  };

  for (const [type, ms] of byType) {
    const latest = ms[ms.length - 1];
    const globalVal = getBenchmark(type, 'Global');
    const teamVal = getBenchmark(type, 'Team');
    let line = `${type}: ${latest.value}${type.includes('%') || type === 'CSAT' || type === 'Case ARR' ? '%' : ''}`;
    if (globalVal !== null) line += ` (Global avg: ${globalVal}${type.includes('%') || type === 'CSAT' || type === 'Case ARR' ? '%' : ''})`;
    if (teamVal !== null) line += ` (Team avg: ${teamVal}${type.includes('%') || type === 'CSAT' || type === 'Case ARR' ? '%' : ''})`;
    if (latest.notes) line += `. ${latest.notes}`;
    parts.push(line);
  }
  return parts.join('. ') + '.';
}
