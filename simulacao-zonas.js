const C = {
  hpBase: 5, hpGrowth: 1.32,
  goldBase: 10, goldGrowth: 1.22,
  bossMult: 2.5, bossTimeout: 45,
  danoBase: 2, velocidadeBase: 1, critDanoBase: 1.5,
  up: {
    ataque:     { cb: 5,  cg: 1.085 },
    velocidade: { cb: 40, cg: 1.10 },
    critChance: { cb: 40, cg: 1.15 },
    critDano:   { cb: 60, cg: 1.12 },
    ganancia:   { cb: 30, cg: 1.09 },
  },
};
const IDS = Object.keys(C.up);

const ZONAS = {
  ruinas:       { nome: 'Ruinas',       hp: 1.4, ouro: 2.0 },
  catacumbas:   { nome: 'Catacumbas',   hp: 1.0, ouro: 1.0 },
  desfiladeiro: { nome: 'Desfiladeiro', hp: 0.5, ouro: 0.5 },
};

const novo = (almas = 0) => ({
  gold: 0, almas,
  niveis: Object.fromEntries(IDS.map(i => [i, 0])),
});

const ehBoss = s => s % 10 === 0;
const hp = (s, z) => C.hpBase * Math.pow(C.hpGrowth, s - 1) * (ehBoss(s) ? C.bossMult : 1) * z.hp;
const ouro = (s, z) => C.goldBase * Math.pow(C.goldGrowth, s - 1) * z.ouro;
const custo = (id, n) => C.up[id].cb * Math.pow(C.up[id].cg, n);

function dps(e) {
  const dano = C.danoBase * Math.pow(1.08, e.niveis.ataque);
  const vel = C.velocidadeBase + e.niveis.velocidade * 0.05;
  const cc = Math.min(0.5, e.niveis.critChance * 0.01);
  const cd = C.critDanoBase + e.niveis.critDano * 0.15;
  return dano * vel * (1 + cc * (cd - 1)) * Math.pow(1.008, e.almas);
}
const multOuro = e => 1 + e.niveis.ganancia * 0.05;

function comprarTudo(e) {
  for (;;) {
    const d0 = dps(e), g0 = multOuro(e);
    let melhor = null;
    for (const id of IDS) {
      const c = custo(id, e.niveis[id]);
      if (c > e.gold) continue;
      e.niveis[id]++;
      const ganho = id === 'ganancia' ? (multOuro(e) / g0 - 1) * 0.7 : dps(e) / d0 - 1;
      e.niveis[id]--;
      const v = ganho / c;
      if (!melhor || v > melhor.v) melhor = { id, c, v };
    }
    if (!melhor) return;
    e.gold -= melhor.c;
    e.niveis[melhor.id]++;
  }
}

// politica: avanca enquanto o kill for rapido; se passar do limiar, farma
// na fase atual ate voltar a ficar rapido (ou desistir apos maxFarm kills).
function run({ almas = 0, maxStage = 2000, limiar = 12, maxFarm = 40, escolherZona }) {
  const e = novo(almas);
  let total = 0, kills = 0, tempoFarm = 0;
  let zona = ZONAS.catacumbas;
  const log = [];

  for (let s = 1; s <= maxStage; s++) {
    if (s % 10 === 1 && s > 1 && escolherZona) zona = escolherZona(s, e);

    let t = hp(s, zona) / dps(e);
    if (ehBoss(s) && t > C.bossTimeout) return { muro: s, total, kills, tempoFarm, log, e };

    // farm na fase atual
    let f = 0;
    while (t > limiar && f < maxFarm) {
      total += t; tempoFarm += t; kills++; f++;
      e.gold += ouro(s, zona) * multOuro(e);
      comprarTudo(e);
      t = hp(s, zona) / dps(e);
      if (ehBoss(s) && t > C.bossTimeout && f >= maxFarm) return { muro: s, total, kills, tempoFarm, log, e };
    }

    total += t; kills++;
    e.gold += ouro(s, zona) * multOuro(e);
    comprarTudo(e);
    log.push({ s, t, total, farm: f, zona: zona.nome });
  }
  return { muro: null, total, kills, tempoFarm, log, e };
}

const tempo = x => x < 60 ? x.toFixed(1) + 's' : x < 3600 ? (x / 60).toFixed(1) + 'min' : (x / 3600).toFixed(1) + 'h';

console.log('=== A: sem zonas, so farmar vs avancar ===');
const A = run({ escolherZona: null });
for (const l of A.log) if (l.s % 10 === 0) console.log(`  fase ${String(l.s).padStart(3)} | kill ${tempo(l.t).padStart(7)} | acum ${tempo(l.total).padStart(8)} | farm ${l.farm}`);
console.log(`  muro ${A.muro} | total ${tempo(A.total)} | kills ${A.kills} | farmando ${tempo(A.tempoFarm)} (${(100 * A.tempoFarm / A.total).toFixed(0)}%)\n`);

console.log('=== B: sempre Ruinas (jogador que otimiza ouro) ===');
const B = run({ escolherZona: () => ZONAS.ruinas });
console.log(`  muro ${B.muro} | total ${tempo(B.total)} | kills ${B.kills}\n`);

console.log('=== C: sempre Desfiladeiro (jogador que corre) ===');
const Cc = run({ escolherZona: () => ZONAS.desfiladeiro });
console.log(`  muro ${Cc.muro} | total ${tempo(Cc.total)} | kills ${Cc.kills}\n`);

console.log('=== D: alternando ===');
const D = run({ escolherZona: s => (s % 20 === 1 ? ZONAS.ruinas : ZONAS.desfiladeiro) });
console.log(`  muro ${D.muro} | total ${tempo(D.total)} | kills ${D.kills}\n`);

console.log('=== E: cadeia de prestigios (sempre Ruinas) ===');
let almas = 0;
for (let i = 1; i <= 6; i++) {
  const r = run({ almas, escolherZona: () => ZONAS.ruinas });
  const ate = r.muro ?? 2000;
  console.log(`  run ${i}: fase ${ate} em ${tempo(r.total)} (almas ${almas})`);
  almas = Math.max(almas, Math.floor(Math.pow(ate / 10, 2.5)));
}
