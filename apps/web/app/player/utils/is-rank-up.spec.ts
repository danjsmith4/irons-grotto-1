import { isRankUp } from './is-rank-up';
import { mainAccountRank } from '@/config/ranks';
import { staffRoleRanks } from '@/app/schemas/staff';

describe('isRankUp', () => {
  it('announces a promotion up the ironman ladder', () => {
    expect(isRankUp('Corporal', 'Novice', 'ironman')).toBe(true);
  });

  it('stays quiet when the calculated rank is the stored one', () => {
    expect(isRankUp('Corporal', 'Corporal', 'ironman')).toBe(false);
  });

  it('stays quiet for a demotion', () => {
    expect(isRankUp('Novice', 'Corporal', 'ironman')).toBe(false);
  });

  it('stays quiet without a stored rank', () => {
    expect(isRankUp(undefined, 'Corporal', 'ironman')).toBe(false);
  });

  // The bug this exists for: a staff rank is on no ladder, so a bare
  // inequality fired the rank-up dialog on every calculator load.
  it.each(Object.values(staffRoleRanks))(
    'stays quiet for a player still carrying the %s staff rank',
    (staffRank) => {
      expect(isRankUp(staffRank, 'Captain', 'ironman')).toBe(false);
    },
  );

  it('still announces the first rank for an unranked player', () => {
    expect(isRankUp('Unranked', 'Champion', 'ironman')).toBe(true);
  });

  it('treats an unresolved account type as an ironman', () => {
    expect(isRankUp('Corporal', 'Novice', null)).toBe(true);
  });

  it('announces the main-account rank for a player moving off the ironman ladder', () => {
    expect(isRankUp('Corporal', mainAccountRank, 'main')).toBe(true);
  });

  it('stays quiet for a main who already holds the main-account rank', () => {
    expect(isRankUp(mainAccountRank, mainAccountRank, 'main')).toBe(false);
  });

  it('stays quiet when the calculated rank is off the ladder in play', () => {
    expect(isRankUp('Corporal', 'Novice', 'main')).toBe(false);
  });
});
