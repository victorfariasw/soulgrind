// Cores da interface. As armas têm cor própria em src/content/weapons.ts.
export const colors = {
  bg: '#0E0D0B',
  surface: '#191714',
  border: '#2E2A25',
  track: '#2A2320',
  text: '#E9E3D7',
  muted: '#8C8478',
  gold: '#D9A441',
  souls: '#9A86D1',
  hp: '#B8453B',
  boss: '#D2433A',
  good: '#8DBF6A',
  crit: '#F5B83D',
} as const;

// Cor de destaque de cada zona: nome no topo e borda da carta de escolha.
export const zoneColors = {
  ruins: '#C98B3B',
  catacombs: '#9A8FB5',
  ravine: '#4F9BB0',
} as const;

// Paleta dos inimigos de cada zona; a primeira cor é a da zona.
export const zonePalettes = {
  ruins: [zoneColors.ruins, '#B8653A', '#D9B26A'],
  catacombs: [zoneColors.catacombs, '#C9C1A8', '#7F8FA6'],
  ravine: [zoneColors.ravine, '#6FA88A', '#8FB8C8'],
} as const;
