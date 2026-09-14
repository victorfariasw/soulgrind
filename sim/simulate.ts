// Simulador de balanceamento do Soulgrind. Fica fora do bundle do app.
// Rodar: npm run sim
//
// Dirige o motor real tick a tick, então mede o mesmo código que vai pro app.
// O jogador modelado aqui (limiar de farm, desistência, compra gulosa, escolha
// de zona) é comportamento, não regra do jogo — nada disso deve ir pro app.

import {
  CONFIG, UPGRADE_IDS, ZONE_IDS, advance, bossTimeout, buy, dps, enemyMaxHp, goldMultiplier, isBoss,
  newGame, prestige, tick, upgradeCost,
} from '../src/engine/engine.ts';
import type { GameState, ZoneId } from '../src/engine/engine.ts';
import { formatNumber } from '../src/engine/format.ts';

const MAX_STAGE = 2000;

type ChooseZone = (nextStage: number, state: GameState) => ZoneId;

interface Player {
  farmThreshold: number; // farma na fase enquanto o kill levar mais que isso (s)
  maxFarmKills: number;  // desiste de farmar depois de N kills na mesma fase
  chooseZone: ChooseZone;
}

interface StageLog {
  stage: number;
  zone: ZoneId;
  killSeconds: number;
  totalSeconds: number;
  farmKills: number;
  dps: number;
}

interface RunResult {
  wall: number | null;
  seconds: number;
  farmSeconds: number;
  kills: number;
  final: GameState;
  log: StageLog[];
  picks: Record<ZoneId, number>;
}

// Compra gulosa: sempre o upgrade com melhor ganho por ouro gasto.
// Aproxima um jogador razoável, não um ótimo. Greed entra com peso 0.7.
function buyGreedy(state: GameState): GameState {
  for (;;) {
    const baseDps = dps(state);
    const baseGold = goldMultiplier(state);
    let best: { next: GameState; value: number } | null = null;

    for (const id of UPGRADE_IDS) {
      const next = buy(state, id);
      if (!next) continue;
      const gain = id === 'greed'
        ? (goldMultiplier(next) / baseGold - 1) * 0.7
        : dps(next) / baseDps - 1;
      const value = gain / upgradeCost(id, state.levels[id]);
      if (!best || value > best.value) best = { next, value };
    }

    if (!best) return state;
    state = best.next;
  }
}

// Luta contra o inimigo atual até ele morrer ou o boss estourar o tempo.
function fight(state: GameState): { state: GameState; ticks: number; killed: boolean } {
  for (let ticks = 1; ; ticks++) {
    const r = tick(state);
    state = r.state;
    if (r.killed || r.bossFailed) return { state, ticks, killed: r.killed };
  }
}

// Joga a partir de `state` até vencer `lastStage` ou bater no muro. Avança
// enquanto o kill é rápido; quando passa do limiar, farma na fase até voltar a
// ficar rápido ou até desistir. O muro é o boss que não cabe no tempo da zona.
function play(state: GameState, player: Player, lastStage: number): RunResult {
  const log: StageLog[] = [];
  const picks = Object.fromEntries(ZONE_IDS.map(z => [z, 0])) as Record<ZoneId, number>;
  let ticks = 0;
  let farmTicks = 0;
  let kills = 0;
  let farmKills = 0;

  const result = (wall: number | null): RunResult => ({
    wall, seconds: ticks * CONFIG.tickSeconds, farmSeconds: farmTicks * CONFIG.tickSeconds, kills, final: state, log, picks,
  });

  for (;;) {
    const stage = state.stage;
    const currentDps = dps(state);
    const expectedSeconds = enemyMaxHp(stage, state.zone) / currentDps;
    if (isBoss(stage) && expectedSeconds > bossTimeout(state.zone)) return result(stage);
    const farming = expectedSeconds > player.farmThreshold && farmKills < player.maxFarmKills;

    const f = fight(state);
    state = f.state;
    ticks += f.ticks;
    if (!f.killed) return result(stage);

    kills++;
    state = buyGreedy(state);
    if (farming) {
      farmKills++;
      farmTicks += f.ticks;
      continue;
    }

    log.push({
      stage, zone: state.zone, killSeconds: f.ticks * CONFIG.tickSeconds,
      totalSeconds: ticks * CONFIG.tickSeconds, farmKills, dps: currentDps,
    });
    if (stage >= lastStage) return result(null);

    let zone: ZoneId | undefined;
    if (isBoss(stage)) {
      zone = player.chooseZone(stage + 1, state);
      picks[zone]++;
    }
    // Depois de um kill o Advance está sempre liberado.
    state = advance(state, zone)!;
    farmKills = 0;
  }
}

