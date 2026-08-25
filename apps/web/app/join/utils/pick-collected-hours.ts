/**
 * Picks the efficient-hours-collected figure to show, from the two TempleOSRS
 * reports.
 *
 * ⚠️ **Temple populates one rate and zeroes the rest.** It computes EHC at the
 * rate matching the `Game mode` it has on file, so `ehc_im` is a real number
 * for an account Temple knows is an ironman and a literal `0` for everyone
 * else — including every **group ironman**, which Temple files under
 * `Game mode 0` because a GIM appears on no individual ironman hiscore board.
 * Verified against `EclipseGoon`, a GIM: `ehc 109.28 / ehc_im 0`.
 *
 * Reading `ehc_im` unconditionally therefore showed zero collected hours to a
 * large share of this clan. So: take the ironman figure when Temple has
 * actually computed one, and otherwise take the figure it did compute.
 *
 * The stats endpoint solves the same problem with a `Primary_ehp` / `Primary_ehb`
 * pointer naming the populated field. The collection log has no `Primary_ehc`,
 * which is why this rule is written out rather than followed.
 *
 * ⚠️ **`0` is the sentinel *and* a legitimate value**, which is why this is a
 * spec'd function rather than a `||` at the call site. A brand new ironman
 * genuinely has zero collected hours; that case still renders `0`, because the
 * fallback lands on `ehc`, which is also zero. What must never happen is a
 * player with hundreds of hours being shown none.
 */
export function pickCollectedHours(
  ehc: number | null | undefined,
  ehcIronman: number | null | undefined,
): number | null {
  if (typeof ehcIronman === 'number' && ehcIronman > 0) {
    return ehcIronman;
  }

  return typeof ehc === 'number' ? ehc : null;
}
