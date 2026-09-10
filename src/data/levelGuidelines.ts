import { JobLevel } from '../types';

/**
 * @deprecated Use COMPETENCIES instead. Kept for backward compatibility with stored DimensionAnalysis.
 */
export const FUNCTIONAL_DIMENSIONS = [
  'Ambiguity',
  'Scope & Influence',
  'Execution',
  'Problem Complexity',
  'Communication',
  'Impact',
  'Process Improvement',
] as const;

// ─── L4 Role Guidelines (GSD2 Review Panel checks against these) ─────────────

export interface Guideline {
  id: string;
  name: string;
  rubric: string;
  /** 3-7 word phrase taken WORD-FOR-WORD from the guideline's verbatim text (name or rubric). */
  leadClause: string;
  /** Icon identifier mapped to a MUI icon component in the panel (no React imports here). */
  icon: string;
}

/**
 * Bonus evidence tags valued by reviewers (Principles of a Strong Example).
 * These do NOT have counted rows — they appear in the 'Evidence themes' select
 * and as a footer note on the panel.
 */
export interface BonusTag {
  id: string;
  name: string;
  reviewerGuidance: string;
}

export const BONUS_TAGS: BonusTag[] = [
  {
    id: 'mentoring-coaching',
    name: 'Mentoring and coaching peers',
    reviewerGuidance: 'Document the steps: root cause, action plan, sustained metric improvement of the peer.',
  },
  {
    id: 'difficult-customer',
    name: 'Handling difficult customer interactions',
    reviewerGuidance: 'Complex/escalated/executive interaction handled to resolution with judgment on severity/SLA tradeoffs.',
  },
];

/**
 * The 7 L4 Role Guidelines the GSD2 review panel assesses against.
 * These are the primary rows in the Promotion Readiness panel, counted via confirmed tags.
 */
