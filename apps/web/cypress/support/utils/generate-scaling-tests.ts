import { sub } from 'date-fns';
import { ScalingFixtureMap } from '../types';
import { CommonPointCalculatorData } from '@/app/schemas/rank-calculator';

export const generateScalingTests = <T extends CommonPointCalculatorData>(
  player: string,
  scalingFixtures: ScalingFixtureMap<T>,
  assertValues: (fixture: T) => void,
  /**
   * Category tile to open before asserting. A tile shows only its totals — the
   * per-input point values live in its modal.
   */
  openCategory?: RegExp,
) => {
  const openCategoryModal = () => {
    if (openCategory) {
      cy.findByRole('button', { name: openCategory }).click();
      cy.findByRole('dialog').should('be.visible');
    }
  };

  it('Calculates the correct points - Full scaling (100%)', () => {
    cy.visit(`/player/${player}`);
    cy.setJoinDate(
      sub(new Date(), {
        days: 180,
      }),
      '100.00%',
    );

    openCategoryModal();
    assertValues(scalingFixtures.fullScaling);
  });

  it('Calculates the correct points - Four month scaling (70%)', () => {
    cy.visit(`/player/${player}`);
    cy.setJoinDate(
      sub(new Date(), {
        days: 120,
      }),
      '70.00%',
    );

    openCategoryModal();
    assertValues(scalingFixtures.fourMonthScaling);
  });

  it('Calculates the correct points - Two month scaling (40%)', () => {
    cy.visit(`/player/${player}`);
    cy.setJoinDate(
      sub(new Date(), {
        days: 60,
      }),
      '40.00%',
    );

    openCategoryModal();
    assertValues(scalingFixtures.twoMonthScaling);
  });

  it('Calculates the correct points - Three week scaling (17.50%)', () => {
    cy.visit(`/player/${player}`);
    cy.setJoinDate(
      sub(new Date(), {
        days: 21,
      }),
      '17.50%',
    );

    openCategoryModal();
    assertValues(scalingFixtures.threeWeekScaling);
  });

  it('Calculates the correct points - No scaling (10%)', () => {
    cy.visit(`/player/${player}`);
    cy.setJoinDate(new Date(), '10.00%');

    openCategoryModal();
    assertValues(scalingFixtures.noScaling);
  });
};
