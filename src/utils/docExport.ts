import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, BorderStyle, ShadingType,
} from 'docx';
import { saveAs } from 'file-saver';
import { AppState, STAREntry, Metric } from '../types';


const BRAND = '1a237e';
const LIGHT_BG = 'f0f4ff';
const BORDER = { style: BorderStyle.SINGLE, size: 1, color: 'cccccc' };
const BORDERS = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER };

function sectionHeader(text: string) {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size: 26, font: 'Calibri', color: 'ffffff' })],
    spacing: { before: 300, after: 0 },
    shading: { type: ShadingType.SOLID, color: BRAND, fill: BRAND },
  });
}

function subHeader(text: string) {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size: 22, font: 'Calibri', color: BRAND })],
    spacing: { before: 200, after: 80 },
  });
}

function hint(text: string) {
  return new Paragraph({
    children: [new TextRun({ text, italics: true, size: 18, font: 'Calibri', color: '888888' })],
    spacing: { after: 100 },
  });
}

function para(text: string, bold = false) {
  return new Paragraph({
    children: [new TextRun({ text, bold, size: 20, font: 'Calibri' })],
    spacing: { after: 100 },
  });
}

function emptyPara() {
  return new Paragraph({ children: [new TextRun({ text: '', size: 16 })], spacing: { after: 40 } });
}

function infoCell(text: string, isLabel = false, width?: number) {
  return new TableCell({
    children: [new Paragraph({ children: [new TextRun({ text, bold: isLabel, size: 18, font: 'Calibri', color: isLabel ? BRAND : '333333' })] })],
    borders: BORDERS,
    shading: isLabel ? { type: ShadingType.SOLID, color: LIGHT_BG, fill: LIGHT_BG } : undefined,
    ...(width ? { width: { size: width, type: WidthType.PERCENTAGE } } : {}),
  });
}

function brandHeaderRow(cols: string[]) {
  return new TableRow({
    children: cols.map(text =>
      new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text, bold: true, size: 18, font: 'Calibri', color: 'ffffff' })] })],
        shading: { type: ShadingType.SOLID, color: BRAND, fill: BRAND },
        borders: BORDERS,
        verticalAlign: 'center' as const,
      })
    ),
  });
}

function dataRow(cells: string[]) {
  return new TableRow({
    children: cells.map(text =>
      new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text, size: 18, font: 'Calibri' })] })],
        borders: BORDERS,
        verticalAlign: 'center' as const,
      })
    ),
  });
}

