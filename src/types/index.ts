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

export interface STARREntry {
  id: string;
  title: string;
  situation: string;
  task: string;
  action: string;
  results: string;
  reflection: string;
  principles: LeadershipPrinciple[];
  date: string;
  quarter: string;
  impactLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  evidenceLinks: string[];
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

export interface Project {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  status: 'In Progress' | 'Completed' | 'Archived';
  impact: string;
  stakeholders: string[];
  outcomes: string[];
}

export interface FeedbackEntry {
  id: string;
  fromName: string;
  fromTitle: string;
  relationship: 'Peer' | 'Manager' | 'Cross-functional' | 'Direct Report' | 'Other/Stakeholder';
  content: string;
  reasonsNotToSupport: string;
  supportsPromotion: boolean;
  date: string;
  principles: LeadershipPrinciple[];
  steamDirect: string;
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  targetDate: string;
  progress: number;
  status: 'Not Started' | 'In Progress' | 'Completed';
  category: 'Technical' | 'Leadership' | 'Business' | 'Development';
}

export interface SessionMetadata {
  version: number;
  exportDate: string;
  lastModified: string;
  appVersion: string;
}

export interface AppState {
  profile: UserProfile;
  starr: STARREntry[];
  metrics: Metric[];
  projects: Project[];
  feedback: FeedbackEntry[];
  goals: Goal[];
  scopeOfRole: string;
  bestReasonsNotToPromote: string;
  additionalInfo: string;
}

export interface PortfolioFile {
  metadata: SessionMetadata;
  data: AppState;
}

export const CURRENT_VERSION = 2;
export const APP_VERSION = '1.1.0';
