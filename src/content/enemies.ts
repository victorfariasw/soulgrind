// Inimigos procedurais (seção 5.2): nome composto + ícone + cor da paleta da zona.
// Saem só da fase e da zona, então o inimigo que renasce na mesma fase é sempre o mesmo.
import { isBoss } from '../engine/engine.ts';
import type { ZoneId } from '../engine/engine.ts';
import { t } from '../strings.ts';
import { zonePalettes } from '../theme.ts';

// Um ícone por criatura, na ordem de t.enemyBases. O Lucide não tem aranha nem
// morcego: Spider usa o inseto e Bat usa o pássaro.
export const ENEMY_ICONS = ['dog', 'bug', 'worm', 'bird', 'personStanding', 'ghost', 'pawPrint', 'skull'] as const;
export type EnemyIcon = (typeof ENEMY_ICONS)[number];

export interface EnemyLook {
  name: string;
  icon: EnemyIcon;
  color: string;
}

// 37 é coprimo de 64 (8 adjetivos × 8 criaturas): cada combinação aparece uma vez
// a cada 64 fases, e duas fases seguidas nunca repetem a criatura.
const COMBO_STEP = 37;

export function enemyFor(stage: number, zone: ZoneId): EnemyLook {
  const bases = t.enemyBases;
  const combo = (stage * COMBO_STEP) % (t.enemyAdjectives.length * bases.length);
  const baseIndex = combo % bases.length;
  const first = isBoss(stage) ? bossPrefix(stage) : t.enemyAdjectives[Math.floor(combo / bases.length)];
  const palette = zonePalettes[zone];
  return {
    name: `${first} ${bases[baseIndex]} ${t.zoneOf[zone]}`,
    icon: ENEMY_ICONS[baseIndex],
    color: palette[stage % palette.length],
  };
}

// Elder em todo boss; Warden a cada 50 fases; The First a cada 100.
function bossPrefix(stage: number): string {
  if (stage % 100 === 0) return t.bossPrefixes.theFirst;
  if (stage % 50 === 0) return t.bossPrefixes.warden;
  return t.bossPrefixes.elder;
}
