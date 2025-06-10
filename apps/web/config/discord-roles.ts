import {
  TavernDiarySection,
  TavernDiaryTier,
} from '@/app/schemas/tavern-diaries';
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

export const tavernDiaryDiscordRoles = {
  'Collection Log': new Map<TavernDiaryTier, string>([
    ['Drunkard', '1368972998744477807'],
    ['Bartender', '1368973172929724517'],
    ['Landlord', '1368973243876245564'],
    ['Baron', '1368973306493141042'],
    ['Duke', '1368973376542212126'],
  ]),
  Combat: new Map<TavernDiaryTier, string>([
    ['Drunkard', '1368972199494422590'],
    ['Bartender', '1368972375806181578'],
    ['Landlord', '1368972466474717214'],
    ['Baron', '1368972527522680894'],
    ['Duke', '1368972613338271744'],
  ]),
  Skilling: new Map<TavernDiaryTier, string>([
    ['Drunkard', '1368972674713387048'],
    ['Bartender', '1368972745681014784'],
    ['Landlord', '1368972813494386861'],
    ['Baron', '1368972884252295369'],
    ['Duke', '1368972944893542534'],
  ]),
} as const satisfies Record<TavernDiarySection, Map<TavernDiaryTier, string>>;

export const achievementDiscordRoles = {
  Grandmaster: '1042811412063465543',
  'Blood Torva': '1138949636103610489',
} as const;
