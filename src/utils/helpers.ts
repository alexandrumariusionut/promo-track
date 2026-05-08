import { LEADERSHIP_PRINCIPLES, LeadershipPrinciple, AppState } from '../types';

export function getQuarter(date: string): string {
  const d = new Date(date);
  return `Q${Math.ceil((d.getMonth() + 1) / 3)} ${d.getFullYear()}`;
}

export function lpCoverage(star: AppState['star']): Record<LeadershipPrinciple, number> {
  const counts = {} as Record<LeadershipPrinciple, number>;
  LEADERSHIP_PRINCIPLES.forEach((lp: LeadershipPrinciple) => { counts[lp] = 0; });
  star.forEach(s => s.principles.forEach(p => { counts[p] = (counts[p] || 0) + 1; }));
  return counts;
}

export function readinessScore(state: AppState): number {
  let score = 0;
  const p = state.profile;
  // Profile completeness (10 pts)
  if (p.name && p.role && p.manager && p.team) score += 5;
  if (p.proposedTitle && p.steamMember && p.promotionApprover) score += 5;
  // STAR coverage (35 pts)
  const coverage = lpCoverage(state.star);
  const covered = Object.values(coverage).filter((v: number) => v > 0).length;
  score += Math.min(35, Math.round((covered / 16) * 35));
  // Metrics (10 pts)
  score += Math.min(10, state.metrics.length >= 5 ? 10 : state.metrics.length * 2);
  // Scope of Role (10 pts)
  if (state.scopeOfRole && state.scopeOfRole.length > 50) score += 10;
  // Best Reasons (5 pts)
  if (state.bestReasonsNotToPromote && state.bestReasonsNotToPromote.length > 50) score += 5;
  // Additional Info (5 pts)
  if (state.additionalInfo && state.additionalInfo.length > 20) score += 5;
  return Math.min(100, Math.round(score));
}
