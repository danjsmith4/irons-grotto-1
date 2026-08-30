import {
  minimumJoinTotalLevel,
  totalLevelGraceDeadline,
} from '@/config/clan-requirements';

export type TotalLevelGrace =
  /** At or above the floor — nothing to say. */
  | { status: 'met' }
  /** Below it, with time left to get there. */
  | {
      status: 'in-grace';
      totalLevel: number;
      shortfall: number;
      deadline: Date;
      daysRemaining: number;
    }
  /** Below it, past the date. */
  | { status: 'overdue'; totalLevel: number; shortfall: number; deadline: Date };

const millisecondsPerDay = 24 * 60 * 60 * 1000;

/**
 * Where a member who was already here stands against the new minimum.
 *
 * The 1500 floor is enforced at the door, so it cannot be applied retroactively
 * to the roster without throwing people out of a clan they joined under
 * different rules. Instead, everyone already below the line has until
 * `totalLevelGraceDeadline` to reach it.
 *
 * ⚠️ **Membership of that grandfathered set needs no flag and no column.**
 * Because `canPassTotalLevelGate` refuses every new signup below the floor,
 * *any* member sitting below it is by construction someone who was already here
 * — or someone admitted while a source was down, who belongs in exactly the same
 * conversation. Storing an `is_grandfathered` boolean would add a second answer
 * to a question the total level already answers, and second answers drift.
 *
 * ⚠️ **`overdue` does nothing on its own.** It does not deactivate, unrank,
 * delete, or hide anybody; it changes the wording a member sees and how they
 * are marked in the staff list. Removing someone from a clan is a decision for
 * a person, and this function exists to inform that decision rather than to
 * take it. Nothing downstream may treat it as an instruction.
 */
export function resolveTotalLevelGrace(
  totalLevel: number,
  now: Date,
): TotalLevelGrace {
  if (totalLevel >= minimumJoinTotalLevel) {
    return { status: 'met' };
  }

  const shortfall = minimumJoinTotalLevel - totalLevel;
  const deadline = totalLevelGraceDeadline;
  const remaining = deadline.getTime() - now.getTime();

  if (remaining <= 0) {
    return { status: 'overdue', totalLevel, shortfall, deadline };
  }

  return {
    status: 'in-grace',
    totalLevel,
    shortfall,
    deadline,
    // Rounded up: with any part of a day left, that day still counts as one the
    // member has. Rounding down would show "0 days" for most of the final day.
    daysRemaining: Math.ceil(remaining / millisecondsPerDay),
  };
}
