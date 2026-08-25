import type { CollectionLogScan, TempleScan } from '../scan-types';

export interface PlayerStat {
  label: string;
  value: string;
}

/**
 * The headline numbers shown beside the player's name during the scan.
 *
 * Built from whatever has resolved, in a fixed order, so figures land in the
 * same places every time rather than shuffling as sources come back.
 *
 * ⚠️ **An unknown figure is omitted, never shown as zero.** A source that has
 * not answered yet — or cannot — has said nothing about the player, and `0 EHB`
 * is a statement that they have never killed anything. That distinction is the
 * same one `player_derived_items` exists to protect elsewhere; here it costs
 * nothing to get right.
 *
 * All three efficiency figures are **ironman** rates, which is how the scans
 * hand them over. This is an ironman clan and the ladder scores everyone on
 * ironman EHB, so a main shown their main-rate hours would be reading a
 * different unit from the one their rank is measured in.
 */
export function buildPlayerStats(
  temple: Pick<TempleScan, 'totalLevel' | 'ehb' | 'ehp'> | null,
  collectionLog: Pick<CollectionLogScan, 'ehc'> | null,
): PlayerStat[] {
  const figures: { label: string; value: number | null; whole?: boolean }[] = [
    { label: 'Total', value: temple?.totalLevel ?? null, whole: true },
    { label: 'EHB', value: temple?.ehb ?? null },
    { label: 'EHP', value: temple?.ehp ?? null },
    { label: 'EHC', value: collectionLog?.ehc ?? null },
  ];

  return figures.flatMap(({ label, value, whole }) =>
    value == null
      ? []
      : [
          {
            label,
            // Efficiency hours come back with four decimals. Nobody reads them
            // to that precision, and they would not fit beside the name.
            value: (whole ? value : Math.round(value)).toLocaleString(),
          },
        ],
  );
}
