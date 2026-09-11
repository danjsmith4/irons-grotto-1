import { rankUpToAnnounce, RankUpAnnouncementInput } from './rank-up-to-announce';
import { mainAccountRank } from '@/config/ranks';

const crossing = {
  heldRank: 'Captain',
  previousRank: 'Captain',
  calculatedRank: 'General',
  accountType: 'ironman',
  lastAnnouncedRank: null,
} satisfies RankUpAnnouncementInput;

describe('rankUpToAnnounce', () => {
  it('announces a refresh that crosses into a rank above the one held', () => {
    expect(rankUpToAnnounce(crossing)).toBe('General');
  });

  // The design decision: eligibility the member has been sitting on is not
  // news. Without this, every member above their held rank is messaged on the
  // first run after it ships.
  it('stays quiet when the refresh did not move the calculated rank', () => {
    expect(
      rankUpToAnnounce({
        ...crossing,
        heldRank: 'Lieutenant',
        previousRank: 'General',
      }),
    ).toBeNull();
  });

  it('stays quiet when the calculated rank went down', () => {
    expect(
      rankUpToAnnounce({
        ...crossing,
        previousRank: 'Skulled',
        calculatedRank: 'General',
      }),
    ).toBeNull();
  });

  it('announces the rank landed on when a refresh skips one', () => {
    expect(
      rankUpToAnnounce({
        ...crossing,
        heldRank: 'Lieutenant',
        previousRank: 'Proselyte',
        calculatedRank: 'General',
      }),
    ).toBe('General');
  });

  it('stays quiet when the crossing is below the rank already held', () => {
    expect(
      rankUpToAnnounce({
        ...crossing,
        heldRank: 'Skulled',
        previousRank: 'Captain',
        calculatedRank: 'General',
      }),
    ).toBeNull();
  });

  it('stays quiet for a staff member still carrying a staff rank', () => {
    expect(
      rankUpToAnnounce({ ...crossing, heldRank: 'Moderator' }),
    ).toBeNull();
  });

  it('stays quiet for a main, who has nothing to apply for', () => {
    expect(
      rankUpToAnnounce({
        ...crossing,
        heldRank: 'Unranked',
        previousRank: 'Champion',
        calculatedRank: mainAccountRank,
        accountType: 'main',
      }),
    ).toBeNull();
  });

  it('treats an unresolved account type as an ironman', () => {
    expect(rankUpToAnnounce({ ...crossing, accountType: null })).toBe(
      'General',
    );
  });

  // A total that dips under a threshold (a drop-rate correction on the wiki)
  // and climbs back must not announce the same rank twice.
  it('stays quiet for a rank already announced', () => {
    expect(
      rankUpToAnnounce({ ...crossing, lastAnnouncedRank: 'General' }),
    ).toBeNull();
  });

  it('stays quiet for a rank below one already announced', () => {
    expect(
      rankUpToAnnounce({ ...crossing, lastAnnouncedRank: 'Skulled' }),
    ).toBeNull();
  });

  it('announces a rank above the last one announced', () => {
    expect(
      rankUpToAnnounce({ ...crossing, lastAnnouncedRank: 'Captain' }),
    ).toBe('General');
  });
});
