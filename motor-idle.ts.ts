// Motor do idle RPG + simulador de balanceamento.
// Rodar: npx tsx motor-idle.ts
//
// A parte "MOTOR" vai direto pro app (é pura, sem React, sem side effect).
// A parte "SIMULADOR" fica de fora do bundle — serve só pra calibrar números.

// ─────────────────────────────────────────────────────────────
// MOTOR
// ─────────────────────────────────────────────────────────────

export type UpgradeId = 'ataque' | 'velocidade' | 'critChance' | 'critDano' | 'ganancia';

export interface Estado {
  stage: number;
  maiorStage: number;
  gold: number;
  almas: number;
  niveis: Record<UpgradeId, number>;
}

export const CONFIG = {
  hpBase: 5,
  hpGrowth: 1.32,
  goldBase: 10,
  goldGrowth: 1.22,

  bossCadaXFases: 10,
  bossMult: 2.5,
  bossTimeout: 45,

  danoBase: 2,
  velocidadeBase: 1,
  critDanoBase: 1.5,

  // Prestígio — ver "problema em aberto" no fim do arquivo.
  almasDivisor: 10,
  almasExpoente: 2.5,
  bonusPorAlma: 1.008,
  prestigioMinimo: 30,

  upgrades: {
    ataque:     { custoBase: 5,  custoGrowth: 1.085, rotulo: 'Ataque' },
    velocidade: { custoBase: 40, custoGrowth: 1.10,  rotulo: 'Velocidade' },
    critChance: { custoBase: 40, custoGrowth: 1.15,  rotulo: 'Chance de crítico' },
    critDano:   { custoBase: 60, custoGrowth: 1.12,  rotulo: 'Dano crítico' },
    ganancia:   { custoBase: 30, custoGrowth: 1.09,  rotulo: 'Ganância' },
  },
} as const;

export const UPGRADE_IDS = Object.keys(CONFIG.upgrades) as UpgradeId[];

export function estadoInicial(almas = 0): Estado {
  const niveis = {} as Record<UpgradeId, number>;
  for (const id of UPGRADE_IDS) niveis[id] = 0;
  return { stage: 1, maiorStage: 1, gold: 0, almas, niveis };
}

export function ehBoss(stage: number): boolean {
  return stage % CONFIG.bossCadaXFases === 0;
}

export function hpInimigo(stage: number): number {
  const base = CONFIG.hpBase * Math.pow(CONFIG.hpGrowth, stage - 1);
  return ehBoss(stage) ? base * CONFIG.bossMult : base;
}

export function ouroInimigo(stage: number): number {
  return CONFIG.goldBase * Math.pow(CONFIG.goldGrowth, stage - 1);
}

export function custoUpgrade(id: UpgradeId, nivelAtual: number): number {
  const u = CONFIG.upgrades[id];
  return u.custoBase * Math.pow(u.custoGrowth, nivelAtual);
}

// Só o ataque é multiplicativo. Os outros são aditivos de propósito —
// dois ou mais multiplicadores exponenciais fazem o poder passar a
// dificuldade e o jogo nunca mais trava.
export function dps(e: Estado): number {
  const dano = CONFIG.danoBase * Math.pow(1.08, e.niveis.ataque);
  const velocidade = CONFIG.velocidadeBase + e.niveis.velocidade * 0.05;
  const chanceCrit = Math.min(0.5, e.niveis.critChance * 0.01);
  const multCrit = CONFIG.critDanoBase + e.niveis.critDano * 0.15;
  const bonusAlmas = Math.pow(CONFIG.bonusPorAlma, e.almas);
  return dano * velocidade * (1 + chanceCrit * (multCrit - 1)) * bonusAlmas;
}

export function multiplicadorOuro(e: Estado): number {
  return 1 + e.niveis.ganancia * 0.05;
}

export function almasAoPrestigiar(maiorStage: number): number {
  if (maiorStage < CONFIG.prestigioMinimo) return 0;
  return Math.floor(Math.pow(maiorStage / CONFIG.almasDivisor, CONFIG.almasExpoente));
}

export function prestigiar(e: Estado): Estado {
  const novas = almasAoPrestigiar(e.maiorStage);
  const novo = estadoInicial(Math.max(e.almas, novas));
  novo.maiorStage = e.maiorStage;
  return novo;
}

export function comprar(e: Estado, id: UpgradeId): boolean {
  const c = custoUpgrade(id, e.niveis[id]);
  if (e.gold < c) return false;
  e.gold -= c;
  e.niveis[id]++;
  return true;
}

// Avança o combate por `dt` segundos. Chamar num setInterval de 100ms,
// nunca por frame — nas fases altas o herói mata vários por segundo.
export function tick(e: Estado, dt: number, hpRestante: number): { hpRestante: number; matou: boolean } {
  const restante = hpRestante - dps(e) * dt;
  if (restante > 0) return { hpRestante: restante, matou: false };
  e.gold += ouroInimigo(e.stage) * multiplicadorOuro(e);
  e.stage++;
  e.maiorStage = Math.max(e.maiorStage, e.stage);
  return { hpRestante: hpInimigo(e.stage), matou: true };
}

