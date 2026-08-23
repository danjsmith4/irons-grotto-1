import { parseAccountType, resolveTempleAccountType } from './temple-api';
import { AccountType } from './staff';

/**
 * Real TempleOSRS `player_info.php` responses, read on 2026-08-20. Pinned here
 * rather than fetched so the expectations stay hermetic — and because two of
 * them are indistinguishable from a main at source, which is the whole reason
 * players are asked.
 */
const templeResponses = {
  '2Manny': { gameMode: 0, gim: 0 },
  'pilates guru': { gameMode: 0, gim: 25 },
  Aceriwyn: { gameMode: 1, gim: 0 },
  babyacer: { gameMode: 3, gim: 0 },
  EclipseGoon: { gameMode: 0, gim: 0 },
  'Fe Buu': { gameMode: 0, gim: 0 },
} as const;

const parse = (player: keyof typeof templeResponses) =>
  parseAccountType(
    templeResponses[player].gameMode,
    templeResponses[player].gim,
  );

const resolve = (player: keyof typeof templeResponses) =>
  resolveTempleAccountType(
    templeResponses[player].gameMode,
    templeResponses[player].gim,
  );

describe('parseAccountType', () => {
  it('reads an ironman', () => {
    expect(parse('Aceriwyn')).toEqual<AccountType>('ironman');
  });

  it('reads a hardcore ironman', () => {
    expect(parse('babyacer')).toEqual<AccountType>('hardcore_ironman');
  });

  it('reads an ultimate ironman', () => {
    expect(parseAccountType(2, 0)).toEqual<AccountType>('ultimate_ironman');
  });

  it.each([12, 13, 14, 15])('reads a regular group of %i', (gim) => {
    expect(parseAccountType(0, gim)).toEqual<AccountType>('group_ironman');
  });

  it.each([22, 23, 24, 25])('reads a hardcore group of %i', (gim) => {
    expect(parseAccountType(0, gim)).toEqual<AccountType>(
      'hardcore_group_ironman',
    );
  });

  it('prefers the group over the game mode, which reports a GIM as an ironman', () => {
    expect(parseAccountType(1, 12)).toEqual<AccountType>('group_ironman');
  });
});

describe('resolveTempleAccountType', () => {
  it.each([
    ['Aceriwyn', 'ironman'],
    ['babyacer', 'hardcore_ironman'],
    ['pilates guru', 'hardcore_group_ironman'],
  ] as const)('settles %s as %s', (player, expected) => {
    expect(resolve(player)).toEqual<AccountType>(expected);
  });

  /**
   * Temple only knows about a group once its members are tracked on Temple
   * individually, so it reports "main" both for actual mains and for group
   * ironmen it has never heard of — EclipseGoon and Fe Buu are group ironmen
   * that come back exactly like 2Manny, who really is a main. A main reading
   * is therefore the absence of an answer, not an answer.
   */
  it.each(['2Manny', 'EclipseGoon', 'Fe Buu'] as const)(
    'refuses to settle %s, whose response is indistinguishable from a main',
    (player) => {
      expect(resolve(player)).toBeNull();
    },
  );
});