export const GUIDELINES: Record<'L4' | 'L5', Guideline[]> = {
  L4: [
    {
      id: 'no-sop-troubleshooting',
      name: 'You are able to troubleshoot and resolve straightforward IT problems without SOPs. You escalate appropriately when work significantly deviates from documented practices or when barriers arise.',
      rubric: 'Troubleshoot and resolve straightforward IT problems without SOPs; escalate appropriately when work significantly deviates or barriers arise.',
      leadClause: 'Troubleshoot and resolve straightforward IT problems without SOPs',
      icon: 'BugReport',
    },
    {
      id: 'small-projects',
      name: 'You are executing small projects that deliver value to your team and/or customers. You are able define requirements and manage the execution. These projects may involve other locations or be part of a larger continuous improvement.',
      rubric: 'Execute small projects delivering value to team/customers; define requirements and manage execution; may involve other locations or larger continuous improvement.',
      leadClause: 'Executing small projects that deliver value',
      icon: 'RocketLaunch',
    },
    {
      id: 'change-management',
      name: 'You are writing and coordinating CMs. You no longer need a template.',
      rubric: 'Write and coordinate CMs without needing a template.',
      leadClause: 'Writing and coordinating CMs',
      icon: 'PublishedWithChanges',
    },
    {
      id: 'higher-permissions',
      name: 'You are trusted with higher levels of permissions to perform systems management procedures, make small code changes, etc.',
      rubric: 'Trusted with higher permission levels: systems management procedures, small code changes.',
      leadClause: 'Trusted with higher levels of permissions',
      icon: 'AdminPanelSettings',
    },
    {
      id: 'root-cause-automation',
      name: 'You identify root-causes of operational issues and process inefficiencies. You may be automating tasks, modifying small tools, and/or proposing new SOPs.',
      rubric: 'Identify root causes of operational issues and process inefficiencies; automate tasks, modify small tools, propose new SOPs.',
      leadClause: 'Identify root-causes of operational issues',
      icon: 'Psychology',
    },
    {
      id: 'tradeoffs',
      name: 'You make appropriate tradeoffs: your time available vs. issue severity/SLA vs. support work volume (e.g., tickets, CM, projects, etc.).',
      rubric: 'Balance time available vs issue severity/SLA vs support work volume (tickets, CMs, projects).',
      leadClause: 'Make appropriate tradeoffs',
      icon: 'Balance',
    },
    {
      id: 'kb-authoring',
      name: 'You author operating procedures and knowledge base articles.',
      rubric: 'Author operating procedures and knowledge base articles.',
      leadClause: 'Author operating procedures and knowledge base articles',
      icon: 'MenuBook',
    },
  ],
  L5: [
    {
      id: 'difficult-troubleshooting',
      name: 'Difficult Troubleshooting',
      rubric: 'Troubleshoot difficult IT problems without SOPs. Identify root cause(s) and either resolve yourself or hand off to a senior peer. Determine when to manage an issue yourself or escalate.',
      leadClause: 'Troubleshoot difficult IT problems without SOPs',
      icon: 'BugReport',
    },
    {
      id: 'short-term-solutions',
      name: 'Short-Term Solutions',
      rubric: 'Create short-term solutions with limited guidance. Solutions are high quality, correct, logical, and efficient.',
      leadClause: 'Create short-term solutions with limited guidance',
      icon: 'RocketLaunch',
    },
    {
      id: 'multi-location-projects',
      name: 'Multi-Location Projects',
      rubric: 'Action and manage projects that cross multiple locations in a single region. May partner with internal teams or vendors. Projects may impact an organization goal.',
      leadClause: 'Action and manage projects that cross multiple locations',
      icon: 'PublishedWithChanges',
    },
    {
      id: 'independent-cm',
      name: 'Independent Change Management',
      rubric: 'Work independently to plan and coordinate CMs that may impact multiple systems/locations. Develop CM templates for others to use.',
      leadClause: 'Work independently to plan and coordinate CMs',
      icon: 'AdminPanelSettings',
    },
    {
      id: 'automation-tooling',
      name: 'Automation & Tooling',
      rubric: 'Automate tasks, create/improve software tools, and create/optimize SOPs to improve IT efficiency or increase productivity.',
      leadClause: 'Automate tasks, create/improve software tools',
      icon: 'Psychology',
    },
    {
      id: 'best-practices',
      name: 'Best Practices & Mentoring',
      rubric: 'Consistently incorporate best practices. Establish good working relationships. Confidently train other IT Support peers.',
      leadClause: 'Consistently incorporate best practices',
      icon: 'Balance',
    },
    {
      id: 'prioritization-tradeoffs',
      name: 'Prioritization & Tradeoffs',
      rubric: 'Prioritize your work and make appropriate tradeoffs related to team time available vs. solution quality vs. support volumes.',
      leadClause: 'Prioritize your work and make appropriate tradeoffs',
      icon: 'MenuBook',
    },
  ],
};

// ─── Responsibility-based Model (GSD2 Key Responsibilities) ───────────────────
// Kept for backward compatibility and migration logic.

export interface Responsibility {
  id: string;
  name: string;
  description: string;
  connectedThemes: string[];
}

export interface EvidenceTheme {
  id: string;
  name: string;
  reviewerGuidance: string;
}

/**
 * @deprecated Use BONUS_TAGS for the form themes select. Kept for backward compat.
 */
export const EVIDENCE_THEMES: EvidenceTheme[] = [
  {
    id: 'mentoring-coaching',
    name: 'Mentoring and coaching peers',
    reviewerGuidance: 'Document the steps: root cause, action plan, sustained metric improvement of the peer.',
  },
  {
    id: 'difficult-customer',
    name: 'Handling difficult customer interactions',
    reviewerGuidance: 'Complex/escalated/executive interaction handled to resolution with judgment on severity/SLA tradeoffs.',
  },
];

/**
 * GSD2 Key Responsibilities per level. Kept for backward compatibility and migration logic.
 * NOT the counted rows — GUIDELINES are the counted rows.
 */
