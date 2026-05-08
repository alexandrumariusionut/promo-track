import { AppState, STAREntry } from '../types';

const PORTFOLIO_CONTEXT = (state: AppState) => `You are an AI assistant helping an Amazon employee build their promotion portfolio.
Employee: ${state.profile.name || 'Unknown'}, ${state.profile.role || 'Unknown role'}
Current level: ${state.profile.level}, Target: ${state.profile.targetLevel}
Team: ${state.profile.team || 'Unknown'}
Be concise, specific, and actionable. Use Amazon terminology naturally.`;

export const PROMPTS = {
  improveStar: (state: AppState, entry: STAREntry) => ({
    system: `${PORTFOLIO_CONTEXT(state)}
You rewrite STAR entries for promotion documents.

You MUST output EXACTLY this format with these EXACT headers on their own lines:

Situation
[your text here]

Task
[your text here]

Action
[your text here]

Results
[your text here]

CRITICAL RULES:
- Each header (Situation, Task, Action, Results) MUST be on its own line with NO colon
- The text for each section goes on the NEXT line(s) after the header
- Keep each section to 2-3 sentences MAX — brevity is key
- Use short, punchy sentences. No filler words or fluff
- Start Action bullets with strong verbs (Led, Built, Designed, Drove)
- Quantify results with specific numbers, percentages, or timeframes
- Use first person "I" throughout
- Write at a senior level: direct, confident, no hedging
- Output NOTHING else — no title, no intro, no commentary`,
    user: `Rewrite this STAR entry:

Situation: ${entry.situation || 'Not provided'}
Task: ${entry.task || 'Not provided'}
Action: ${entry.action || 'Not provided'}
Results: ${entry.results || 'Not provided'}

Tagged LPs: ${entry.principles.join(', ') || 'None'}`,
  }),

  suggestLPs: (state: AppState, text: string) => ({
    system: `${PORTFOLIO_CONTEXT(state)}
Analyze text and suggest which Amazon Leadership Principles it best demonstrates.
Return a JSON array of LP names, ranked by relevance. Only include LPs that are clearly demonstrated.
Valid LPs: Customer Obsession, Ownership, Invent and Simplify, Are Right A Lot, Learn and Be Curious, Hire and Develop the Best, Insist on the Highest Standards, Think Big, Bias for Action, Frugality, Earn Trust, Dive Deep, Have Backbone; Disagree and Commit, Deliver Results, Strive to be Earth's Best Employer, Success and Scale Bring Broad Responsibility.
Return ONLY the JSON array, nothing else.`,
    user: text,
  }),

  draftScope: (state: AppState) => ({
    system: `${PORTFOLIO_CONTEXT(state)}
Write a Scope of Role section for a promotion document. This should describe what any person in this role does (not specific to the employee). 300-500 words. Write in third person.`,
    user: `Draft a Scope of Role for: ${state.profile.role || 'IT Support Engineer'} at level ${state.profile.targetLevel} in the ${state.profile.team || 'IT'} team.`,
  }),

  gapAnalysis: (state: AppState) => ({
    system: `${PORTFOLIO_CONTEXT(state)}
Analyze this promotion portfolio and identify gaps. Be specific about what's missing and what to add. Format as a prioritized bullet list.`,
    user: `Portfolio status:
- STAR entries: ${state.star.length} (covering LPs: ${[...new Set(state.star.flatMap(s => s.principles))].join(', ') || 'none'})
- Metrics: ${state.metrics.length} imported
- Scope of Role: ${state.scopeOfRole ? `${state.scopeOfRole.split(/\s+/).length} words` : 'not written'}
- Best Reasons Not to Promote: ${state.bestReasonsNotToPromote ? 'written' : 'not written'}
- Profile complete: ${state.profile.name && state.profile.manager ? 'yes' : 'no'}

What are the top gaps to address before submitting?`,
  }),

  analyzeDimensions: (state: AppState, movingToNextCriteria: string) => ({
    system: `${PORTFOLIO_CONTEXT(state)}
You analyze STAR promotion entries against functional dimensions for Amazon promotions.

Rules:
- Write in plain, direct English. No metaphors. No corporate jargon. No "demonstrates ability to".
- Keep every summary under 20 words.
- Keep every suggestion under 40 words.
- Be specific: name the entry titles, name the metrics, name what's missing.
- Return ONLY valid JSON, no markdown.

The 7 Functional Dimensions are: Ambiguity, Scope & Influence, Execution, Problem Complexity, Communication, Impact, Process Improvement.

Promotion criteria the employee must show:
${movingToNextCriteria}

Return this exact JSON shape:
{
  "dimensions": {
    "DimensionName": {
      "strength": "strong|moderate|weak",
      "summary": "One plain sentence about what the entries prove.",
      "entryTitles": ["Entry Title 1", "Entry Title 2"]
    }
  },
  "gaps": [
    {
      "dimension": "DimensionName",
      "priority": "high|medium",
      "suggestion": "What to write about. Be specific."
    }
  ]
}

Strength rules:
- strong: 2+ entries clearly show this dimension
- moderate: 1 entry or indirect evidence only
- weak: barely mentioned, needs more

Gap rules:
- high priority: dimension has zero coverage
- medium priority: dimension is weak
- Order gaps array by priority (high first)
- Include weak dimensions in BOTH dimensions object AND gaps array`,
    user: `Analyze these STAR entries against the 7 functional dimensions for ${state.profile.targetLevel}.

${state.star.map(e => `[ID: ${e.id}] "${e.title}"
Situation: ${e.situation}
Task: ${e.task}
Action: ${e.action}
Results: ${e.results}
`).join('\n---\n')}

Respond with ONLY the JSON object.`,
  }),
};
