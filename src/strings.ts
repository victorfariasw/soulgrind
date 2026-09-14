// Todas as strings do jogo. Uma versão PT-BR seria um segundo objeto com as mesmas chaves.
export const t = {
  stage: 'Stage',
  advance: 'Advance',
  gold: 'Gold',
  souls: 'Souls',
  prestige: 'Prestige',
  hero: 'Hero',
  enemy: 'Enemy',
  boss: 'Boss',
  dps: 'DPS',
  goldPerSecond: 'Gold/s',
  bossFled: (stage: number) => `Too slow. Back to Stage ${stage}.`,
  zones: { ruins: 'Ruins', catacombs: 'Catacombs', ravine: 'Ravine' },
} as const;
