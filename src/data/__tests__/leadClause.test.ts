import { describe, it, expect } from 'vitest';
import { GUIDELINES } from '../../data/levelGuidelines';

/**
 * Guards the 'nothing invented' rule:
 * Every leadClause must be an exact case-insensitive substring of the guideline's
 * name OR rubric (the verbatim text sources).
 */
describe('leadClause substring integrity', () => {
  for (const level of ['L4', 'L5'] as const) {
    describe(`${level} guidelines`, () => {
      for (const guideline of GUIDELINES[level]) {
        it(`${guideline.id}: leadClause is a verbatim substring of name or rubric`, () => {
          const leadLower = guideline.leadClause.toLowerCase();
          const nameLower = guideline.name.toLowerCase();
          const rubricLower = guideline.rubric.toLowerCase();

          const isInName = nameLower.includes(leadLower);
          const isInRubric = rubricLower.includes(leadLower);

          expect(
            isInName || isInRubric,
            `leadClause "${guideline.leadClause}" is not a substring of name "${guideline.name}" or rubric "${guideline.rubric}"`,
          ).toBe(true);
        });

        it(`${guideline.id}: leadClause is between 3 and 10 words`, () => {
          const wordCount = guideline.leadClause.split(/\s+/).length;
          expect(wordCount).toBeGreaterThanOrEqual(3);
          expect(wordCount).toBeLessThanOrEqual(10);
        });

        it(`${guideline.id}: has a valid icon identifier`, () => {
          const validIcons = ['BugReport', 'RocketLaunch', 'PublishedWithChanges', 'AdminPanelSettings', 'Psychology', 'Balance', 'MenuBook'];
          expect(validIcons).toContain(guideline.icon);
        });
      }
    });
  }
});
