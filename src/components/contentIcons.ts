// Ícones do Lucide para o conteúdo procedural. Os módulos de src/content só guardam
// a chave do ícone, pra continuarem testáveis no Node, sem React Native.
import {
  Axe, Bird, Bug, Crown, Dog, Flame, Ghost, Hammer, MoonStar, PawPrint, PersonStanding, Pickaxe, Skull, Slice,
  Sword, Swords, Wand, Worm, Zap,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';

import type { EnemyIcon } from '../content/enemies';
import type { WeaponIcon } from '../content/weapons';

export const ENEMY_ICON_COMPONENTS: Record<EnemyIcon, LucideIcon> = {
  dog: Dog,
  bug: Bug,
  worm: Worm,
  bird: Bird,
  personStanding: PersonStanding,
  ghost: Ghost,
  pawPrint: PawPrint,
  skull: Skull,
};

export const WEAPON_ICON_COMPONENTS: Record<WeaponIcon, LucideIcon> = {
  sword: Sword,
  axe: Axe,
  hammer: Hammer,
  pickaxe: Pickaxe,
  swords: Swords,
  slice: Slice,
  wand: Wand,
  zap: Zap,
  moonStar: MoonStar,
  flame: Flame,
  crown: Crown,
};