export const RESPONSIBILITIES: Record<'L4' | 'L5', Responsibility[]> = {
  L4: [
    {
      id: 'contact-support',
      name: 'Contact support',
      description: 'Handling the most complex issues with the GSD business, assisting GSD1 with overflow during high volumes.',
      connectedThemes: ['mentoring-coaching', 'difficult-customer'],
    },
    {
      id: 'assist',
      name: 'Assist',
      description: 'Guide and mentor engineers in troubleshooting within the Assist queue.',
      connectedThemes: ['mentoring-coaching'],
    },
    {
      id: 'escalated-contacts',
      name: 'Escalated contacts',
      description: 'Ownership of escalated issues, resolving complex problems, handling permissions-gated issues.',
      connectedThemes: ['difficult-customer'],
    },
    {
      id: 'executive-support',
      name: 'Executive Support',
      description: 'Support for L8+ customers via chat and phone.',
      connectedThemes: ['difficult-customer'],
    },
    {
      id: 'repeat-contact-resolution',
      name: 'Repeat Contact Resolution',
      description: 'Resolving repeat customer issues, auditing initial interactions, providing feedback for continuous improvement.',
      connectedThemes: ['difficult-customer'],
    },
    {
      id: 'hiring-training-mentorship',
      name: 'Hiring, training and mentorship',
      description: 'Participate in hiring, develop and mentor L3 engineers.',
      connectedThemes: ['mentoring-coaching'],
    },
    {
      id: 'process-improvement',
      name: 'Process improvement',
      description: 'Continuous improvement supporting GSD king pin goals, projects requiring technical expertise.',
      connectedThemes: [],
    },
  ],
  L5: [
    {
      id: 'difficult-troubleshooting',
      name: 'Difficult Troubleshooting',
      description: 'Troubleshoot difficult IT problems without SOPs. Identify root cause(s) and either resolve yourself or hand off to a senior peer.',
      connectedThemes: [],
    },
    {
      id: 'short-term-solutions',
      name: 'Short-Term Solutions',
      description: 'Create short-term solutions with limited guidance. Solutions are high quality, correct, logical, and efficient.',
      connectedThemes: [],
    },
    {
      id: 'multi-location-projects',
      name: 'Multi-Location Projects',
      description: 'Action and manage projects that cross multiple locations in a single region.',
      connectedThemes: [],
    },
    {
      id: 'independent-cm',
      name: 'Independent Change Management',
      description: 'Work independently to plan and coordinate CMs that may impact multiple systems/locations.',
      connectedThemes: [],
    },
    {
      id: 'automation-tooling',
      name: 'Automation & Tooling',
      description: 'Automate tasks, create/improve software tools, and create/optimize SOPs to improve IT efficiency.',
      connectedThemes: [],
    },
    {
      id: 'best-practices',
      name: 'Best Practices & Mentoring',
      description: 'Consistently incorporate best practices. Establish good working relationships. Confidently train other IT Support peers.',
      connectedThemes: ['mentoring-coaching'],
    },
    {
      id: 'prioritization-tradeoffs',
      name: 'Prioritization & Tradeoffs',
      description: 'Prioritize your work and make appropriate tradeoffs related to team time available vs. solution quality vs. support volumes.',
      connectedThemes: [],
    },
  ],
};

/**
 * Map from old competency ids to new guideline ids.
 * Used by migration logic in storage.ts (step 1: old competencies → guidelines).
 * Since the guideline ids match the original competency ids, this is identity for most.
 */
export const COMPETENCY_TO_GUIDELINE_MAP: Record<string, string> = {
  'no-sop-troubleshooting': 'no-sop-troubleshooting',
  'small-projects': 'small-projects',
  'change-management': 'change-management',
  'higher-permissions': 'higher-permissions',
  'root-cause-automation': 'root-cause-automation',
  'tradeoffs': 'tradeoffs',
  'kb-authoring': 'kb-authoring',
};

/**
 * Map from responsibility ids (added ~30min ago) back to guideline ids.
 * Used by migration logic in storage.ts (step 2: responsibilities → guidelines).
 */
export const RESPONSIBILITY_TO_GUIDELINE_MAP: Record<string, string> = {
  'contact-support': 'no-sop-troubleshooting',
  'assist': 'no-sop-troubleshooting',
  'escalated-contacts': 'higher-permissions',
  'executive-support': 'no-sop-troubleshooting',
  'repeat-contact-resolution': 'root-cause-automation',
  'process-improvement': 'root-cause-automation',
};