export function formatar(n: number): string {
  if (n < 1000) return n.toFixed(0);
  const sufixos = ['K', 'M', 'B', 'T', 'aa', 'ab', 'ac', 'ad', 'ae', 'af', 'ag', 'ah'];
  let i = -1;
  while (n >= 1000 && i < sufixos.length - 1) { n /= 1000; i++; }
  return n.toFixed(2) + sufixos[i];
}

// ─────────────────────────────────────────────────────────────
// SIMULADOR
// ─────────────────────────────────────────────────────────────

// Compra gulosa: sempre o upgrade com melhor ganho de dps por ouro gasto.
// Aproxima um jogador razoável, não um ótimo.
function comprarTudo(e: Estado): void {
  for (;;) {
    const dpsAtual = dps(e);
    const ouroAtual = multiplicadorOuro(e);
    let melhor: { id: UpgradeId; custo: number; valor: number } | null = null;

    for (const id of UPGRADE_IDS) {
      const c = custoUpgrade(id, e.niveis[id]);
      if (c > e.gold) continue;
      e.niveis[id]++;
      const ganho = id === 'ganancia'
        ? (multiplicadorOuro(e) / ouroAtual - 1) * 0.7
        : dps(e) / dpsAtual - 1;
      e.niveis[id]--;
      const valor = ganho / c;
      if (!melhor || valor > melhor.valor) melhor = { id, custo: c, valor };
    }

    if (!melhor) return;
    e.gold -= melhor.custo;
    e.niveis[melhor.id]++;
  }
}

export function simular(maxStage: number, almas = 0) {
  const e = estadoInicial(almas);
  const linhas: { stage: number; tempo: number; acumulado: number; dps: number }[] = [];
  let total = 0;

  for (let s = 1; s <= maxStage; s++) {
    e.stage = s;
    const d = dps(e);
    const tempo = hpInimigo(s) / d;

    if (ehBoss(s) && tempo > CONFIG.bossTimeout) {
      return { linhas, total, muro: s, estado: e };
    }

    total += tempo;
    e.gold += ouroInimigo(s) * multiplicadorOuro(e);
    comprarTudo(e);
    linhas.push({ stage: s, tempo, acumulado: total, dps: d });
  }

  return { linhas, total, muro: null as number | null, estado: e };
}

function tempo(seg: number): string {
  if (seg < 60) return seg.toFixed(1) + 's';
  if (seg < 3600) return (seg / 60).toFixed(1) + 'min';
  return (seg / 3600).toFixed(1) + 'h';
}

function relatorio(): void {
  const r = simular(400);
  console.log('fase | tempo    | acumulado | dps');
  for (const l of r.linhas) {
    if (l.stage % 5 !== 0 && l.stage > 12) continue;
    console.log(
      String(l.stage).padStart(4) + ' | ' +
      tempo(l.tempo).padStart(8) + ' | ' +
      tempo(l.acumulado).padStart(9) + ' | ' +
      formatar(l.dps).padStart(9)
    );
  }
  console.log('\nmuro da 1a run:', r.muro, '| tempo:', tempo(r.total));

  let almas = 0;
  for (let run = 1; run <= 8; run++) {
    const rr = simular(2000, almas);
    const ate = rr.muro ?? 2000;
    console.log(`run ${run}: fase ${ate} em ${tempo(rr.total)} (almas iniciais ${almas})`);
    almas = Math.max(almas, almasAoPrestigiar(ate));
  }
}

relatorio();

// ─────────────────────────────────────────────────────────────
// PROBLEMA EM ABERTO: a curva de prestígio
// ─────────────────────────────────────────────────────────────
//
// O jogo base (run 1) está calibrado: ~18 minutos até a fase 100,
// tempo por fase subindo de 2.5s para ~40s, sem buracos.
//
// A camada de prestígio ainda não está. Com os valores atuais ela
// ACELERA: cada run vai mais longe E mais rápido que a anterior,
// e por volta da run 6 o jogo perde o controle.
//
// Os três botões pra mexer:
//   almasExpoente   — quanto as almas crescem com a fase alcançada
//   bonusPorAlma    — quanto cada alma vale
//   hpGrowth        — se a dificuldade acompanha o ganho
//
// A janela entre "estagnar" (cada run para na mesma fase) e "explodir"
// é estreita. Valores testados:
//   expoente 2.2 / bônus 1.005  → estagna na fase 110
//   expoente 2.5 / bônus 1.008  → acelera, quebra na run 6  (atual)
//   expoente 2.5 / bônus 1.04   → quebra na run 3
//
// A saída usual é fazer a dificuldade acelerar junto: hpGrowth subindo
// devagar com a fase (ex. 1.32 + fase * 0.0004) em vez de constante.
// Vale simular isso antes de codar qualquer tela.