export async function generateDocx(state: AppState) {
  const { profile, star, metrics, scopeOfRole, bestReasonsNotToPromote, additionalInfo } = state;
  const children: (Paragraph | Table)[] = [];

  // ===== 1. EMPLOYEE INFORMATION =====
  children.push(sectionHeader('  1. EMPLOYEE INFORMATION'));
  children.push(emptyPara());

  children.push(new Table({
    rows: [
      new TableRow({ children: [
        infoCell('Employee Name', true, 18), infoCell(profile.name, false, 15),
        infoCell('Current Job Title', true, 18), infoCell(profile.role, false, 15),
        infoCell('Effective Quarter', true, 18), infoCell(profile.effectiveQuarter, false, 16),
      ]}),
      new TableRow({ children: [
        infoCell('Manager Name', true), infoCell(profile.manager),
        infoCell('Proposed Job Title', true), infoCell(profile.proposedTitle),
        infoCell('Proposed Level', true), infoCell(profile.targetLevel),
      ]}),
      new TableRow({ children: [
        infoCell('Steam Member', true), infoCell(profile.steamMember),
        infoCell('Current Business Title', true), infoCell(profile.role),
        infoCell('Time in Level', true), infoCell(profile.startDate ? calculateTenure(profile.startDate) : ''),
      ]}),
      new TableRow({ children: [
        infoCell('Steam Direct', true), infoCell(profile.steamDirect),
        infoCell('Proposed Business Title', true), infoCell(profile.proposedTitle),
        infoCell('Promotion Approver', true), infoCell(profile.promotionApprover),
      ]}),
    ],
    width: { size: 100, type: WidthType.PERCENTAGE },
  }));
  children.push(emptyPara());

  // ===== 2. SCOPE OF ROLE =====
  children.push(sectionHeader('  2. SCOPE OF ROLE'));
  children.push(hint('The scope of role section should be written as it would apply to any person in this role. (500 words or fewer)'));
  if (scopeOfRole) {
    scopeOfRole.split('\n').forEach((line: string) => { if (line.trim()) children.push(para(line)); });
  }
  children.push(emptyPara());

  // ===== 3. PROMOTION ASSESSMENT =====
  children.push(sectionHeader('  3. PROMOTION ASSESSMENT'));
  children.push(hint('Describe how the employee has performed at the next level; provide examples of how they demonstrate our Leadership Principles.'));

  // Performance Strengths Table (green metrics only)
  if (metrics.length > 0) {
    const MIN_THRESHOLD_TYPES = ['CSAT', 'Case ARR', 'Dual Chat Overlap %', 'Custom'];
    const L4_NARRATIVES: Record<string, string> = {
      'CPH': 'Within L4 target — efficient live chat resolution.',
      'AHT': 'Meets L4 target — efficient problem resolution.',
      'ACW': 'Within target — efficient contact wrap-up.',
      'CSAT': 'Exceeds L4 target — strong customer skills.',
      'Case ARR': 'Exceeds L4 target — first contact resolution.',
      'Dual Chat Overlap %': 'Meets L4 target — handles multiple chats.',
      'Transfer Rate': 'Within L4 target — minimal escalations.',
      'Contacts Missed %': 'Within target — reliable availability.',
      'Custom': 'Meets expectations — consistent quality.',
    };

    const greenMetrics = metrics
      .filter((m: Metric) => m.period === 'monthly' && m.channel === 'Total' && m.target > 0)
      .filter((m: Metric) => {
        const hib = MIN_THRESHOLD_TYPES.includes(m.type);
        return hib ? m.value >= m.target : m.value <= m.target;
      });

    if (greenMetrics.length > 0) {
      children.push(subHeader('Performance Strengths'));
      children.push(para('Metrics at or above L4 expectations:'));

      children.push(new Table({
        rows: [
          brandHeaderRow(['Metric', 'Value', 'Target', 'L4 Relevance']),
          ...greenMetrics.map(m => {
            const label = m.notes ? m.notes.split(' — ')[0] : m.type;
            const cmp = MIN_THRESHOLD_TYPES.includes(m.type) ? '≥' : '≤';
            const narr = L4_NARRATIVES[m.type] || 'Meets L4 expectations.';
            return dataRow([label, `${m.value}`, `${cmp} ${m.target}`, narr]);
          }),
        ],
        width: { size: 100, type: WidthType.PERCENTAGE },
      }));
      children.push(emptyPara());
    }
  }

  // STAR entries
  star.forEach((entry: STAREntry) => {
    children.push(subHeader(entry.title));
    children.push(new Paragraph({
      children: [
        new TextRun({ text: 'Leadership Principle(s): ', bold: true, size: 18, font: 'Calibri', color: BRAND }),
        new TextRun({ text: entry.principles.join(', '), italics: true, size: 18, font: 'Calibri' }),
      ],
      spacing: { after: 80 },
    }));
    const narrative = [entry.situation, entry.task, entry.action, entry.results].filter(Boolean).join(' ');
    children.push(para(narrative));
    children.push(emptyPara());
  });

  // ===== 4. BEST REASONS NOT TO PROMOTE =====
  children.push(sectionHeader('  4. BEST REASONS NOT TO PROMOTE'));
  children.push(hint("At the time of promotion, it's expected that an employee will have some areas for growth at the next level. (500 words or fewer)"));
  if (bestReasonsNotToPromote) {
    bestReasonsNotToPromote.split('\n').forEach((line: string) => { if (line.trim()) children.push(para(line)); });
  }
  children.push(emptyPara());

  // ===== 5. ADDITIONAL INFORMATION =====
  children.push(sectionHeader('  5. ADDITIONAL INFORMATION (optional)'));
  children.push(emptyPara());
  if (additionalInfo) {
    additionalInfo.split('\n').forEach((line: string) => { if (line.trim()) children.push(para(line)); });
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
