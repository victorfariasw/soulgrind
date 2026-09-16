// Armas cosméticas (seção 5.3): o ícone ao lado do herói muda quando o nível de
// Attack cruza um marco. Zero efeito mecânico.
//
// Marcos calibrados pela simulação (problema 2). O Attack zera a cada prestígio e
// chega mais alto conforme as runs vão fundo (~450 no fim da run 1, ~2850 na run 10,
// ~4800 no fim do jogo): as quatro primeiras armas saem na run 1 e a última perto do
// fim do jogo. `npm run sim` mostra quando cada uma aparece.
import { t } from '../strings.ts';

export const WEAPONS = [
  { level: 0,    id: 'rustedDagger',    icon: 'sword',    color: '#9A948A' },
  { level: 25,   id: 'shortsword',      icon: 'sword',    color: '#6A93D1' },
  { level: 150,  id: 'wardensAxe',      icon: 'axe',      color: '#C0823A' },
  { level: 350,  id: 'heavyMaul',       icon: 'hammer',   color: '#A7B1BC' },
  { level: 700,  id: 'gravePick',       icon: 'pickaxe',  color: '#D8CFB8' },
  { level: 1200, id: 'twinBlades',      icon: 'swords',   color: '#7CC4A4' },
  { level: 2000, id: 'ashenCleaver',    icon: 'slice',    color: '#C9A9A6' },
  { level: 2800, id: 'hollowStaff',     icon: 'wand',     color: '#A98BE0' },
  { level: 3700, id: 'thunderblade',    icon: 'zap',      color: '#7FD4FF' },
  { level: 4100, id: 'paleMoonblade',   icon: 'moonStar', color: '#CFE3E8' },
  { level: 4500, id: 'blazingFury',     icon: 'flame',    color: '#F27A3D' },
  { level: 4750, id: 'relicOfTheFirst', icon: 'crown',    color: '#F5C542' },
] as const;

export type Weapon = (typeof WEAPONS)[number];
export type WeaponIcon = Weapon['icon'];

// Índice da melhor arma liberada com `attackLevel`.
export function weaponIndexFor(attackLevel: number): number {
  let index = 0;
  for (let i = 1; i < WEAPONS.length; i++) if (attackLevel >= WEAPONS[i].level) index = i;
  return index;
}

export function weaponName(weapon: Weapon): string {
  return t.weapons[weapon.id];
}
