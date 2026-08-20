import { CombatDiaryTier, ClogDiaryTier } from '@/app/schemas/custom-diaries';
import type { StaffRole } from '@/app/schemas/staff';
import { StandardRank } from './ranks';

export const rankDiscordRoles = {
  Champion: '697877518493155380',
  Recruit: '1135477022408323164',
  Pawn: '1381285474315931709',
  Corporal: '1135477170433708072',
  Novice: '1381285537867890698',
  Sergeant: '1135477241619431464',
  Cadet: '1135476308927856671',
  Lieutenant: '1135476150362177537',
  Proselyte: '1381285720056008794',
  Captain: '1135476053473759314',
  General: '1381285768563130428',
  Skulled: '1135475947148165130',
  Beast: '1135475800989245472',
} satisfies Record<StandardRank, string>;

export const mainAccountDiscordRoles = {
  Looter: '1390351909059297360',
} as const;

/**
 * The Discord role each staff role grants. These are the roles that actually
 * carry moderation permissions in the server, so `players.staff_role` and this
 * map together are what "elevated" means — the dashboard writes the former and
 * mirrors it onto the latter.
 *
 * The permission gradient in the server matches the ladder exactly:
 *
 * - Owner        — ADMINISTRATOR, plus everything below
 * - Deputy Owner — MANAGE_GUILD / MANAGE_CHANNELS / MANAGE_ROLES / kick / ban
 * - Staff        — MANAGE_ROLES / MANAGE_MESSAGES / kick / ban
 * - Moderator    — kick
 *
 * **`admin` is the Discord role named "Staff"**, not "Administrator" — the
 * server has no role by that name. It sits between Moderator and Deputy Owner
 * in both position and permissions, which is exactly the admin tier. In the
 * app the same role is titled Administrator (`staffRoleRanks.admin`), because
 * that is the in-game clan rank whose icon it borrows.
 *
 * Note that Staff carries MANAGE_ROLES, which is what
 * `userCanModerateSubmission` checks — so granting admin also grants the
 * ability to approve rank submissions.
 */
export const staffRoleDiscordRoles = {
  moderator: '697877518493155387',
  admin: '829386451624001539',
  deputy_owner: '697877518513864784',
  owner: '697877518513864786',
} satisfies Record<StaffRole, string>;

export const discordGuestRole = '1402713524861669498';

export const customDiaryDiscordRoles = {
  Combat: new Map<CombatDiaryTier, string>([
    ['Easy', '1385248680357003335'],
    ['Hard', '1385248881423417407'],
    ['Master', '1385248972037165086'],
    ['Grandmaster', '1385249095559549111'],
  ]),
  Clog: new Map<ClogDiaryTier, string>([
    ['Easy', '1399729580151144610'],
    ['Medium', '1399729884082999356'],
    ['Hard', '1399729884082999356'],
    ['Elite', '1399730120750534686'],
    ['Grandmaster', '1399730234307252264'],
  ]),
} as const satisfies {
  Combat: Map<CombatDiaryTier, string>;
  Clog: Map<ClogDiaryTier, string>;
};

export const achievementDiscordRoles = {} as const;
