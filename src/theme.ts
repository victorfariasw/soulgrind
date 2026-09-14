// Paleta única por enquanto. Paletas por zona chegam com os inimigos procedurais (marco 8).
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
  weapon: '#6B6862', // Rusted Dagger — a arma muda com o nível de Attack no marco 8
} as const;

// Cor de destaque de cada zona: nome no topo e borda da carta de escolha.
export const zoneColors = {
  ruins: '#C98B3B',
  catacombs: '#9A8FB5',
  ravine: '#4F9BB0',
} as const;