const run = (player: Player, souls = 0) => play(newGame(souls), player, MAX_STAGE);

const player = (chooseZone: ChooseZone, farmThreshold = 8): Player =>
  ({ farmThreshold, maxFarmKills: 40, chooseZone });

const always = (zone: ZoneId): ChooseZone => () => zone;
const alternating: ChooseZone = nextStage => (nextStage % 20 === 1 ? 'ruins' : 'ravine');

// Joga o próximo bloco de verdade em cada zona, na ordem de CONFIG.zones
// (Ruins, Catacombs, Ravine), e fica com a primeira que não trava no boss.
// Se todas travam, vai pra Ravine, que tem o boss mais fraco.
function smart(farmThreshold: number): ChooseZone {
  return (nextStage, state) => {
    const lastStage = nextStage + CONFIG.bossEvery - 1;
    for (const zone of ZONE_IDS) {
      const trial = play(advance(state, zone)!, player(always(zone), farmThreshold), lastStage);
      if (trial.wall === null) return zone;
    }
    return 'ravine';
  };
}

function duration(seconds: number | undefined): string {
  if (seconds === undefined) return '-';
  if (seconds < 60) return seconds.toFixed(1) + 's';
  if (seconds < 3600) return (seconds / 60).toFixed(1) + 'min';
  return (seconds / 3600).toFixed(1) + 'h';
}

const timeAt = (r: RunResult, stage: number) => r.log.find(l => l.stage === stage)?.totalSeconds;
const picksText = (r: RunResult) => `R/C/V ${r.picks.ruins}/${r.picks.catacombs}/${r.picks.ravine}`;

function summary(r: RunResult): string {
  return [
    `muro ${r.wall ?? '-'}`,
    duration(r.seconds),
    `até 180 ${duration(timeAt(r, 180))}`,
    `${r.kills} kills`,
    `${(r.seconds / r.kills).toFixed(1)}s/kill`,
    `farm ${((100 * r.farmSeconds) / r.seconds).toFixed(0)}%`,
    `Attack ${r.final.levels.attack}`,
    picksText(r),
  ].join(' | ');
}

function report(): void {
  console.log('=== Run 1: jogador esperto, farma enquanto o kill passar de 8s ===');
  const main = run(player(smart(8)));
  console.log('fase | zona      | kill   | acumulado | farm | dps');
  for (const l of main.log) {
    if (l.stage % 10 !== 0) continue;
    console.log(
      String(l.stage).padStart(4) + ' | ' +
      l.zone.padEnd(9) + ' | ' +
      duration(l.killSeconds).padStart(6) + ' | ' +
      duration(l.totalSeconds).padStart(9) + ' | ' +
      String(l.farmKills).padStart(4) + ' | ' +
      formatNumber(l.dps),
    );
  }
  console.log(summary(main));
  console.log('níveis finais:', JSON.stringify(main.final.levels));

  console.log('\n=== Estratégias de zona (limiar 8s) ===');
  const strategies: [string, ChooseZone][] = [
    ['sempre Ruins    ', always('ruins')],
    ['sempre Catacombs', always('catacombs')],
    ['sempre Ravine   ', always('ravine')],
    ['alternando R/V  ', alternating],
  ];
  for (const [name, chooseZone] of strategies) console.log(`${name} | ${summary(run(player(chooseZone)))}`);
  console.log(`esperto          | ${summary(main)}`);

  console.log('\n=== Limiar de farm (jogador esperto) ===');
  for (const threshold of [4, 8, 12]) {
    const r = threshold === 8 ? main : run(player(smart(threshold), threshold));
    console.log(`limiar ${String(threshold).padStart(2)}s | ${summary(r)}`);
  }

  console.log('\n=== Cadeia de prestígio, jogador esperto (problema 1, ainda aberto) ===');
  let souls = 0;
  for (let i = 1; i <= 6; i++) {
    const r = run(player(smart(8)), souls);
    const reached = r.wall === null ? `chegou na ${MAX_STAGE}` : `muro ${r.wall}`;
    console.log(`run ${i}: ${reached} em ${duration(r.seconds)} (almas iniciais ${formatNumber(souls)})`);
    souls = prestige(r.final).souls;
  }
}

report();
