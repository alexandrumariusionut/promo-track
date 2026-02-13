import { Metric } from '../types';
import { v4 as uuid } from 'uuid';

export function parseGSDMetrics(text: string): Metric[] {
  const metrics: Metric[] = [];
  const dateMatch = text.match(/Report Start Date\s+(\d{4}\/\d{2}\/\d{2})/);
  const endDateMatch = text.match(/Report End Date\s+(\d{4}\/\d{2}\/\d{2})/);
  const startDate = dateMatch ? dateMatch[1].replace(/\//g, '-') : new Date().toISOString().split('T')[0];
  const endDate = endDateMatch ? endDateMatch[1].replace(/\//g, '-') : startDate;
  const period = text.includes('Weekly') ? 'weekly' as const : 'monthly' as const;
  const range = `${startDate} to ${endDate}`;

  const add = (type: string, value: number, channel: string, notes = '') => {
    metrics.push({ id: uuid(), type, value, target: 0, date: endDate, period, notes, channel });
  };

  // === TOTAL ROW from "Total 2.86 21.00 20.34 1.49 16 5.32% 8.97% 23.08%" ===
  const totalRow = text.match(/Total\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+(\d+)\s+([\d.]+%)\s+([\d.]+%)\s+([\d.]+%)/);
  if (totalRow) {
    add('CPH', parseFloat(totalRow[1]), 'Total', range);
    add('AHT', parseFloat(totalRow[2]), 'Total', `${range} (minutes)`);
    add('AHT Assist', parseFloat(totalRow[3]), 'Total', 'minutes');
    add('ACW', parseFloat(totalRow[4]), 'Total', 'minutes');
    add('Escalated', parseInt(totalRow[5]), 'Total');
    add('Transfer Rate', parseFloat(totalRow[6]), 'Total');
    add('Dual Chat Overlap %', parseFloat(totalRow[7]), 'Total');
    add('Dual Chat Rate', parseFloat(totalRow[8]), 'Total');
  }

  // === CHANNEL ROWS: "Chat 2.82 21.25 20.76 1.43 16 5.35% 8.97% 23.08%" ===
  const channelPattern = /(Chat|Task|Voice)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+(\d+)\s*([\d.]+%)?\s*([\d.]+%)?\s*([\d.]+%)?/g;
  let cm;
  while ((cm = channelPattern.exec(text)) !== null) {
    const ch = cm[1];
    add('CPH', parseFloat(cm[2]), ch);
    add('AHT', parseFloat(cm[3]), ch, 'minutes');
    add('AHT Assist', parseFloat(cm[4]), ch, 'minutes');
    add('ACW', parseFloat(cm[5]), ch, 'minutes');
    add('Escalated', parseInt(cm[6]), ch);
    if (cm[7]) add('Transfer Rate', parseFloat(cm[7]), ch);
    if (cm[8]) add('Dual Chat Overlap %', parseFloat(cm[8]), ch);
    if (cm[9]) add('Dual Chat Rate', parseFloat(cm[9]), ch);
  }

  // === CSAT from scorecard summary: "86.57%" big number ===
  const csatMatch = text.match(/CSAT\s*\n([\d.]+%)/);
  if (csatMatch) add('CSAT', parseFloat(csatMatch[1]), 'Total', `% of 5's. ${range}`);

  // === CSAT table: "Total 86.57% 85.07% 88.06% 67 2 4.78 4.78" ===
  const csatTableTotal = text.match(/Total\s+([\d.]+%)\s+([\d.]+%)\s+([\d.]+%)\s+(\d+)\s+(\d+)\s+([\d.]+)\s+([\d.]+)/);
  if (csatTableTotal) {
    add('Feedbacks Received', parseInt(csatTableTotal[4]), 'Total');
    add('DSATs Received', parseInt(csatTableTotal[5]), 'Total');
    add('CSAT Rating', parseFloat(csatTableTotal[6]), 'Total', 'Out of 5.0');
  }

  // === CSAT per channel: "Chat 86.57% 85.07% 88.06% 67 2 4.78 4.78" ===
  const csatChannelPattern = /(Chat|Task|Voice)\s+([\d.]+%)\s+([\d.]+%)?\s*([\d.]+%)?\s*(\d+)\s+(\d+)\s*([\d.]+)?\s*([\d.]+)?/g;
  let cc;
  while ((cc = csatChannelPattern.exec(text)) !== null) {
    // Only match in the CSAT section (after "Customer Satisfaction")
    if (text.indexOf(cc[0]) > text.indexOf('Customer Satisfaction')) {
      const ch = cc[1];
      add('CSAT', parseFloat(cc[2]), ch, `% of 5's`);
      add('Feedbacks Received', parseInt(cc[5]), ch);
      add('DSATs Received', parseInt(cc[6]), ch);
      if (cc[7]) add('CSAT Rating', parseFloat(cc[7]), ch);
    }
  }

  // === Case ARR ===
  const arrMatch = text.match(/Case ARR\s*\n([\d.]+%)/);
  if (arrMatch) add('Case ARR', parseFloat(arrMatch[1]), 'Total', range);

  // === Contacts Missed ===
  const missedMatch = text.match(/Contacts Missed\s*\n([\d.]+%)/);
  if (missedMatch) add('Contacts Missed %', parseFloat(missedMatch[1]), 'Total');

  // === GLOBAL/TEAM BENCHMARKS ===
  const benchmarks: [string, RegExp][] = [
    ['Global CPH', /Global CPH\s*\n([\d.]+)/],
    ['Global AHT', /Global AHT\s*\n([\d.]+)/],
    ['Global CSAT', /Global CSAT\s*\n([\d.]+%)/],
    ['Global Case ARR', /Global Case ARR\s*\n([\d.]+%)/],
    ['Global Contacts Missed', /Global Contacts Missed\s*\n([\d.]+%)/],
    ['Team CPH', /Team CPH\s*\n([\d.]+)/],
    ['Team AHT', /Team AHT\s*\n([\d.]+)/],
    ['Team CSAT', /Team CSAT\s*\n([\d.]+%)/],
    ['Team Case ARR', /Team Case ARR\s*\n([\d.]+%)/],
    ['Team Contacts Missed', /Team Contacts Missed\s*\n([\d.]+%)/],
  ];
  for (const [name, regex] of benchmarks) {
    const m = text.match(regex);
    if (m) metrics.push({ id: uuid(), type: name, value: parseFloat(m[1]), target: 0, date: endDate, period, notes: 'Benchmark', channel: 'Benchmark' });
  }

  // === WEEKLY TRENDS ===
  // AHT weekly: "W2 W3 W4 W5 W6 W7" followed by values like "18.56 18.47 18.21 25.47 24.90"
  const extractWeekly = (kpi: string, sectionRegex: RegExp) => {
    const section = text.match(sectionRegex);
    if (!section) return;
    const block = section[0];
    const weekMatches = block.match(/W(\d+)/g);
    const valMatches = block.match(/\d+\.\d+/g);
    if (!weekMatches || !valMatches) return;
    // Filter out week numbers from values
    const weekNums = weekMatches.map((w: string) => w.replace('W', ''));
    const vals = valMatches.filter((v: string) => !weekNums.includes(v));
    // Skip the first value (it's the main KPI value shown above the chart)
    const chartVals = vals.length > weekNums.length ? vals.slice(1) : vals;
    for (let i = 0; i < Math.min(weekNums.length, chartVals.length); i++) {
      metrics.push({
        id: uuid(), type: `${kpi} (Weekly)`, value: parseFloat(chartVals[i]), target: 0,
        date: `${endDate.substring(0, 4)}-W${weekNums[i]}`, period: 'weekly',
        notes: `Week ${weekNums[i]}`, channel: 'Total',
      });
    }
  };

  extractWeekly('AHT', /AHT\n[\d.]+\nW\d[\s\S]*?(?=<\s*\d|Contact Channels|Chat)/);
  extractWeekly('CPH', /CPH\n[\d.]+[\s\S]*?W\d[\s\S]*?(?=Case ARR|AHT\n)/);
  extractWeekly('CSAT', /CSAT\n[\d.]+%\nW\d[\s\S]*?(?=<\s*\d|Contact Channels|Chat)/);
  extractWeekly('Case ARR', /Case ARR\n[\d.]+%[\s\S]*?W\d[\s\S]*?(?=<\s*\d|Contacts Missed)/);

  return metrics;
}

export async function extractPDFText(file: File): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let text = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map((item: any) => item.str).join('\n') + '\n';
  }
  return text;
}