/**
 * Responsibility ids that should become bonus themes instead of guideline tags.
 */
export const RESPONSIBILITY_TO_THEME_MAP: Record<string, string> = {
  'hiring-training-mentorship': 'mentoring-coaching',
};

// ─── Concrete Competency Model ────────────────────────────────────────────────

/**
 * @deprecated Use GUIDELINES instead. Kept for backward compatibility.
 */
export interface Competency {
  id: string;
  name: string;
  shortName: string;
  rubric: string;
  evidenceExamples: string[];
  wikiCitation: string;
}

/**
 * @deprecated Use GUIDELINES instead. Kept for backward compatibility with existing code paths.
 */
export const COMPETENCIES: Record<'L4' | 'L5', Competency[]> = {
  L4: [
    {
      id: 'no-sop-troubleshooting',
      name: 'No-SOP Troubleshooting',
      shortName: 'No-SOP',
      rubric: 'Troubleshoot and resolve straightforward IT problems without SOPs. Escalate appropriately when work significantly deviates from known procedures.',
      evidenceExamples: [
        'Resolved a network issue that had no documented procedure',
        'Diagnosed and fixed a recurring login problem without escalation',
        'Identified the right fix for an undocumented hardware failure',
      ],
      wikiCitation: 'IC Promotion Wiki — GSD2 L4 Role Guidelines',
    },
    {
      id: 'small-projects',
      name: 'Small Projects',
      shortName: 'Projects',
      rubric: 'Execute small projects delivering value to team and/or customers. Define requirements and manage execution.',
      evidenceExamples: [
        'Led a local deployment project end-to-end',
        'Defined and delivered a workspace improvement initiative',
        'Managed a multi-week tool rollout across campus locations',
      ],
      wikiCitation: 'IC Promotion Wiki — GSD2 L4 Role Guidelines',
    },
    {
      id: 'change-management',
      name: 'Change Management',
      shortName: 'CMs',
      rubric: 'Write and coordinate CMs without needing a template. Recognize when change management is required.',
      evidenceExamples: [
        'Authored a CM for a system migration with no prior template',
        'Coordinated a change across multiple teams independently',
        'Identified that a process change required CM and drove it',
      ],
      wikiCitation: 'IC Promotion Wiki — GSD2 L4 Role Guidelines',
    },
    {
      id: 'higher-permissions',
      name: 'Higher Permissions',
      shortName: 'Permissions',
      rubric: 'Trusted with systems management procedures and small code changes. Operates at higher levels of responsibility.',
      evidenceExamples: [
        'Given elevated access to perform systems management tasks',
        'Made minor code changes to internal tools',
        'Trusted to perform production-level maintenance procedures',
      ],
      wikiCitation: 'IC Promotion Wiki — GSD2 L4 Role Guidelines',
    },
    {
      id: 'root-cause-automation',
      name: 'Root Cause & Automation',
      shortName: 'Root Cause',
      rubric: 'Identify root causes of operational issues and process inefficiencies. Automate tasks, modify small tools, propose new SOPs.',
      evidenceExamples: [
        'Found the root cause of a recurring incident and automated the fix',
        'Built a script to eliminate a repetitive manual process',
        'Proposed and wrote a new SOP after identifying a process gap',
      ],
      wikiCitation: 'IC Promotion Wiki — GSD2 L4 Role Guidelines',
    },
    {
      id: 'tradeoffs',
      name: 'Tradeoffs',
      shortName: 'Tradeoffs',
      rubric: 'Make appropriate tradeoffs: time available vs. issue severity/SLA vs. support work volume.',
      evidenceExamples: [
        'Prioritized a critical outage over lower-severity tickets during peak volume',
        'Balanced project work against urgent support queue demands',
        'Made a conscious tradeoff between speed and thoroughness given SLA pressure',
      ],
      wikiCitation: 'IC Promotion Wiki — GSD2 L4 Role Guidelines',
    },
    {
      id: 'kb-authoring',
      name: 'KB Authoring',
      shortName: 'KB/SOPs',
      rubric: 'Author operating procedures and knowledge base articles.',
      evidenceExamples: [
        'Wrote a KB article adopted by the team as a standard reference',
        'Created an operating procedure for a previously undocumented process',
        'Updated and improved existing SOPs based on operational feedback',
      ],
      wikiCitation: 'IC Promotion Wiki — GSD2 L4 Role Guidelines',
    },
  ],
  L5: [
    {
      id: 'difficult-troubleshooting',
      name: 'Difficult Troubleshooting',
      shortName: 'Hard Problems',
      rubric: 'Troubleshoot difficult IT problems without SOPs. Identify root cause(s) and either resolve yourself or hand off to a senior peer. Determine when to manage an issue yourself or escalate.',
      evidenceExamples: [
        'Resolved a complex cross-system issue by identifying a non-obvious root cause',
        'Diagnosed a difficult problem and made the right call on whether to escalate',
        'Identified and fixed a root cause that had evaded multiple prior investigations',
      ],
      wikiCitation: 'IC Promotion Wiki — GSD2 L5 Role Guidelines (derived from L4 movingToNext)',
    },
    {
      id: 'short-term-solutions',
      name: 'Short-Term Solutions',
      shortName: 'Solutions',
      rubric: 'Create short-term solutions with limited guidance. Solutions are high quality, correct, logical, and efficient.',
      evidenceExamples: [
        'Designed and implemented an interim fix that held up under production load',
        'Built a tactical solution independently that required minimal rework later',
        'Delivered a correct and efficient fix without step-by-step direction',
      ],
      wikiCitation: 'IC Promotion Wiki — GSD2 L5 Role Guidelines (derived from L4 movingToNext)',
    },
    {
      id: 'multi-location-projects',
      name: 'Multi-Location Projects',
      shortName: 'Regional Projects',
      rubric: 'Action and manage projects that cross multiple locations in a single region. May partner with internal teams or vendors. Projects may impact an organization goal.',
      evidenceExamples: [
        'Led a project spanning multiple sites in a region',
        'Partnered with a vendor to deliver an initiative impacting organization metrics',
        'Managed a cross-location rollout tied to a broader org goal',
      ],
      wikiCitation: 'IC Promotion Wiki — GSD2 L5 Role Guidelines (derived from L4 movingToNext)',
    },
    {
      id: 'independent-cm',
      name: 'Independent Change Management',
      shortName: 'Adv. CMs',
      rubric: 'Work independently to plan and coordinate CMs that may impact multiple systems/locations. Develop CM templates for others to use.',
      evidenceExamples: [
        'Planned and executed a multi-system CM independently',
        'Created a reusable CM template adopted by the team',
        'Coordinated a change impacting multiple locations without supervision',
      ],
      wikiCitation: 'IC Promotion Wiki — GSD2 L5 Role Guidelines (derived from L4 movingToNext)',
    },
    {
      id: 'automation-tooling',
      name: 'Automation & Tooling',
      shortName: 'Automation',
      rubric: 'Automate tasks, create/improve software tools, and create/optimize SOPs to improve IT efficiency or increase productivity.',
      evidenceExamples: [
        'Built or significantly improved a tool that measurably increased team productivity',
        'Automated a workflow that previously required hours of manual effort',
        'Optimized existing SOPs resulting in faster resolution times',
      ],
      wikiCitation: 'IC Promotion Wiki — GSD2 L5 Role Guidelines (derived from L4 movingToNext)',
    },
    {
      id: 'best-practices',
      name: 'Best Practices & Mentoring',
      shortName: 'Best Practices',
      rubric: 'Consistently incorporate best practices in your work. Establish good working relationships with teammates and peers. Able to confidently train other IT Support peers.',
      evidenceExamples: [
        'Mentored a peer through a complex technical area',
        'Set the standard for how the team approaches a category of work',
        'Trained new team members and resolved conflicting views constructively',
      ],
      wikiCitation: 'IC Promotion Wiki — GSD2 L5 Role Guidelines (derived from L4 movingToNext)',
    },
    {
      id: 'prioritization-tradeoffs',
      name: 'Prioritization & Tradeoffs',
      shortName: 'Prioritization',
      rubric: 'Prioritize your work and make appropriate tradeoffs related to team time available vs. solution quality vs. support volumes.',
      evidenceExamples: [
        'Made a deliberate quality-vs-speed tradeoff that served the team well',
        'Re-prioritized work mid-sprint based on shifting support demands',
        'Balanced competing demands across projects and reactive work effectively',
      ],
      wikiCitation: 'IC Promotion Wiki — GSD2 L5 Role Guidelines (derived from L4 movingToNext)',
    },
  ],
};

