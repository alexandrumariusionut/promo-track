import { AppState, STAREntry, Metric } from '../types';

const BRAND = '#1a237e';
const LIGHT_BG = '#f0f4ff';

function sectionHeader(num: string, title: string) {
  return `<div style="background:${BRAND};color:white;padding:10px 16px;margin:24px 0 12px 0;font-size:16px;font-weight:700">${num}. ${title}</div>`;
}

function subHeader(text: string) {
  return `<h3 style="color:${BRAND};font-size:15px;margin:20px 0 8px 0;font-weight:700">${text}</h3>`;
}

function hint(text: string) {
  return `<p style="color:#888;font-style:italic;font-size:12px;margin:0 0 12px 0">${text}</p>`;
}

function brandTable(headers: string[], rows: string[][]) {
  let html = `<table style="width:100%;border-collapse:collapse;margin:12px 0;border:1px solid #ccc">`;
  html += `<tr>${headers.map(h => `<th style="background:${BRAND};color:white;padding:8px;text-align:left;font-size:13px">${h}</th>`).join('')}</tr>`;
  for (const row of rows) {
    html += `<tr>${row.map(c => `<td style="padding:8px;border-bottom:1px solid #eee;font-size:13px">${c}</td>`).join('')}</tr>`;
  }
  html += '</table>';
  return html;
}

export function generatePreviewHTML(state: AppState, { includeComments = true } = {}): string {
  const { profile, star, metrics, scopeOfRole, bestReasonsNotToPromote, additionalInfo } = state;

  let html = '<div style="font-family:Calibri,sans-serif;max-width:800px;margin:0 auto;font-size:14px;line-height:1.6">';

  // 1. Employee Info
  html += sectionHeader('1', 'EMPLOYEE INFORMATION');
  html += `<table style="width:100%;border-collapse:collapse;margin-bottom:16px;border:1px solid #ccc">`;
  const row = (pairs: [string, string][]) => '<tr>' + pairs.map(([k, v]) =>
    `<td style="background:${LIGHT_BG};border:1px solid #ccc;padding:6px 10px;font-weight:700;color:${BRAND};font-size:12px;white-space:nowrap">${k}</td>` +
    `<td style="border:1px solid #ccc;padding:6px 10px;font-size:13px">${v || '—'}</td>`
  ).join('') + '</tr>';
  html += row([['Employee Name', profile.name], ['Current Job Title', profile.role], ['Effective Quarter', profile.effectiveQuarter]]);
  html += row([['Manager Name', profile.manager], ['Proposed Job Title', profile.proposedTitle], ['Proposed Level', profile.targetLevel]]);
  html += row([['Steam Member', profile.steamMember], ['Current Business Title', profile.role], ['Time in Level', profile.startDate || '—']]);
  html += row([['Steam Direct', profile.steamDirect], ['Proposed Business Title', profile.proposedTitle], ['Promotion Approver', profile.promotionApprover]]);
  html += '</table>';

  // 2. Scope of Role
  html += sectionHeader('2', 'SCOPE OF ROLE');
  html += hint('The scope of role section should be written as it would apply to any person in this role. (500 words or fewer)');
  html += scopeOfRole ? scopeOfRole.split('\n').map(l => `<p style="margin:0 0 8px 0">${l}</p>`).join('') : `<p style="color:#999;font-style:italic">Not yet written</p>`;

  // 3. Promotion Assessment
  html += sectionHeader('3', 'PROMOTION ASSESSMENT');
  html += hint('Describe how the employee has performed at the next level; provide examples of how they demonstrate our Leadership Principles.');

  // Performance Strengths (green metrics)
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
      html += subHeader('Performance Strengths');
      html += `<p style="margin:0 0 8px 0">Metrics at or above L4 expectations:</p>`;
      html += brandTable(
        ['Metric', 'Value', 'Target', 'L4 Relevance'],
        greenMetrics.map(m => {
          const label = m.notes ? m.notes.split(' — ')[0] : m.type;
          const cmp = MIN_THRESHOLD_TYPES.includes(m.type) ? '≥' : '≤';
          const narr = L4_NARRATIVES[m.type] || 'Meets L4 expectations.';
          return [`<strong>${label}</strong>`, `<span style="color:#2e7d32;font-weight:700">${m.value}</span>`, `${cmp} ${m.target}`, narr];
        })
      );
    }
  }

  // STAR entries
  star.forEach((e: STAREntry) => {
    html += subHeader(e.title);
    html += `<p style="margin:0 0 8px 0"><strong style="color:${BRAND}">Leadership Principle(s):</strong> <em>${e.principles.join(', ') || 'None tagged'}</em></p>`;
    const narrative = [e.situation, e.task, e.action, e.results].filter(Boolean).join(' ');
    html += narrative ? `<p style="margin:0 0 12px 0">${narrative}</p>` : `<p style="color:#999;font-style:italic">No content yet</p>`;

    if (includeComments && e.reviewComments && e.reviewComments.length > 0) {
      const sorted = [...e.reviewComments].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      html += `<div style="margin:8px 0 16px 0">`;
      html += `<p style="font-weight:600;margin:0 0 8px 0">💬 Conversation</p>`;
      sorted.forEach(c => {
        const bg = c.source === 'engineer' ? '#f5f5f5' : '#f0f7ff';
        const label = c.source === 'engineer' ? 'Employee' : 'Manager';
        html += `<div style="background:${bg};border-radius:8px;padding:10px 14px;margin-bottom:8px">`;
        html += `<p style="font-size:11px;font-weight:700;margin:0 0 4px 0;color:#666">${label}</p>`;
        html += `<p style="margin:0 0 4px 0">${c.text}</p>`;
        html += `<p style="color:#999;font-size:11px;margin:0">${c.date}</p>`;
        html += `</div>`;
      });
      html += '</div>';
    }
  });

  if (star.length === 0) html += `<p style="color:#999;font-style:italic">No STAR entries yet</p>`;

  // 4. Best Reasons
  html += sectionHeader('4', 'BEST REASONS NOT TO PROMOTE');
  html += hint("At the time of promotion, it's expected that an employee will have some areas for growth at the next level. (500 words or fewer)");
  html += bestReasonsNotToPromote ? bestReasonsNotToPromote.split('\n').map(l => `<p style="margin:0 0 8px 0">${l}</p>`).join('') : `<p style="color:#999;font-style:italic">Not yet written</p>`;

  // 5. Additional Info
  html += sectionHeader('5', 'ADDITIONAL INFORMATION (optional)');
  html += additionalInfo ? additionalInfo.split('\n').map(l => `<p style="margin:0 0 8px 0">${l}</p>`).join('') : '';

  html += '</div>';
  return html;
}
