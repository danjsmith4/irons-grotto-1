import { pickCollectedHours } from './pick-collected-hours';

describe('pickCollectedHours', () => {
  it('takes the ironman figure when Temple computed one', () => {
    // Riftletics, a tracked ironman, as Temple reports them.
    expect(pickCollectedHours(512.0629, 525.3192)).toBe(525.3192);
  });

  /**
   * The regression this function exists for.
   *
   * TempleOSRS files a group ironman under `Game mode 0` — a GIM appears on no
   * individual ironman hiscore board — so it computes the main rate and leaves
   * `ehc_im` at a literal zero. Reading `ehc_im` unconditionally showed "0
   * EHC" to every GIM and every main in the clan.
   */
  it('falls back when Temple left the ironman figure at zero', () => {
    // EclipseGoon, a group ironman, as Temple reports them.
    expect(pickCollectedHours(109.2791, 0)).toBe(109.2791);
  });

  it('falls back when the ironman figure is absent entirely', () => {
    expect(pickCollectedHours(109.2791, null)).toBe(109.2791);
    expect(pickCollectedHours(109.2791, undefined)).toBe(109.2791);
  });

  it('reports a genuine zero rather than nothing', () => {
    // A brand new ironman really has collected no hours. Both figures are zero,
    // so zero is the honest answer — it is not the same as an unread source.
    expect(pickCollectedHours(0, 0)).toBe(0);
  });

  it('is null only when neither figure exists', () => {
    expect(pickCollectedHours(null, null)).toBeNull();
    expect(pickCollectedHours(undefined, undefined)).toBeNull();
  });

  it('never returns a zero while a real figure is available', () => {
    // The property that matters: a player with hundreds of hours is never shown
    // none, whichever way round Temple happens to have populated them.
    expect(pickCollectedHours(0, 525.3192)).toBe(525.3192);
    expect(pickCollectedHours(109.2791, 0)).toBe(109.2791);
  });
});
