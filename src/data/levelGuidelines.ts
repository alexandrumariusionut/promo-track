import { JobLevel } from '../types';

export const FUNCTIONAL_DIMENSIONS = [
  'Ambiguity',
  'Scope & Influence',
  'Execution',
  'Problem Complexity',
  'Communication',
  'Impact',
  'Process Improvement',
] as const;

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
