import {
  CustomDiarySection,
  CustomDiaryTier,
} from '@/app/schemas/custom-diaries';
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

export const customDiaryDiscordRoles = {
  Combat: new Map<CustomDiaryTier, string>([
    ['Easy', '1385248680357003335'],
    ['Hard', '1385248881423417407'],
    ['Master', '1385248972037165086'],
    ['Grandmaster', '1385249095559549111'],
  ]),
} as const satisfies Record<CustomDiarySection, Map<CustomDiaryTier, string>>;

export const achievementDiscordRoles = {} as const;
