// Todas as strings do jogo. Uma versão PT-BR seria um segundo objeto com as mesmas chaves.
export const t = {
  stage: 'Stage',
  advance: 'Advance',
  gold: 'Gold',
  souls: 'Souls',
  prestige: 'Prestige',
  hero: 'Hero',
  boss: 'Boss',
  dps: 'DPS',
  goldPerSecond: 'Gold/s',
  bossFled: (stage: number) => `Too slow. Back to Stage ${stage}.`,
  zones: { ruins: 'Ruins', catacombs: 'Catacombs', ravine: 'Ravine' },
  climbing: 'Climbing',
  toStage: (stage: number) => `to Stage ${stage}`,

  // Inimigos procedurais (seção 5.2): "Starving Wolf of the Ruins".
  enemyAdjectives: ['Starving', 'Pale', 'Crawling', 'Nameless', 'Hollow', 'Rotting', 'Blind', 'Ashen'],
  enemyBases: ['Wolf', 'Spider', 'Worm', 'Bat', 'Thrall', 'Shade', 'Hound', 'Wretch'],
  zoneOf: { ruins: 'of the Ruins', catacombs: 'of the Pit', ravine: 'of the Rift' },
  bossPrefixes: { elder: 'Elder', warden: 'Warden', theFirst: 'The First' },

  // Armas cosméticas (seção 5.3), na ordem dos marcos.
  weapons: {
    rustedDagger: 'Rusted Dagger',
    shortsword: 'Shortsword',
    wardensAxe: "Warden's Axe",
    heavyMaul: 'Heavy Maul',
    gravePick: 'Grave Pick',
    twinBlades: 'Twin Blades',
    ashenCleaver: 'Ashen Cleaver',
    hollowStaff: 'Hollow Staff',
    thunderblade: 'Thunderblade',
    paleMoonblade: 'Pale Moonblade',
    blazingFury: 'Blazing Fury',
    relicOfTheFirst: 'Relic of the First',
  },

  combat: 'Combat',
  upgrades: 'Upgrades',
  level: 'Lv',
  buy: 'Buy',
  max: 'MAX',
  upgradeNames: {
    attack: 'Attack',
    speed: 'Speed',
    critChance: 'Crit Chance',
    critDamage: 'Crit Damage',
    greed: 'Greed',
  },
  upgradeEffects: {
    attack: 'Damage',
    speed: 'Attacks',
    critChance: 'Crit chance',
    critDamage: 'Crit damage',
    greed: 'Gold',
  },

  chooseZone: 'Choose zone',
  nextZone: 'Choose the next zone',
  keepFarming: 'Keep farming',
  stages: (first: number, last: number) => `Stages ${first}–${last}`,
  zoneTaglines: {
    ruins: 'Rich, but bosses flee fast',
    catacombs: 'Steady ground',
    ravine: 'Poor, but bosses are weak',
  },
  zoneStats: {
    enemyHp: 'Enemy HP',
    gold: 'Gold',
    bossHp: 'Boss HP',
    bossTimer: 'Boss timer',
  },
  bossAtYourDps: (stage: number) => `Boss ${stage} at your DPS:`,

  awayFor: (duration: string) => `You were away ${duration}.`,
  heroGathered: 'Your hero gathered',
  offlineCap: (hours: number) => `Offline gains stop after ${hours}h.`,
  collect: 'Collect',

  soulsThisRun: 'souls this run',
  damageFromSouls: 'Damage from souls',
  record: 'Record',
  prestigeRules: (mult: number, fromStage: number) =>
    `Each boss you beat for the first time gives 1 soul (from Stage ${fromStage}). Each soul multiplies your damage by ×${mult}.`,
  prestigeResets:
    'Prestige resets gold, upgrades and stage. You keep your souls and record, and stages up to your record climb by themselves.',
  prestigeConfirm: 'Start over from Stage 1? Gold and upgrades will be lost.',
  prestigeLocked: (stage: number) => `Beat the Stage ${stage} boss to earn a soul.`,
  cancel: 'Cancel',
  startOver: 'Start over',
} as const;
