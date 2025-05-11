import { notableItemsExpectedValues } from '@/fixtures/rank-calculator/notable-items-expected-values';
import { generateScalingTests } from '@/cypress/support/utils/generate-scaling-tests';

describe('Notable items - Early-game player', () => {
  generateScalingTests(
    'riftletics',
    notableItemsExpectedValues.earlyGamePlayer,
    (fixture) => {
      cy.findByLabelText(/^total notable items points$/i).should(
        'have.text',
        `${fixture.pointsAwarded}`,
      );

      cy.findByLabelText(/^notable items points remaining$/i).should(
        'have.text',
        `(${fixture.pointsRemaining})`,
      );

      cy.findByLabelText(/^notable items point completion percentage$/i).should(
        'have.text',
        `${fixture.pointsAwardedPercentage}%`,
      );

      cy.findByLabelText(/^notable items collected$/i).should('have.text', '5');

      cy.findByLabelText(/^total notable items available$/i).should(
        'have.text',
        '295',
      );

      cy.findByLabelText(/^notable items collected percentage$/i).should(
        'have.text',
        '1.69%',
      );
    },
  );
});
