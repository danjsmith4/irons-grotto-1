import type { TempleOSRSPlayerInfo } from '@/app/schemas/temple-api';
import { resolveAccountType } from './resolve-account-type';

/** Only two fields are read; the rest of the record is noise here. */
function templeInfo(gameMode: number, gim: number) {
  return { 'Game mode': gameMode, GIM: gim } as TempleOSRSPlayerInfo['data'];
}

describe('resolveAccountType', () => {
  it('takes a solo ironman reading from Temple', async () => {
    await expect(resolveAccountType(templeInfo(1, 0))).resolves.toEqual({
      status: 'resolved',
      accountType: 'ironman',
      source: 'temple',
    });
  });

  it('takes ultimate and hardcore from Temple too', async () => {
    await expect(resolveAccountType(templeInfo(2, 0))).resolves.toMatchObject({
      accountType: 'ultimate_ironman',
    });
    await expect(resolveAccountType(templeInfo(3, 0))).resolves.toMatchObject({
      accountType: 'hardcore_ironman',
    });
  });

  it('reads a tracked group ironman off the GIM field', async () => {
    // Verified live 2026-08-22: `FriccKip` of `friccnhecc` reports
    // `Game mode 0 / GIM 12` once the group is on Temple's GIM tracking.
    await expect(resolveAccountType(templeInfo(0, 12))).resolves.toMatchObject({
      accountType: 'group_ironman',
    });
    await expect(resolveAccountType(templeInfo(0, 22))).resolves.toMatchObject({
      accountType: 'hardcore_group_ironman',
    });
  });

  it('never infers a main, however little Temple knows', async () => {
    // A main reading is the *absence* of an answer: an untracked group ironman
    // is indistinguishable from a real main. Verified live 2026-08-22 —
    // `WhoKnowSteve` of the untracked `drippybros` reports `0 / 0`, exactly
    // like a main. So it resolves to nothing and the player is asked.
    await expect(resolveAccountType(templeInfo(0, 0))).resolves.toEqual({
      status: 'unresolved',
    });
  });

  it('treats no Temple record as no answer', async () => {
    await expect(resolveAccountType(null)).resolves.toEqual({
      status: 'unresolved',
    });
  });

  it('asks nothing but Temple', async () => {
    // The OSRS hiscores fallback is deliberately gone: it only ever changed
    // which badge an account got, since `rankThresholdsFor` branches on
    // nothing but `isMainAccount`. A second source that can disagree, for no
    // difference in outcome, is a cost with no benefit.
    const fetchSpy = jest.spyOn(globalThis, 'fetch');

    await resolveAccountType(templeInfo(0, 0));

    expect(fetchSpy).not.toHaveBeenCalled();

    fetchSpy.mockRestore();
  });
});
