import {
  minimumJoinTotalLevel,
  totalLevelGraceDeadline,
} from '@/config/clan-requirements';
import { resolveTotalLevelGrace } from './resolve-total-level-grace';

const daysBeforeDeadline = (days: number) =>
  new Date(totalLevelGraceDeadline.getTime() - days * 24 * 60 * 60 * 1000);

describe('resolveTotalLevelGrace', () => {
  it('has nothing to say about a member above the minimum', () => {
    expect(
      resolveTotalLevelGrace(2000, daysBeforeDeadline(30)),
    ).toEqual({ status: 'met' });
  });

  it('has nothing to say at exactly the minimum', () => {
    expect(
      resolveTotalLevelGrace(minimumJoinTotalLevel, daysBeforeDeadline(30)),
    ).toEqual({ status: 'met' });
  });

  it('is in grace before the deadline, with the shortfall and days left', () => {
    expect(resolveTotalLevelGrace(1342, daysBeforeDeadline(30))).toEqual({
      status: 'in-grace',
      totalLevel: 1342,
      shortfall: minimumJoinTotalLevel - 1342,
      deadline: totalLevelGraceDeadline,
      daysRemaining: 30,
    });
  });

  it('rounds a part-day up, so the final day still counts as one', () => {
    const halfADayLeft = new Date(
      totalLevelGraceDeadline.getTime() - 12 * 60 * 60 * 1000,
    );

    expect(resolveTotalLevelGrace(1342, halfADayLeft)).toMatchObject({
      status: 'in-grace',
      daysRemaining: 1,
    });
  });

  it('is overdue once the deadline has passed', () => {
    expect(
      resolveTotalLevelGrace(1342, daysBeforeDeadline(-1)),
    ).toEqual({
      status: 'overdue',
      totalLevel: 1342,
      shortfall: minimumJoinTotalLevel - 1342,
      deadline: totalLevelGraceDeadline,
    });
  });

  it('is overdue exactly on the deadline', () => {
    expect(
      resolveTotalLevelGrace(1342, totalLevelGraceDeadline),
    ).toMatchObject({ status: 'overdue' });
  });

  it('does not move the deadline with the current date', () => {
    // The date members were told is fixed. A deadline derived from "now" at
    // render or deploy time would slide forward forever and stop being one.
    const early = resolveTotalLevelGrace(1342, daysBeforeDeadline(80));
    const late = resolveTotalLevelGrace(1342, daysBeforeDeadline(2));

    expect(early).toMatchObject({ deadline: totalLevelGraceDeadline });
    expect(late).toMatchObject({ deadline: totalLevelGraceDeadline });
  });
});
