import { AccountType } from '@/app/schemas/staff';
import {
  canApplyForRank,
  mainAccountRank,
  rankThresholdsFor,
} from './ranks';

describe('canApplyForRank', () => {
  it('refuses a main', () => {
    expect(canApplyForRank('main')).toBe(false);
  });

  it.each<AccountType>([
    'ironman',
    'hardcore_ironman',
    'ultimate_ironman',
    'group_ironman',
    'hardcore_group_ironman',
    'unranked_group_ironman',
  ])('allows %s', (accountType) => {
    expect(canApplyForRank(accountType)).toBe(true);
  });

  /**
   * Same rule as `rankThresholdsFor`: this is an ironman clan, so an account
   * nobody has established yet is never treated as a main on a guess.
   */
  it('allows an unresolved account', () => {
    expect(canApplyForRank(null)).toBe(true);
    expect(canApplyForRank(undefined)).toBe(true);
  });

  it('refuses exactly the accounts pinned to the main rank', () => {
    const isPinnedToMainRank = (accountType: AccountType | null) =>
      Object.keys(rankThresholdsFor(accountType)).every(
        (rank) => rank === mainAccountRank,
      );

    expect(isPinnedToMainRank('main')).toBe(true);
    expect(canApplyForRank('main')).toBe(false);
    expect(isPinnedToMainRank('ironman')).toBe(false);
    expect(canApplyForRank('ironman')).toBe(true);
  });
});
