export const LEADERSHIP_PRINCIPLES = [
  'Customer Obsession', 'Ownership', 'Invent and Simplify', 'Are Right, A Lot',
  'Learn and Be Curious', 'Hire and Develop the Best', 'Insist on the Highest Standards',
  'Think Big', 'Bias for Action', 'Frugality', 'Earn Trust', 'Dive Deep',
  'Have Backbone; Disagree and Commit', 'Deliver Results', 'Strive to be Earth\'s Best Employer',
  'Success and Scale Bring Broad Responsibility',
] as const;

export type LeadershipPrinciple = typeof LEADERSHIP_PRINCIPLES[number];
export type JobLevel = 'L3' | 'L4' | 'L5' | 'L6';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  level: JobLevel;
  targetLevel: JobLevel;
  proposedTitle: string;
  manager: string;
  team: string;
  startDate: string;
  targetPromotionDate: string;
  effectiveQuarter: string;
  steamMember: string;
  steamDirect: string;
  promotionApprover: string;
}

export interface CustomField {
  id: string;
  label: string;
  type: 'text' | 'image';
  value: string;
}

export interface ReviewComment {
  id: string;
  text: string;
  date: string;
  source: 'manager' | 'engineer';
  resolved?: boolean;
  reply?: string;
}

export interface STAREntry {
  id: string;
  title: string;
  situation: string;
  task: string;
  action: string;
  results: string;
  principles: LeadershipPrinciple[];
  date: string;
  quarter: string;
  impactLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  evidenceLinks: string[];
  levelDimension?: string;
  customFields?: CustomField[];
  hiddenFields?: string[];
  reviewComments?: ReviewComment[];
}

export interface Metric {
  id: string;
  type: string;
  value: number;
  target: number;
  date: string;
  period: 'weekly' | 'monthly' | 'quarterly';
  notes: string;
  channel: string;
}

export interface SessionMetadata {
  version: number;
  exportDate: string;
  lastModified: string;
  appVersion: string;
}

export interface ActivityLogEntry {
  timestamp: string;
  action: string;
  detail: string;
}

export interface DimensionResult {
  strength: 'strong' | 'moderate' | 'weak';
  summary: string;           // 1 short sentence: what the entries prove for this dimension
  entryTitles: string[];     // which STAR entry titles cover this dimension
}

export interface DimensionGap {
  dimension: string;
  priority: 'high' | 'medium';
  suggestion: string;        // 1-2 sentences: what to write about, plain language
}

export interface DimensionAnalysis {
  dimensions: Record<string, DimensionResult>;  // keyed by dimension name, only covered/partial dimensions
  gaps: DimensionGap[];                          // ordered by priority (high first)
  analyzedAt: string;
}

export interface AppState {
  profile: UserProfile;
  star: STAREntry[];
  metrics: Metric[];
  scopeOfRole: string;
  bestReasonsNotToPromote: string;
  additionalInfo: string;
  activityLog?: ActivityLogEntry[];
  dimensionAnalysis?: DimensionAnalysis;
}

export interface PortfolioFile {
  metadata: SessionMetadata;
  data: AppState;
}

export const CURRENT_VERSION = 2;
export const APP_VERSION = '1.1.0';
