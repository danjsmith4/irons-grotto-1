import { BingoBoard } from '../types/bingo-tile';

export const sampleBingoBoard: BingoBoard = {
    id: 'clan-vs-clan-2025',
    title: 'Clan vs Clan Bingo 2025',
    tiles: [
        {
            id: 'tile-1',
            header: 'CoX',
            image: 'Olmlet',
            tasks: [
                {
                    id: 'scrolls',
                    title: 'Dex + Arcane (x2)',
                    description: 'Obtain 2 Dexterous prayer scrolls and 2 Arcane prayer scrolls.',
                    points: 4,
                },
                {
                    id: 'dhcb-buckler',
                    title: 'DHCB & Buckler',
                    description: 'Obtain Dragon Hunter Crossbow and Twisted Buckler.',
                    points: 6,
                },
                {
                    id: 'ancestral',
                    title: 'Full Ancestral',
                    description: 'Obtain all pieces of the Ancestral Robe set.',
                    points: 16,
                },
            ],
        },
        {
            id: 'tile-2',
            header: 'ToB',
            image: 'Lil\'_Zik',
            tasks: [
                {
                    id: 'avernic',
                    title: 'Avernic (x3)',
                    description: 'Obtain 3 Avernic Defender Hilts.',
                    points: 4,
                },
                {
                    id: 'rapier-sang',
                    title: 'Rapier + Sang',
                    description: 'Obtain a Ghrazi Rapier and Sanguinesti Staff.',
                    points: 6,
                },
                {
                    id: 'scythe',
                    title: 'Scythe of Vitur',
                    description: 'Obtain 1 Scythe of Vitur.',
                    points: 15,
                },
            ],
        },
        {
            id: 'tile-3',
            header: 'ToA',
            image: 'Tumeken\'s_shadow',
            tasks: [
                {
                    id: 'lb-fang',
                    title: 'LB + Fang (x2)',
                    description: 'Obtain 2 Lightbearers and 2 Osmumten\'s Fangs.',
                    points: 4,
                },
                {
                    id: 'masori',
                    title: 'Full Masori',
                    description: 'Obtain all pieces of the Masori Armour set.',
                    points: 6,
                },
                {
                    id: 'shadow',
                    title: 'Shadow',
                    description: 'Obtain 1 Tumeken\'s Shadow.',
                    points: 13,
                },
            ],
        },
        {
            id: 'tile-4',
            header: 'HMT',
            image: 'Sanguine_ornament_kit',
            tasks: [
                {
                    id: '2m-tob-chest',
                    title: '<100k Chest',
                    description: 'Obtain a monumental chest from HMT of non-unique items with a total value under 100k GP, that is not a cabbage.',
                    points: 1,
                },
                {
                    id: 'hmt-kit',
                    title: 'HMT kit (x2)',
                    description: 'Obtain any 2 Ornament kits from the Hard Mode Theatre of Blood.',
                    points: 4,
                },
                {
                    id: 'hmt-dust',
                    title: 'HMT dust',
                    description: 'Obtain 1 Sanguine Dust from the Hard mode Theatre of Blood.',
                    points: 10,
                },
            ],
        },
        {
            id: 'tile-5',
            header: 'CM',
            image: 'Metamorphic_dust',
            tasks: [
                {
                    id: 'cm-kit',
                    title: 'Twisted Ancestral Colour Kit (x2)',
                    description: 'Obtain 2 Twisted Ancestral Colour Kits.',
                    points: 5,
                },
                {
                    id: 'cm-dust',
                    title: 'Metamorphic Dust',
                    description: 'Obtain a metamorphic dust.',
                    points: 8,
                },
                {
                    id: 'cm-mega-rare',
                    title: 'Mega Rare',
                    description: 'Obtain one of the following items from Chambers of Xeric (CM or Normal): Kodai Insignia, Twisted Bow, and Elder Maul.',
                    points: 12,
                },
            ],
        },
        {
            id: 'tile-6',
            header: 'DT2',
            image: 'Ultor_ring',
            tasks: [
                {
                    id: 'ingots',
                    title: 'Chromium Ingot (x6)',
                    description: 'Obtain 6 Chromium Ingots.',
                    points: 4,
                },
                {
                    id: 'virtus-full',
                    title: 'Full Virtus',
                    description: 'Obtain the complete Virtus Robe set.',
                    points: 8,
                },
                {
                    id: 'sra',
                    title: 'SRA',
                    description: 'Complete the Soulreaper Axe from scratch, obtain each of the following: Eye of the Duke, Leviathan\'s Lure, Executioner\'s Axe Head, and Siren\'s Staff.',
                    points: 12,
                },
            ],
        },
        {
            id: 'tile-7',
            header: 'Hard Mode Bingo',
            image: 'Sanguine_dust',
            tasks: [
                {
                    id: 'toa-500',
                    title: '500 ToA Challenge',
                    description: 'Complete the Tombs of Amascut while completing Amascut\'s Remnant and But... Damage in the same raid.',
                    points: 4,
                },
                {
                    id: 'deep-digger',
                    title: 'Delve 25+',
                    description: 'Complete Delve 25 at the Doom of Mokhaiotl',
                    points: 4,
                },
                {
                    id: 'hmt-challenge',
                    title: 'HMT Duo',
                    description: 'Complete the Theatre of Blood: Hard Mode with 2 players or fewer.',
                    points: 4,
                },
            ],
        },
        {
            id: 'tile-8',
            header: 'Slayer',
            image: 'Araxyte_fang',
            tasks: [
                {
                    id: 'twinflame-zombie-axe',
                    title: 'Twinflame Staff & Zombie axe',
                    description: 'Obtain the Twinflame Staff and Broken Zombie Axe.',
                    points: 2,
                },
                {
                    id: 'zenyte-4',
                    title: 'Zenyte (x4)',
                    description: 'Obtain 4 Zenyte Shards.',
                    points: 4,
                },
                {
                    id: 'arax-fang-2',
                    title: 'Araxyte fang (x2)',
                    description: 'Obtain 2 Araxyte Fangs.',
                    points: 8,
                },
            ],
        },
        {
            id: 'tile-9',
            header: 'Barrows & More',
            image: 'Chest_(Barrows,_open)',
            tasks: [
                {
                    id: 'barrows',
                    title: 'Barrows Weapons (x5)',
                    description: 'Obtain 5 Barrows Weapons.',
                    points: 2,
                },
                {
                    id: 'perilous-moons',
                    title: 'Perilous Moons Items (x12)',
                    description: 'Obtain 12 Perilous Moons items.',
                    points: 4,
                },
                {
                    id: 'tormented-synapse',
                    title: 'Tormented Synapse (x3)',
                    description: 'Obtain 3 Tormented Synapses.',
                    points: 6,
                },
            ],
        },
        {
            id: 'tile-10',
            header: 'Melee Armor',
            image: 'Torva_platebody',
            tasks: [
                {
                    id: 'bandos',
                    title: 'Full Bandos',
                    description: 'Obtain the complete Bandos Armour set, including boots.',
                    points: 3,
                },
                {
                    id: 'oathplate',
                    title: 'Full Oathplate',
                    description: 'Obtain the complete Oathplate Armour set, you must obtain the drops, you cannot craft a piece.',
                    points: 6,
                },
                {
                    id: 'torva',
                    title: 'Full Torva',
                    description: 'Obtain the complete Torva Armour set.',
                    points: 10,
                },
            ],
        },
        {
            id: 'tile-11',
            header: 'CoX Challenge',
            image: 'Ancient_chest',
            tasks: [
                {
                    id: 'cox-300k',
                    title: '300k Point CoX',
                    description: 'Complete a raid gaining 300k+ points as a team from the Chambers of Xeric.',
                    points: 4,
                },
                {
                    id: 'cox-500k',
                    title: '500k Point CoX',
                    description: 'Complete a raid gaining 500k+ points as a team from the Chambers of Xeric.',
                    points: 6,
                },
                {
                    id: 'cox-double-purple',
                    title: 'Double Purple CoX',
                    description: 'Complete a raid gaining over 570,000 points as a team from the Chambers of Xeric.',
                    points: 12,
                },
            ],
        },
        {
            id: 'tile-12',
            header: 'Ranged Upgrades',
            image: 'Armadyl_chestplate',
            tasks: [
                {
                    id: 'arma-1',
                    title: 'Full Armadyl',
                    description: 'Obtain the complete Armadyl Armour set.',
                    points: 4,
                },
                {
                    id: 'arma-2',
                    title: 'Zaryte vambraces (x2)',
                    description: 'Obtain 2 Zaryte Vambraces.',
                    points: 6,
                },
                {
                    id: 'arma-3',
                    title: 'Nihil Horn (x2)',
                    description: 'Obtain 2 Nihil Horns.',
                    points: 12,
                },
            ],
        },
        {
            id: 'tile-13',
            header: 'Component \'Scape',
            image: 'Green_triangle',
            tasks: [
                {
                    id: 'armour-seeds',
                    title: 'Armour Seeds (x6)',
                    description: 'Obtain 6 Crystal Armour Seeds from The Gauntlet.',
                    points: 3,
                },
                {
                    id: 'venator-shards-10',
                    title: 'Venator shards (x10)',
                    description: 'Obtain 10 Venator shards from the Phantom Muspah.',
                    points: 6,
                },
                {
                    id: 'enhanced-weapon-seed-2',
                    title: 'Enhanced Weapon Seed (x2)',
                    description: 'Obtain 2 Enhanced Crystal Weapon Seeds from The Gauntlet.',
                    points: 8,
                },
            ],
        },
        {
            id: 'tile-14',
            header: 'Doom',
            image: 'Doom_of_Mokhaiotl',
            tasks: [
                {
                    id: 'cloth',
                    title: 'Mokhaiotl cloth (x3)',
                    description: 'Obtain 3 Mokhaiotl Cloths.',
                    points: 6,
                },
                {
                    id: 'eye-of-ayak',
                    title: 'Eye of Ayak (x3)',
                    description: 'Obtain 3 Eyes of Ayak.',
                    points: 8,
                },
                {
                    id: 'avernic-treads',
                    title: 'Avernic treads (x3)',
                    description: 'Obtain 3 Avernic Treads.',
                    points: 10,
                },
            ],
        },
        {
            id: 'tile-15',
            header: 'Corp',
            image: 'Corporeal_Beast',
            tasks: [
                {
                    id: 'spirit-shield-3',
                    title: 'Spirit shield (x3)',
                    description: 'Obtain 3 Spirit Shields.',
                    points: 1,
                },
                {
                    id: 'elixir-2',
                    title: 'Elixir (x2)',
                    description: 'Obtain 2 Holy Elixirs.',
                    points: 4,
                },
                {
                    id: 'sigil-1',
                    title: 'Sigil (x1)',
                    description: 'Obtain any Sigil.',
                    points: 10,
                },
            ],
        },
        {
            id: 'tile-16',
            header: 'Budget',
            description: 'You must provide a before & after screenshot, including all ammunition, charges, supplies, and runes in the items kept on death user interface, with all options selected, besides protect from item. Each clan member can only complete one of these challenges.',
            image: 'Coins_10000',
            tasks: [
                {
                    id: 'fcape',
                    title: 'Six Jads',
                    description: 'Complete the 6 Jad challenge with an empty inventory, you may prepot, but you cannot smuggle runes.',
                    points: 4,
                },
                {
                    id: 'colosseum',
                    title: 'Budget Colosseum',
                    description: 'Complete the Fortis Colosseum with a budget of 20m GP.',
                    points: 4,
                },
                {
                    id: 'budget-inferno',
                    title: 'Budget Inferno',
                    description: 'Complete the Inferno with a budget of 50m GP.',
                    points: 4,
                },
            ],
        },
        {
            id: 'tile-17',
            header: 'Wilderness',
            image: 'Dragon_pickaxe',
            tasks: [
                {
                    id: 'dragon-pickaxe-4',
                    title: 'Dragon Pickaxe (x4)',
                    description: 'Obtain 4 Dragon Pickaxes.',
                    points: 1,
                },
                {
                    id: 'wildy-ring-2',
                    title: 'Wilderness Ring (x2)',
                    description: 'Obtain any 2 Wilderness Rings.',
                    points: 3,
                },
                {
                    id: 'voidwaker-1',
                    title: 'Voidwaker (x1)',
                    description: 'Complete a Voidwaker from scratch.',
                    points: 6,
                },
            ],
        },
        {
            id: 'tile-18',
            header: 'K\'ril',
            image: 'K\'ril_Tsutsaroth',
            tasks: [
                {
                    id: 'zamorak-spear-3',
                    title: 'Zamorakian Spear (x3)',
                    description: 'Obtain 3 Zamorakian Spears.',
                    points: 1,
                },
                {
                    id: 'sotd-steam',
                    title: 'SoTD & Steam',
                    description: 'Obtain a Staff of the Dead and a Steam Battlestaff.',
                    points: 3,
                },
                {
                    id: 'zgs-from-scratch',
                    title: 'ZGS from scratch',
                    description: 'Complete a Zamorak Godsword from scratch, including shards.',
                    points: 6,
                },
            ],
        },
        {
            id: 'tile-19',
            header: 'Zilyana',
            image: 'Commander_Zilyana',
            tasks: [
                {
                    id: 'light-sword-4',
                    title: 'Saradomin\'s Light/Sword (x4)',
                    description: 'Obtain 4 of either Saradomin\'s Light or Saradomin\'s Sword.',
                    points: 2,
                },
                {
                    id: 'acb-2',
                    title: 'Armadyl Crossbow (x2)',
                    description: 'Obtain 2 Armadyl Crossbows.',
                    points: 3,
                },
                {
                    id: 'sgs-from-scratch',
                    title: 'SGS from scratch',
                    description: 'Complete a Saradomin Godsword from scratch, including shards.',
                    points: 4,
                },
            ],
        },
        {
            id: 'tile-20',
            header: 'Misc Drops',
            image: 'Crystal_tool_seed',
            tasks: [
                {
                    id: 'dragon-knives-thrown-axe',
                    title: 'Dragon Knives & Dragon Thrownaxe',
                    description: 'Obtain both Dragon Knives and Dragon Thrownaxe drops.',
                    points: 4,
                },
                {
                    id: 'dragon-sword-harpoon',
                    title: 'Dragon sword & Harpoon',
                    description: 'Obtain a Dragon Sword and a Dragon Harpoon.',
                    points: 4,
                },
                {
                    id: 'crystal-tool-seed',
                    title: 'Crystal Tool Seed',
                    description: 'Obtain a Crystal Tool Seed.',
                    points: 8,
                },
            ],
        },
        {
            id: 'tile-21',
            header: 'Clues',
            image: 'Reward_casket_(master)',
            tasks: [
                {
                    id: 'flared',
                    title: 'Flared Trousers & Ham Joint',
                    description: 'Obtain some Flared Trousers and a Ham Joint.',
                    points: 2,
                },
                {
                    id: 'boots',
                    title: 'Ranger Boots & Spiked Manacles',
                    description: 'Obtain a pair of Ranger Boots and Spiked Manacles.',
                    points: 4,
                },
                {
                    id: 'clue-mega',
                    title: 'Clue Mega Rare',
                    description: 'Obtain any item from any of the 3 rare clue collection logs.',
                    points: 10,
                },
            ],
        },
        {
            id: 'tile-22',
            header: 'Retirement Home',
            image: 'Sarachnis_cudgel',
            tasks: [
                {
                    id: 'cudgel-3',
                    title: 'Sarachnis Cudgel (x3)',
                    description: 'Obtain 3 Sarachnis Cudgels.',
                    points: 1,
                },
                {
                    id: 'unsired',
                    title: 'Unsired (x5)',
                    description: 'Obtain 5 Unsired.',
                    points: 5,
                },
                {
                    id: 'mace',
                    title: 'Inquisitor\'s Mace',
                    description: 'Obtain 1 Inquisitor\'s Mace.',
                    points: 10,
                },
            ],
        },
        {
            id: 'tile-23',
            header: 'Nightmare',
            image: 'The_Nightmare',
            tasks: [
                {
                    id: 'nm-staff',
                    title: 'Nightmare Staff',
                    description: 'Obtain a Nightmare Staff.',
                    points: 2,
                },
                {
                    id: 'inq',
                    title: 'Inquisitor (x3)',
                    description: 'Obtain 3 pieces of the Inquisitor Armour Set.',
                    points: 6,
                },
                {
                    id: 'nm-3',
                    title: 'Nightmare Orb (x1)',
                    description: 'Obtain a Nightmare Orb.',
                    points: 8,
                },
            ],
        },
        {
            id: 'tile-24',
            header: 'Thieving',
            image: 'Dodgy_necklace',
            tasks: [
                {
                    id: 'tele-crystal',
                    title: 'Enhanced Crystal Teleport (x10)',
                    description: 'Obtain 10 Enhanced Crystal Teleport Seeds.',
                    points: 2,
                },
                {
                    id: 'blood-shards',
                    title: 'Blood Shard (x10)',
                    description: 'Obtain 10 Blood Shards from either thieving or Vyres.',
                    points: 6,
                },
                {
                    id: 'sceptre',
                    title: 'Pharaoh\'s Sceptre (x3)',
                    description: 'Obtain 3 Pharaoh\'s Sceptres.',
                    points: 8,
                },
            ],
        },
        {
            id: 'tile-25',
            header: 'Shake & Bake',
            image: 'Ring_of_endurance',
            tasks: [
                {
                    id: 'lockpicks',
                    title: 'Strange Old Lockpick (x10)',
                    description: 'Obtain 10 Strange Old Lockpicks.',
                    points: 2,
                },
                {
                    id: 'ring-of-endurance',
                    title: 'Ring of Endurance',
                    description: 'Obtain a Ring of Endurance.',
                    points: 5,
                },
                {
                    id: 'herbiboar-pet',
                    title: 'Herbiboar Pet',
                    description: 'Obtain a Herbiboar Pet.',
                    points: 8,
                },
            ],
        },
        {
            id: 'tile-26',
            header: 'Hardmode Budget Challenges',
            image: 'Coins_1',
            description: 'You must provide a before & after screenshot, including all ammunition, charges, supplies, and runes in the items kept on death user interface, with all options selected, besides protect from item. Each clan member can only complete one of these challenges.',
            tasks: [
                {
                    id: 'budget-toa-400',
                    title: 'Budget 400 TOA',
                    description: 'Complete a solo deathless 400 invocation ToA with a budget of 5m GP.',
                    points: 4,
                },
                {
                    id: 'budget-delve',
                    title: 'Budget Delve',
                    description: 'Complete a deep delve with a budget of 5m GP.',
                    points: 4,
                },
                {
                    id: 'budget-cm',
                    title: 'Budget CM',
                    description: 'Complete a trio Chambers of Xeric: Challenge Mode within time with a total budget of 30m GP split between all players.',
                    points: 4,
                },
            ],
        },
        {
            id: 'tile-27',
            header: 'Slayer',
            image: 'Slayer',
            tasks: [
                {
                    id: 'cerb-crystals',
                    title: 'Cerberus Crystals',
                    description: 'Obtain one of each Cerberus Crystal (Primordial, Pegasian, Eternal, Smouldering Stone).',
                    points: 4,
                },
                {
                    id: 'nally',
                    title: 'Noxious Halberd',
                    description: 'Complete a Noxious Halberd from scratch, you must get one of each of the following items: Noxious Point, Noxious Pommel, and Noxious Blade.',
                    points: 6,
                },
                {
                    id: 'hydra-claw-leather',
                    title: 'Hydra\'s Claw & Leather',
                    description: 'Obtain a Hydra\'s Claw and Hydra Leather.',
                    points: 8,
                },
            ],
        },
        {
            id: 'tile-28',
            header: 'Revenants',
            image: 'Revenant_cave_teleport',
            tasks: [
                {
                    id: 'rev-totem-25m',
                    title: 'Rev Totems (25M)',
                    description: 'Obtain Revenant Totems with a cumulative value of 25M+.',
                    points: 2,
                },
                {
                    id: 'rev-crystals-5',
                    title: 'Ancient Crystal (x5)',
                    description: 'Obtain 5 Ancient Crystals.',
                    points: 5,
                },
                {
                    id: 'rev-weapons-3',
                    title: 'Rev Weapon (x3)',
                    description: 'Obtain any 3 Revenant weapons (Craw\'s Bow, Thammaron\'s Sceptre, Viggora\'s Chainmace).',
                    points: 9,
                },
            ],
        },
        {
            id: 'tile-29',
            header: 'Gnomish Chaos',
            image: 'Gnome_scarf',
            tasks: [
                {
                    id: 'gnome-rest-greenlog',
                    title: 'Gnome Restauranteur',
                    description: 'Complete the Gnome Restaurant Collection Log.',
                    points: 1,
                },

                {
                    id: 'bone-necklace',
                    title: 'Bone Necklace',
                    description: 'Obtain a Bone necklace.',
                    points: 2,
                },
                {
                    id: 'elder-chaos-set',
                    title: 'Elder Chaos Robes',
                    description: 'Obtain the complete Elder Chaos Robe set.',
                    points: 3,
                },
            ],
        },
        {
            id: 'tile-30',
            header: 'Hueycoatl',
            image: 'The_Hueycoatl',
            tasks: [
                {
                    id: 'huey-hide-9',
                    title: 'Huey Hide (x9)',
                    description: 'Obtain 9 Hueycoatl Hide.',
                    points: 3,
                },
                {
                    id: 'huey-tome-2',
                    title: 'Huey Tome (x2)',
                    description: 'Obtain 2 Tomes of Earth.',
                    points: 4,
                },
                {
                    id: 'huey-wand-1',
                    title: 'Dragon Hunter Wand (x1)',
                    description: 'Obtain a Dragon Hunter Wand.',
                    points: 5,
                },
            ],
        },
        {
            id: 'missed-tile',
            header: 'More Slayer',
            image: 'Slayer\'s_enchantment',
            tasks: [
                {
                    id: 'slayer-enchant-2',
                    title: 'Slayer Enchantment (x2)',
                    description: 'Obtain 2 Slayer\'s enchantments.',
                    points: 2,
                },
                {
                    id: 'dagon-hai-dusk',
                    title: 'Dagon\'hai Robes / Dusk Mystic',
                    description: 'Obtain Dagon\'hai Robes or Dusk Mystic set.',
                    points: 4,
                },
                {
                    id: 'superior-item',
                    title: 'Eternal Gem or Imbued Heart',
                    description: 'Obtain an Eternal Gem or Imbued Heart.',
                    points: 10,
                }

            ]
        },
        {
            id: 'tile-31',
            header: 'Colosseum',
            image: 'Sol_Heredit',
            tasks: [
                {
                    id: 'sunfire',
                    title: 'Full Sunfire',
                    description: 'Obtain a complete set of Sunfire Fanatic Armour.',
                    points: 5,
                },
                {
                    id: 'ralos',
                    title: 'Tonalztics of Ralos',
                    description: 'Obtain a Tonalztics of Ralos.',
                    points: 10,
                },
                {
                    id: 'glory-run-58k',
                    title: '58k+ Glory Run',
                    description: 'Complete the Fortis Colosseum while earning at least 58,000 glory.',
                    points: 12,
                },
            ],
        },
        {
            id: 'tile-32',
            header: 'Dragon Dance',
            image: 'Dragon_warhammer',
            tasks: [
                {
                    id: 'dlimbs',
                    title: 'Dragon Limbs (x1)',
                    description: 'Obtain a set of Dragon Limbs.',
                    points: 2,
                },
                {
                    id: 'dwh-1',
                    title: 'Dragon Warhammer (x1)',
                    description: 'Obtain a Dragon Warhammer.',
                    points: 5,
                },
                {
                    id: 'dfh',
                    title: 'Dragon Full Helm',
                    description: 'Obtain a Dragon Full Helm.',
                    points: 15,
                },
            ],
        },
        {
            id: 'tile-33',
            header: 'Zulrah',
            image: 'Pet_snakeling',
            tasks: [
                {
                    id: 'zulrah-drops-6',
                    title: 'Zulrah Drops (x6)',
                    description: 'Obtain 6 drops from Zulrah\'s unique table (Serpentine Visage, Magic Fang, Tanzanite Fang, and Uncut Onyx).',
                    points: 3,
                },
                {
                    id: 'pet-jar-1',
                    title: 'Pet/Jar (x1)',
                    description: 'Obtain the Pet Snakeling or Jar of Swamp.',
                    points: 5,
                },
                {
                    id: 'mutagen-1',
                    title: 'Mutagen (x1)',
                    description: 'Obtain a mutagen.',
                    points: 6,
                },
            ],
        },
        {
            id: 'tile-34',
            header: 'Champions Corner',
            image: 'Champion\'s_cape',
            tasks: [
                {
                    id: 'obor-club-byro-ess',
                    title: 'Obor Club & Bryophyta\'s Essence',
                    description: 'Obtain a Hill Giant Club and Bryophyta\'s essence.',
                    points: 3,
                },
                {
                    id: 'champion-scroll-5',
                    title: 'Champion Scroll (x5)',
                    description: 'Obtain any 5 Champion Scrolls.',
                    points: 4,
                },
                {
                    id: 'slayer-heads-6',
                    title: 'Slayer Trophies (x6)',
                    description: 'Obtain 6 Slayer Trophies, excluding Vorkath.',
                    points: 6,
                },
            ],
        },
        {
            id: 'tile-35',
            header: 'Pets',
            image: 'Probita',
            description: 'Chompy Chick, Chaos Elemental Pet & Lil\' Creator do not count for this tile.',
            tasks: [
                {
                    id: 'skill-pet',
                    title: 'Skilling Pet',
                    description: 'Obtain any skilling pet.',
                    points: 6,
                },
                {
                    id: 'slayer-pet',
                    title: 'Slayer Pet',
                    description: 'Obtain any Slayer boss pet.',
                    points: 8,
                },
                {
                    id: 'raids-pet',
                    title: 'Raids Pet',
                    description: 'Obtain any raids pet.',
                    points: 10,
                },
            ],
        },
    ],

    gridSize: 4,
};
