import { AppState, LEADERSHIP_PRINCIPLES, LeadershipPrinciple, STARREntry, Metric, FeedbackEntry } from '../types';

function h(tag: string, text: string, style = '') {
  return `<${tag}${style ? ` style="${style}"` : ''}>${text}</${tag}>`;
}

export function generatePreviewHTML(state: AppState): string {
  const { profile, starr, metrics, feedback, scopeOfRole, bestReasonsNotToPromote, additionalInfo } = state;
  const find = (type: string, channel = 'Total') => metrics.find((m: Metric) => m.type === type && m.channel === channel);
  const bench = (prefix: string, type: string) => metrics.find((m: Metric) => m.type === `${prefix} ${type}` && m.channel === 'Benchmark');

  let html = '<div style="font-family:Calibri,sans-serif;max-width:800px;margin:0 auto;font-size:14px;line-height:1.5">';

  // 1. Employee Info
  html += h('h2', '1. EMPLOYEE INFORMATION');
  html += '<table style="width:100%;border-collapse:collapse;margin-bottom:16px">';
  const row = (pairs: [string, string][]) => '<tr>' + pairs.map(([k, v]) => `<td style="border:1px solid #ccc;padding:4px 8px"><strong>${k}</strong></td><td style="border:1px solid #ccc;padding:4px 8px">${v || '—'}</td>`).join('') + '</tr>';
  html += row([['Employee Name', profile.name], ['Current Job Title', profile.role], ['Effective Quarter', profile.effectiveQuarter]]);
  html += row([['Manager Name', profile.manager], ['Proposed Job Title', profile.proposedTitle], ['Proposed Level', profile.targetLevel]]);
  html += row([['Steam Member', profile.steamMember], ['Current Business Title', profile.role], ['Time in Level', profile.startDate || '—']]);
  html += row([['Steam Direct', profile.steamDirect], ['Proposed Business Title', profile.proposedTitle], ['Promotion Approver', profile.promotionApprover]]);
  html += '</table>';

  // 2. Scope of Role
  html += h('h2', '2. SCOPE OF ROLE');
  html += scopeOfRole ? scopeOfRole.split('\n').map(l => h('p', l)).join('') : h('p', '<em>Not yet written</em>', 'color:#999');

  // 3. Promotion Assessment
  html += h('h2', '3. PROMOTION ASSESSMENT');

  // Metrics table
  if (metrics.length > 0) {
    html += h('h3', 'Metrics and Performance');
    const kpis = [['CPH', 'CPH', false], ['AHT (min)', 'AHT', false], ['CSAT (% of 5\'s)', 'CSAT', true], ['Case ARR', 'Case ARR', true], ['Contacts Missed', 'Contacts Missed %', true]] as const;
    html += '<table style="width:100%;border-collapse:collapse;margin-bottom:16px"><tr><th style="border:1px solid #ccc;padding:4px 8px;background:#f5f5f5">Metric</th><th style="border:1px solid #ccc;padding:4px 8px;background:#f5f5f5">Value</th><th style="border:1px solid #ccc;padding:4px 8px;background:#f5f5f5">Global</th><th style="border:1px solid #ccc;padding:4px 8px;background:#f5f5f5">Team</th></tr>';
    kpis.forEach(([label, type, pct]) => {
      const m = find(type as string);
      const g = bench('Global', type as string);
      const t = bench('Team', type as string);
      if (m) html += `<tr><td style="border:1px solid #ccc;padding:4px 8px"><strong>${label}</strong></td><td style="border:1px solid #ccc;padding:4px 8px">${m.value}${pct ? '%' : ''}</td><td style="border:1px solid #ccc;padding:4px 8px">${g ? g.value + (pct ? '%' : '') : '—'}</td><td style="border:1px solid #ccc;padding:4px 8px">${t ? t.value + (pct ? '%' : '') : '—'}</td></tr>`;
    });
    html += '</table>';
  }

  // STARR entries
  starr.forEach((e: STARREntry) => {
    html += h('h3', e.title, 'margin-bottom:4px');
    html += h('p', `<strong>Leadership Principle(s):</strong> <em>${e.principles.join(', ') || 'None tagged'}</em>`, 'margin-top:0');
    const narrative = [e.situation, e.task, e.action, e.results, e.reflection].filter(Boolean).join(' ');
    html += narrative ? h('p', narrative) : h('p', '<em>No content yet</em>', 'color:#999');
  });

  if (starr.length === 0) html += h('p', '<em>No STARR entries yet</em>', 'color:#999');

  // 4. Best Reasons
  html += h('h2', '4. BEST REASONS NOT TO PROMOTE');
  html += bestReasonsNotToPromote ? bestReasonsNotToPromote.split('\n').map(l => h('p', l)).join('') : h('p', '<em>Not yet written</em>', 'color:#999');

  // 6. Additional Info
  html += h('h2', '6. ADDITIONAL INFORMATION');
  html += additionalInfo ? additionalInfo.split('\n').map(l => h('p', l)).join('') : h('p', '<em>Not yet written</em>', 'color:#999');

  // Feedback
  if (feedback.length > 0) {
    html += h('h2', 'FEEDBACK SUMMARY');
    html += '<table style="width:100%;border-collapse:collapse;margin-bottom:16px"><tr><th style="border:1px solid #ccc;padding:4px 8px;background:#f5f5f5">Provider</th><th style="border:1px solid #ccc;padding:4px 8px;background:#f5f5f5">Relationship</th><th style="border:1px solid #ccc;padding:4px 8px;background:#f5f5f5">Supports</th></tr>';
    feedback.forEach((f: FeedbackEntry) => {
      html += `<tr><td style="border:1px solid #ccc;padding:4px 8px">${f.fromName}</td><td style="border:1px solid #ccc;padding:4px 8px">${f.relationship}</td><td style="border:1px solid #ccc;padding:4px 8px">${f.supportsPromotion ? 'Yes' : 'No'}</td></tr>`;
    });
    html += '</table>';
  }

  html += '</div>';
  return html;
}