export type FunctionalDimension = typeof FUNCTIONAL_DIMENSIONS[number];

export interface LevelGuideline {
  whatYouDo: Record<FunctionalDimension, string>;
  movingToNext: Record<FunctionalDimension, string[]>;
  movingToNextSummary: string[];
}

export const LEVEL_GUIDELINES: Partial<Record<JobLevel, LevelGuideline>> = {
  L3: {
    whatYouDo: {
      'Ambiguity': 'Uses knowledge to determine which task or procedure to follow (or when a slight deviation is needed) to achieve desired outcome. Work is supervised.',
      'Scope & Influence': 'Handles support requests and procedures. Work may cross multiple campus locations. Helps train new hires.',
      'Execution': 'Performs a variety of routine technical SOPs. Performs change management activities. Troubleshoots and resolves clearly defined problems. Responds to emergent events. May perform oncall. Escalates when action to be taken is not clear.',
      'Problem Complexity': 'Uses technical knowledge to select the right SOP. May troubleshoot and resolve clearly defined technical problems.',
      'Communication': 'Is clear and concise in verbal and written communication (e.g., tickets, SIMs, notes). Learning to manage meetings effectively. Is trusted to present decisions to leaders up to 2 tiers above level (L5).',
      'Impact': 'Impacts short-term team metrics. SOPs affecting a system and individual users in a single location.',
      'Process Improvement': 'Participates in team and site continuous improvement efforts.',
    },
    movingToNext: {
      'Ambiguity': ['You are able to troubleshoot and resolve straightforward IT problems without SOPs.'],
      'Scope & Influence': ['You work on local IT Support projects that deliver value to your team and/or customers.', 'You are able to define requirements and manage the execution.'],
      'Execution': ['You recognize when change management is required. When directly involved, you are writing and coordinating CMs. You no longer need a template.', 'You are trusted with higher levels of responsibilities to perform systems management procedures, make minor code changes, etc.'],
      'Problem Complexity': ['You are able to troubleshoot and resolve straightforward IT problems without SOPs.'],
      'Communication': ['You make appropriate tradeoffs: your time available vs. issue severity/SLA vs. support work volume.'],
      'Impact': ['These projects may involve other locations or be part of a larger continuous improvement.'],
      'Process Improvement': ['You identify root-causes of operational issues and process inefficiencies.', 'You author operating procedures and knowledge base articles.'],
    },
    movingToNextSummary: [
      'You are able to troubleshoot and resolve straightforward IT problems without SOPs.',
      'You work on local IT Support projects that deliver value to your team and/or customers. You are able to define requirements and manage the execution. These projects may involve other locations or be part of a larger continuous improvement.',
      'You recognize when change management is required. When directly involved, you are writing and coordinating CMs. You no longer need a template.',
      'You are trusted with higher levels of responsibilities to perform systems management procedures, make minor code changes, etc.',
      'You identify root-causes of operational issues and process inefficiencies.',
      'You make appropriate tradeoffs: your time available vs. issue severity/SLA vs. support work volume (e.g., tickets, CM, projects).',
      'You author operating procedures and knowledge base articles.',
    ],
  },
  L4: {
    whatYouDo: {
      'Ambiguity': 'Uses knowledge and specialized skills to build, implement, and/or meet defined goals. Creates SOPs. Work reviewed periodically. Solutions may need refinement. Needs some guidance.',
      'Scope & Influence': 'Handles support requests and local projects. Work may cross multiple campus locations. May influence local partner teams. Begins to mentor.',
      'Execution': 'Implements technical solutions. Manages local projects. Defines requirements, facilitates progress, and identifies blockers. Coordinates CMs and emergent events. Assists in new/existing site deployments. Performs oncall. Escalates roadblocks or risks. Makes trade-offs: time vs. issue severity/SLA vs. support work volume.',
      'Problem Complexity': 'Uses technical knowledge to resolve straightforward IT problems. Learning to code. Solutions may need refinement. Able to troubleshoot without a SOP.',
      'Communication': 'Is clear and concise in verbal and written communication by documenting issues and communicating effectively by conveying ideas and reasoning and following up with dialogue when needed. Learning to be clear and concise in verbal and written communication (e.g., narratives, WBR/MBR). May participate in business reviews. Manages meetings effectively. Learning to put the right people in the room. Is trusted to present decisions to leaders up to 3 tiers above level (L7).',
      'Impact': 'Impacts long-term team metrics. Solutions may affect multiple users or a system in multiple locations.',
      'Process Improvement': 'Identify root-causes of operational issues and process inefficiencies. May automate tasks, modify local tools, or propose new SOPs.',
    },
    movingToNext: {
      'Ambiguity': ['You create short-term solutions with limited guidance. Your solutions are high quality, correct, logical, and efficient.'],
      'Scope & Influence': ['You are able to action and manage projects that cross multiple locations in a single region. You may partner with internal teams or vendors. These projects may impact an organization goal.', 'You have established good working relationships with team-mates and peers. You recognize differing views and take part in constructive dialogue to resolve them.', 'You are able to confidently train other IT Support peers.'],
      'Execution': ['You are able to troubleshoot difficult IT problems without SOPs. You identify root cause(s) and either resolve yourself or hand-off to a senior peer. You are able determine when you can manage an issue yourself, or when to escalate.', 'You work independently to plan and coordinate CMs that may impact multiple systems/locations. You are able to develop CM templates for others to use.', 'You consistently incorporate best practices in your work.'],
      'Problem Complexity': ['You are able to troubleshoot difficult IT problems without SOPs. You identify root cause(s) and either resolve yourself or hand-off to a senior peer.'],
      'Communication': ['You are able to prioritize your work and make appropriate trade-offs related to team time available vs. solution quality vs. support volumes.'],
      'Impact': ['These projects may impact an organization goal.'],
      'Process Improvement': ['You automate tasks, create/improve software tools, and create/optimize SOPs to improve IT efficiency or increase productivity.'],
    },
    movingToNextSummary: [
      'You are able to troubleshoot difficult IT problems without SOPs. You identify root cause(s) and either resolve yourself or hand-off to a senior peer. You are able determine when you can manage an issue yourself, or when to escalate.',
      'You create short-term solutions with limited guidance. Your solutions are high quality, correct, logical, and efficient.',
      'You are able to action and manage projects that cross multiple locations in a single region. You may partner with internal teams or vendors. These projects may impact an organization goal.',
      'You work independently to plan and coordinate CMs that may impact multiple systems/locations. You are able to develop CM templates for others to use.',
      'You automate tasks, create/improve software tools, and create/optimize SOPs to improve IT efficiency or increase productivity.',
      'You consistently incorporate best practices in your work.',
      'You are able to prioritize your work and make appropriate trade-offs related to team time available vs. solution quality vs. support volumes.',
      'You have established good working relationships with team-mates and peers. You recognize differing views and take part in constructive dialogue to resolve them.',
      'You are able to confidently train other IT Support peers.',
    ],
  },
  L5: {
    whatYouDo: {
      'Ambiguity': 'Uses knowledge and specialized skills to decide which actions to take and in what priority order. Creates short-term solutions. Delivers with limited guidance.',
      'Scope & Influence': 'Handles support requests and projects in a single region. May influence cross-functional teams and 3rd party vendors. Available as a mentor to develop others. May provide feedback on technical aptitude for promotions.',
      'Execution': 'Work is tactical. Learning to be strategic. Implements and improves IT solutions. Manages programs. Accelerates progress by driving timely decisions. Able to spot risks, ask the right questions. Partners with internal teams and vendors to achieve goals. May act as a first point of escalation for oncall. Makes trade-offs: team time available vs. solution quality vs. support volumes.',
      'Problem Complexity': 'Uses technical knowledge and/or moderate ability to code to solve difficult technical problems. May resolve root cause. Solutions are high quality, correct, logical, and efficient. Learning software design, etc.',
      'Communication': 'Is clear and concise in verbal and written communication (e.g., MBR/QBR, PR/FAQ). Puts the right people in the room. Is trusted to present decisions to leaders up to 3 tiers above level (L8). Writes clear documentation. May be accountable for COEs. Fosters a shared understanding to meet business needs.',
      'Impact': 'Impacts team goals. Solutions may affect multiple systems in a single region. May impact an organization goal.',
      'Process Improvement': 'Able to automate tasks, create/improve software tools to minimize manual effort or increase productivity. Optimizes SOPs.',
    },
    movingToNext: {
      'Ambiguity': ['You create and implement long-term technical solutions for repetitive or serious support problems. You are able to determine the right solution, working with stakeholders, partner teams, and peers. You deliver independently, with minimal guidance.'],
      'Scope & Influence': ['You are able to lead regional cross-functional and/or cross-regional projects and initiatives through their full lifecycle.', 'You handle escalations for your region which may involve the engagement of internal partner teams or vendors.', 'You demonstrate your ability to positively influence and impact technologies made by internal teams.'],
      'Execution': ['You drive the right long-term solutions. You proactively work to improve operational consistency between services.', 'You look for opportunities to streamline procedures. You understand that many problems are not new and explore re-using or extending existing solutions first, before creating new ones.', 'Your approach to technical support, design, and implementation decisions set a great example to others and demonstrate best practices. You work efficiently and routinely deliver the right things.'],
      'Problem Complexity': ['You are able to solve complex technology problems related to operational support relevant to your domain. The problems you solve are complex, but your solutions are as simple as possible.'],
      'Communication': ['You are able to communicate your ideas effectively to achieve the right outcome for your team and customer. You seek diverse perspectives, listen to feedback, and are willing to change direction if it creates a better outcome. You harmonize conflicting views and lead the resolution of contentious issues.'],
      'Impact': ['You help them make data-driven decisions and appropriately prioritize changes to their product roadmap that result in measurable improvements to your customers\' experience.'],
      'Process Improvement': ['You drive the right long-term solutions. You proactively work to improve operational consistency between services. You look for opportunities to streamline procedures.'],
    },
    movingToNextSummary: [
      'You create and implement long-term technical solutions for repetitive or serious support problems. You are able to determine the right solution, working with stakeholders, partner teams, and peers. You deliver independently, with minimal guidance.',
      'You are able to solve complex technology problems related to operational support relevant to your domain. The problems you solve are complex, but your solutions are as simple as possible.',
      'You are able to lead regional cross-functional and/or cross-regional projects and initiatives through their full lifecycle.',
      'You handle escalations for your region which may involve the engagement of internal partner teams or vendors.',
      'You demonstrate your ability to positively influence and impact technologies made by internal teams. You help them make data-driven decisions and appropriately prioritize changes to their product roadmap that result in measurable improvements to your customers\' experience.',
      'You drive the right long-term solutions. You proactively work to improve operational consistency between services. You look for opportunities to streamline procedures.',
      'You are able to communicate your ideas effectively to achieve the right outcome for your team and customer. You seek diverse perspectives, listen to feedback, and are willing to change direction if it creates a better outcome.',
      'Your approach to technical support, design, and implementation decisions set a great example to others and demonstrate best practices. You work efficiently and routinely deliver the right things.',
      'You actively participate in the hiring process (where possible) as well as mentor others - improving their skills, their knowledge, and their ability to get things done.',
    ],
  },
};
