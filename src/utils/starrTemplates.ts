import { STARREntry } from '../types';
import { v4 as uuid } from 'uuid';
import { getQuarter } from './helpers';

const today = new Date().toISOString().split('T')[0];

export const STARR_TEMPLATES: Omit<STARREntry, 'id' | 'quarter'>[] = [
  {
    title: 'Troubleshooting Without an SOP',
    situation: 'A customer contacted support with an issue that had no existing Standard Operating Procedure (SOP) or Knowledge Base article.',
    task: 'I needed to resolve the customer\'s issue despite no documented solution being available.',
    action: 'I researched the problem, tested potential solutions, and found a working fix by combining knowledge from multiple sources.',
    results: 'The customer\'s issue was resolved in a single contact. I then created a KB article documenting the solution for future engineers.',
    reflection: 'This experience reinforced the importance of deep technical curiosity and taking ownership beyond the standard playbook.',
    principles: ['Ownership', 'Insist on the Highest Standards'],
    date: today,
    impactLevel: 'High',
    evidenceLinks: [],
  },
  {
    title: 'Knowledge Base Article Creation',
    situation: 'I identified a recurring customer issue that was generating multiple contacts with no self-service solution available.',
    task: 'Create a customer-facing KB article to enable self-service and reduce contact volume.',
    action: 'I wrote clear step-by-step instructions, had them reviewed by a peer, and published the article on the internal knowledge base.',
    results: 'The article reduced contacts for this issue type and improved the self-serve experience for employees.',
    reflection: 'Proactively creating documentation scales my impact beyond individual contacts.',
    principles: ['Ownership', 'Bias for Action', 'Frugality'],
    date: today,
    impactLevel: 'Medium',
    evidenceLinks: [],
  },
  {
    title: 'Mentoring & Coaching Peers',
    situation: 'A colleague was struggling with customer satisfaction scores and needed support improving their communication approach.',
    task: 'Provide coaching and mentoring to help improve their CSAT results.',
    action: 'I conducted weekly shadowing sessions, provided real-time feedback on live contacts, and shared techniques for building trust and empathy with customers.',
    results: 'The engineer\'s CSAT improved significantly over the following quarter.',
    reflection: 'Investing time in developing others multiplies the team\'s overall performance.',
    principles: ['Earn Trust', 'Hire and Develop the Best', 'Learn and Be Curious'],
    date: today,
    impactLevel: 'High',
    evidenceLinks: [],
  },
  {
    title: 'Process Improvement Initiative',
    situation: 'I noticed a team process that was inefficient and causing delays or inconsistent results.',
    task: 'Propose and implement an improvement to streamline the process.',
    action: '',
    results: '',
    reflection: '',
    principles: ['Invent and Simplify', 'Bias for Action'],
    date: today,
    impactLevel: 'Medium',
    evidenceLinks: [],
  },
  {
    title: 'Handling a Difficult Customer Interaction',
    situation: 'A customer was frustrated after multiple failed attempts to resolve their issue with previous engineers.',
    task: 'Take ownership of the issue and restore the customer\'s confidence in our support.',
    action: '',
    results: '',
    reflection: '',
    principles: ['Customer Obsession', 'Earn Trust'],
    date: today,
    impactLevel: 'Medium',
    evidenceLinks: [],
  },
];

export function createFromTemplate(template: typeof STARR_TEMPLATES[0]): STARREntry {
  return { ...template, id: uuid(), quarter: getQuarter(template.date) };
}
