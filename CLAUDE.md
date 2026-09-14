# Soulgrind — Idle RPG

Documento de contexto do projeto. Contém o conceito, todas as decisões tomadas
(e as recusadas, com o motivo), os números já calibrados por simulação e os
problemas ainda em aberto.

> **Para o agente:** leia a seção "Instruções para o agente" no fim antes de
> escrever código. Há restrições que não são óbvias, principalmente sobre
> balanceamento.

---

## 1. O que é

Idle RPG para Android. O herói luta sozinho contra inimigos infinitos; o jogador
gasta ouro em upgrades, decide quando avançar de fase, escolhe zonas a cada 10
fases e, quando trava, reseta em troca de um bônus permanente.

**Nome:** Soulgrind — Idle RPG
**Idioma do jogo:** inglês (todas as strings, nomes de inimigos, itens e UI)
**Idioma do repositório:** português nos comentários e commits, inglês no código
**Objetivo do projeto:** praticar e publicar um APK. Não é um produto comercial.

### Sem arte

Não existe sprite, ilustração ou imagem no jogo. Toda a identidade visual é
feita com ícones vetoriais (Tabler/Lucide), cor e tipografia. Isso é uma decisão
deliberada, não uma limitação temporária — ver seção 9.

---

## 2. Stack

- **Expo SDK 57 + React Native 0.86 + TypeScript 6**
- Estado: Zustand (`src/game/store.ts`) — não precisa de engine de jogo
- Animação: `react-native-reanimated` (roda na thread de UI, não disputa com o loop)
- Ícones: `lucide-react-native` (o `@expo/vector-icons` não traz Tabler)
- Persistência: AsyncStorage ou MMKV, um único blob JSON
- Build: EAS Build → APK
- Sem backend, sem conta, sem rede

---

## 3. Loop de jogo

1. O herói ataca automaticamente o inimigo da fase atual.
2. Inimigo morre → dropa ouro → **outro inimigo igual aparece na mesma fase**.
3. O jogador decide: continuar farmando ali ou apertar **Advance** para a próxima fase.
4. A cada 10 fases há um boss (vida e limite de tempo dependem da zona). Ao vencer, o jogador
   escolhe a próxima zona entre 3 cartas.
5. Em algum ponto o avanço trava. O jogador faz **prestígio**: volta à fase 1 com
   almas, que dão bônus permanente de dano.

**O avanço NÃO é automático.** Essa é a decisão mais importante do design. Com
avanço automático, a primeira run durava 18 minutos e o jogador não tomava
nenhuma decisão. Com avanço manual, a run passou a durar ~4,6 horas e a tensão
entre farmar (seguro, lento) e avançar (mais ouro por kill, risco de travar) virou
a mecânica central.

**Exceção: subida automática.** Depois do prestígio, fases abaixo do recorde não
têm decisão nova, então avançam sozinhas (zona escolhida pelo tempo estimado do
boss). O Advance manual volta a valer a partir do recorde. Se um boss vence o herói
na subida, ela pausa até o jogador passar de um boss por conta própria.

---

## 4. Números calibrados

Todos os valores abaixo foram validados por simulação. **Não altere nenhum sem
rodar `npm run sim` antes.**

### Inimigos

```
hp(fase)   = 5 * 1.32^(fase-1) * bossMult * zonaHp
ouro(fase) = 10 * 1.24^(fase-1) * zonaOuro

bossMult    = bossHp da zona se fase % 10 == 0, senão 1   (ver Zonas)
bossTimeout = tempo do boss da zona  (não matou, volta uma fase)
```

### Herói

```
dano       = 2 * 1.08^nivelAttack          // ÚNICO upgrade multiplicativo
velocidade = 1 + nivelSpeed * 0.05         // aditivo
chanceCrit = min(0.5, nivelCritChance * 0.01)
multCrit   = 1.5 + nivelCritDamage * 0.15  // aditivo
bonusAlmas = 1.9^almas

dps = dano * velocidade * (1 + chanceCrit * (multCrit - 1)) * bonusAlmas
multOuro = 1 + nivelGreed * 0.05           // aditivo
```

**Só o ataque é multiplicativo.** Dois ou mais upgrades exponenciais fazem o poder
do jogador ultrapassar a curva de dificuldade e o jogo nunca mais trava. Isso
aconteceu na primeira simulação: o dano chegou a 10^56 na fase 200 e a run acabava
em 2 minutos.

### Custos

```
custo(id, nivel) = custoBase * custoGrowth^nivel
```

| Upgrade | Efeito por nível | custoBase | custoGrowth |
|---|---|---|---|
| Attack | dano ×1.08 | 5 | 1.085 |
| Speed | +0.05 ataques/s | 40 | 1.10 |
| Crit Chance | +1% (teto 50%) | 40 | 1.15 |
| Crit Damage | +0.15 no multiplicador | 60 | 1.12 |
| Greed | +5% de ouro | 30 | 1.09 |

### Prestígio

```
almas: +1 por boss vencido pela primeira vez (acima do recorde), a partir da fase 30
bônus = 1.9 ^ almas    // multiplicador de dano
```

As almas da run ficam pendentes e só valem depois do prestígio. Ao prestigiar: zera
ouro, upgrades e fase. Mantém almas e recorde (maior boss já vencido).

Por que assim (experimento do problema 1): almas que acumulam a cada run criam um
loop de prestígio a cada ~15s, então precisam vir de progresso novo. E o bônus tem
que crescer no ritmo da dificuldade: perto do muro cada fase deixa o kill só ~1,08×
mais lento, então um multiplicador M empurra o muro ~13·ln(M) fases.

| Bônus por alma | Fase 1000 | Fim do jogo |
|---|---|---|
| ×1.8 (experimento) | ~14h | fase 1100, ~41h |
| **×1.9** | **~3,7h** | **fase 1780, ~64h** |
| ×2.0 (experimento) | ~3h | passa de 2400 (limite dos números) em ~8h |

Com ×1.9, o jogador que prestigia quando trava faz runs de 20–30 min no começo e
de 1–4h no fim (`npm run sim`). Em sessões de 30 min + 8h fora: fase 1000 em 2,1
dias e fim do jogo na fase ~2120 depois de ~4 meses.

### Zonas

Escolhidas a cada 10 fases, após o boss. Valem **apenas dentro da zona** — não
acumulam entre zonas. Isso é essencial: modificadores persistentes de ouro
compõem exponencialmente e destroem a curva.

| Zona | Vida | Ouro | Vida do boss | Tempo do boss | Extra |
|---|---|---|---|---|---|
| Ruins | ×1.4 | ×2.0 | ×2.5 | 30s | — |
| Catacombs | ×1.0 | ×1.0 | ×2.5 | 45s | — (alma extra descartada, problema 3) |
| Ravine | ×0.5 | ×0.5 | ×1.5 | 45s | — |

A vida do boss multiplica a vida do inimigo comum da zona. As fases 1–10 são
sempre Catacombs. Cada zona tem um papel: Ruins é rápida, mas o boss foge cedo;
Ravine é lenta, mas o boss fraco leva mais fundo (ver problema 5).

### O que a simulação produziu

Com ouro 1.24 e um jogador "esperto": farma até o kill cair abaixo de 8s (e
desiste depois de 40 kills na mesma fase) e, a cada boss, joga o próximo bloco
em cada zona e fica com a primeira que não trava (ordem Ruins, Catacombs, Ravine).

- Muro na **fase 200**; passa a 180 em **~3,1 horas**
- **~8,3 horas** até o muro, 96% delas farmando — de 180 a 200 é um grind longo
- **~1.720 kills**, média de 17s por kill
- Nível de Attack ao fim: **583**
- Zonas escolhidas: Ruins 16×, Catacombs 1×, Ravine 2×

| Estratégia de zona | Muro | Até a 180 | Até o muro |
|---|---|---|---|
| Sempre Ruins | 180 | — | 2,6h |
| Alternando Ruins/Ravine | 190 | 2,6h | 4,7h |
| Esperto | 200 | 3,1h | 8,3h |
| Sempre Ravine | 200 | 3,4h | 9,3h |
| Sempre Catacombs | 190 | 4,0h | 5,9h |

Nenhuma estratégia fixa domina: Ruins é a mais rápida mas para na 180, Ravine é
a única que chega à 200 sozinha e alternar é o caminho mais rápido até a 180.

Com progresso offline (8h a 50%), o mesmo jogador esperto chega à fase 180 com:

| Sessões | Jogo ativo até a 180 | Dias |
|---|---|---|
| Sempre ativo | 3,1h | — |
| 60 min + 8h fora | 2,0h | 0,8 |
| 30 min + 8h fora | 1,2h | 0,7 |
| 15 min + 8h fora | 45 min | 1,0 |

---

## 5. Sistemas

### 5.1 Combate

Tick fixo de **100ms**, nunca por frame. Nas fases altas o herói mata vários
inimigos por segundo e animar cada morte trava a UI.

```ts
const restante = hpRestante - dps(estado) * dt;
```

### 5.2 Inimigos procedurais

Nome composto + ícone + cor da paleta da zona. Sem imagem.

```ts
const ADJ  = ['Starving','Pale','Crawling','Nameless','Hollow','Rotting','Blind','Ashen'];
const BASE = ['Wolf','Spider','Worm','Bat','Thrall','Shade','Hound','Wretch'];
const OF   = { ruins: 'of the Ruins', catacombs: 'of the Pit', ravine: 'of the Rift' };
// "Starving Wolf of the Ruins"
```

Bosses usam prefixos reservados: **Elder**, **Warden**, **The First**, com borda
vermelha e ícone maior.

Com ~30 ícones e uma paleta por zona, o jogador passa centenas de fases sem
repetir combinação.

### 5.3 Armas (cosmético)

O ícone da arma ao lado do herói muda quando o nível de Attack cruza um marco.
**Zero efeito mecânico.** É recompensa visual pura, sem risco de quebrar a curva.

```ts
const ARMAS = [
  { nivel: 1,  icone: 'sword',  cor: '#6B6862', nome: 'Rusted Dagger' },
  { nivel: 10, icone: 'sword',  cor: '#3A6098', nome: 'Shortsword' },
  { nivel: 25, icone: 'axe',    cor: '#854F0B', nome: "Warden's Axe" },
  // ...
];
const armaAtual = (n: number) => [...ARMAS].reverse().find(a => n >= a.nivel);
```

Nomes definidos: Rusted Dagger, Shortsword, Warden's Axe, Heavy Maul, Twin Blades,
Thunderblade, Blazing Fury, Relic of the First.

Ao trocar de arma: ícone pulsa e o nome aparece por 2 segundos. Não use modal.
A cor do número de dano acompanha a cor da arma.

**O espaçamento dos marcos está em aberto** — ver seção 8.

### 5.4 Progresso offline

```
tempoOffline = min(agora - ultimoSave, 8h)
ganho = tempoOffline * 0.5 * (ouro por segundo na última fase)
```

Modal ao abrir: "You were away 3h12m. Your hero gathered 4.2K gold."

Esse modal é uma das partes mais importantes do jogo — é o que faz a pessoa
reabrir o app. O teto de 8h e a eficiência de 50% existem pra que jogar ativo
continue valendo mais que não jogar.

Implementado em `applyOffline` (motor) e `src/game/persistence.ts`. O ganho vale
ao abrir o app e ao voltar do segundo plano; fora do app o loop fica parado, pra
o tempo não contar duas vezes. Preso num boss que não mata a tempo, conta a fase
anterior (é onde o jogo o deixaria). Ausências abaixo de 1 minuto rendem ouro sem
abrir o modal. O save é regravado logo depois de aplicar o ganho — senão fechar o
app antes do próximo save repetiria o crédito.

---

## 6. Telas

Três, mais o modal de offline.

**Combat** (inicial)
- Topo: gold, souls, stage
- Esquerda: herói + ícone da arma. Direita: inimigo + barra de vida
- Números de dano flutuando no meio
- Botão **Advance** quando disponível
- Rodapé: dps e gold/s

**Upgrades**
- Os cinco upgrades com nível, efeito, custo e botão
- **Comprar ×10 desde o início** — clicar 200 vezes é tortura
- Botão desabilitado visualmente quando não dá pra pagar

**Prestige**
- Quantas almas ganharia agora, o que fazem, botão com confirmação
- Feito em `src/screens/PrestigeScreen.tsx`; o topo mostra as almas pendentes ("0 +13")

**Zone select** — aparece após cada boss, 3 cartas.

### Animação

Só o que dá peso, nunca o que atrasa o jogador:
- barra de vida encolhendo (`withTiming`)
- número de dano subindo e sumindo (`withSequence` translateY + opacity)
- tremor de 3px no crítico
- próximo inimigo entrando pela direita
- haptic no boss (`expo-haptics`)

**Não adicione animação para alongar o jogo.** Ver seção 9.

---

## 7. Dados

Um único objeto JSON, salvo a cada 10s e ao perder foco.

```ts
interface SaveFile {
  version: 2;        // suba ao mudar o formato e converta a versão anterior
  savedAt: number;   // ms — base do progresso offline
  game: { stage; highestCleared; record; gold; souls; pendingSouls; zone; levels };
}
```

Formato e validação ficam em `src/engine/save.ts` (puro, testado); leitura e
gravação no AsyncStorage em `src/game/persistence.ts`. A vida do inimigo e o
tempo do boss não são salvos: ao abrir, o inimigo volta cheio. As fases
restantes na zona saem de `stage`. Save inválido é descartado e o jogo começa
do zero — nunca grave antes de ler, ou o save é sobrescrito por um jogo novo.
Saves v1 (antes do prestígio) são convertidos: o recorde vira o último boss vencido
e as almas desses bosses ficam pendentes.

### Números grandes

Na fase 190 a vida já passa de 10^23. Formate com sufixos (K, M, B, T, aa, ab…)
desde o primeiro commit. `Number` do JS quebra em 1.8×10^308, o que corresponde a
~fase 2600 — suficiente para a v1, mas se o jogo passar disso será preciso migrar
para `{mantissa, expoente}`.

### Strings

Todas num objeto só, mesmo tendo um idioma:

```ts
export const t = {
  stage: 'Stage', advance: 'Advance', gold: 'Gold',
  souls: 'Souls', prestige: 'Prestige',
} as const;
```

Se um dia houver versão PT-BR, é criar um segundo objeto.

---

## 8. Problemas em aberto

Problemas conhecidos, com o estado de cada um. Os resolvidos ficam aqui pelo
histórico das decisões.

**1. Prestígio: resolvido, com ressalvas.** A fórmula antiga explodia (fase 2000 na
run 4), e acelerar o `hpGrowth` só atrasava o problema em uma run. O desenho atual
está na seção 4. Ressalvas: (a) a janela é estreita — ×1.8 para na fase 1100, ×2.0
passa do limite dos números; (b) quem prestigia a cada minuto termina o jogo em ~20
min de jogo — hoje o freio é recomprar os upgrades a cada run, então **nada de
compra automática de upgrades sem simular esse jogador**; (c) o jogo tem fim (fase
~1780 jogando sem parar, ~2120 em sessões), abaixo do limite de `Number`.

**2. Os marcos de arma não estão calibrados.** O jogador chega ao nível 583 de
Attack numa run. Marcos até 200 seriam todos desbloqueados antes da metade. O
espaçamento precisa sair da simulação: ~12 a 15 marcos até ~650, com intervalos
crescentes (1, 10, 25, 50, 90, 140, 200, 270, 350, 440, 540, 650).

**3. Alma extra das Catacombs: descartada.** Com o prestígio atual, 2 almas por boss
em Catacombs levavam à fase 2400 em 1,9h, e 1,5 alma em 2,6h; mesmo sem o jogador
preferir Catacombs, o teto do jogo sumia. Catacombs segue neutra e ainda precisa de
um papel dentro da zona (ex.: limite de boss maior), a simular. **Nenhuma fonte nova
de almas sem simular.**

**4. Anúncio recompensado não está na curva.** Se entrar 2× de ouro por anúncio,
um jogador que sempre assiste tem o dobro da economia simulada. Simular esse
jogador antes de ligar o rewarded.

**5. Zonas: mitigado, não resolvido.** Ruins dominava todas as estratégias. O
desenho atual (boss de Ruins foge em 30s, boss de Ravine com ×1.5) dá um papel a
cada zona — ver seção 4. Ressalvas: (a) a janela é estreita: no experimento, com
35s em Ruins ela voltava a dominar; (b) Catacombs quase nunca é escolhida e a alma
extra foi descartada (problema 3), então o papel dela segue em aberto; (c) com o
prestígio o jogador sai antes do grind do fim da run, então a métrica para rever
as zonas é **almas por hora**.

**6. Offline: resolvido pelo prestígio.** Sem prestígio, 15 min de jogo por sessão
levavam à fase 180 em 1 dia. Com prestígio, o jogo inteiro dura: 30 min + 8h fora
chega à fase 1000 em 2,1 dias e ao fim (~2120) em ~4 meses; no experimento, 15 min
por sessão levavam ~5 meses. A primeira run continua rápida pra quem joga pouco.
Mantidos 50% e 8h. Rever antes do anúncio recompensado (problema 4), que dobraria
o ganho offline.

---

## 9. Decisões recusadas

Esta seção existe para não refazer discussões já fechadas.

| Recusado | Motivo |
|---|---|
| Sprites e ilustrações | Consistência é o problema real; aumenta o APK; não move retenção |
| Múltiplas classes de herói | Cada classe precisa da própria curva calibrada, e ser competitiva com as outras |
| Habilidades ativas com cooldown | Conflitam com progresso offline e farm; mudam o gênero |
| Escolher entre dois inimigos lado a lado | O jogador não tem informação pra decidir; vira clique aleatório |
| Bênçãos roguelite ao vencer boss | Cada modificador novo interage com uma curva já comprovadamente sensível |
| Animação longa ou frases para alongar o jogo | 94% do tempo já é farm; atraso artificial só adiciona atrito |
| Moeda premium | Exige uma segunda economia calibrada contra a primeira |
| Anúncio intersticial | Forma mais rápida de fazer alguém desinstalar um idle |
| Inventário, equipamentos, missões, história | Escopo |
| Ranking, conta, multiplayer, conquistas | Escopo |

**Monetização:** lançar sem nada. Depois do APK publicado e de ver alguém jogando,
o primeiro passo é anúncio recompensado no progresso offline. Compra única
"remove ads + bônus permanente" (~R$ 10-15) vem depois disso. Números realistas:
idle games convertem 1-3% em pagantes; o projeto é aprendizado, não renda.

---

## 10. Ordem de construção

Cada marco é entregável e testável sozinho.

1. **Motor no console** — tick, dano, morte, ouro, avanço. Sem React, sem tela.
   Feito em `src/engine/engine.ts`.
2. **Simulação de balanceamento** — já feita, ver `sim/simulate.ts`. Rodar de novo
   (`npm run sim`) ao mexer em qualquer constante.
3. **Tela de Combat** — barra de vida, números flutuantes, botão Advance
   Feito em `src/screens/CombatScreen.tsx`. Até o marco 5, sair do boss mantém a zona.
4. **Tela de Upgrades + save local**
   Feito em `src/screens/UpgradesScreen.tsx` e `src/game/persistence.ts`.
5. **Zonas + tela de seleção**
   Feito em `src/components/ZoneSelect.tsx`, com o desenho de zonas do problema 5.
6. **Progresso offline + modal**
   Feito em `src/components/AwayModal.tsx` e `applyOffline` no motor.
7. **Prestígio** (resolver o problema 1 antes)
   Feito em `src/screens/PrestigeScreen.tsx`, com a subida automática da seção 3.
8. **Armas cosméticas + inimigos procedurais**
9. **Polimento** — haptics, formatação de números, ícone, splash
10. **Build APK** — EAS Build, testar em dispositivo físico, publicar

Os marcos 1 e 2 parecem os menos divertidos e são os que decidem se o jogo presta.

---

## 11. Instruções para o agente

**Não altere constantes de balanceamento sem simular.** Os valores da seção 4 não
são chutes — foram obtidos depois de várias iterações, e as duas primeiras
tentativas produziram um jogo que travava na fase 10 e outro que acabava em 2
minutos. `npm run sim` roda o motor real tick a tick e imprime a curva. Se
mudar um número, rode e cole o resultado na conversa antes de seguir.

**A intuição falha aqui.** Exemplo real, com o desenho de zonas antigo: baixar o limiar de farm de 12s para 4s
parecia que ia deixar o jogo menos grindy. Não deixou — o tempo total ficou
praticamente igual (4,5h → 4,0h), e o número de kills quase dobrou.

**O limiar de farm não é constante do jogo.** É comportamento do jogador,
existe só na simulação para modelar alguém razoável. Não implemente isso no app.

**Almas são o número mais sensível do jogo.** Com ×1.9 por alma, qualquer fonte
extra (zona, conquista, anúncio) ou compra automática de upgrades muda o fim do jogo
em centenas de fases. Simule antes (problemas 1 e 3).

**O motor é puro.** `src/engine/` não importa React nem tem side effect. Mantenha
assim: o mesmo código roda no app e na simulação. A pasta `sim/` fica fora do
bundle.

**Ao adicionar qualquer sistema novo**, cheque a seção 9 primeiro. Se estiver lá,
foi recusado de propósito.

**Não invente conteúdo em português.** O jogo é todo em inglês. Nomes de sabor
(itens, inimigos, zonas) devem seguir estruturas curtas e concretas —
adjetivo + substantivo funciona sempre.

### Arquivos do projeto

- `src/engine/engine.ts` — motor puro, com as constantes calibradas em `CONFIG`
- `src/engine/format.ts` — números grandes (K, M, B, T, aa, ab…)
- `sim/simulate.ts` — simulador de balanceamento; dirige o motor tick a tick
- `src/game/store.ts` — estado do app (Zustand) em volta do motor
- `src/game/useGameLoop.ts` — loop de tick fixo de 100ms
- `src/screens/CombatScreen.tsx` e `src/components/` — tela de Combat
- `src/screens/UpgradesScreen.tsx` — upgrades com ×1 e ×10
- `src/components/ZoneSelect.tsx` — 3 cartas depois de cada boss, com o tempo
  estimado do próximo boss no dps atual
- `src/components/TopBar.tsx` e `TabBar.tsx` — moldura comum às telas
- `src/engine/save.ts` — formato do save e validação (puro, testado)
- `src/game/persistence.ts` — lê o save ao abrir, grava a cada 10s e ao perder foco,
  e credita o tempo fora do app
- `src/game/useAppActive.ts` — pausa o loop enquanto o app está em segundo plano
- `src/components/AwayModal.tsx` — modal "You were away…"
- `src/screens/PrestigeScreen.tsx` — almas da run, efeito e prestígio com confirmação
- `src/strings.ts` — todas as strings do jogo; `src/theme.ts` — cores
- Comandos: `npm start` (Expo Go ou web), `npm run sim`, `npm test`, `npm run typecheck`

Em desenvolvimento, `soulgrind.getState()` e `soulgrind.setState()` ficam
disponíveis no console do navegador (`npm run web`), para testar situações
difíceis de alcançar jogando, como um boss.

Os golpes e críticos mostrados na tela são cosméticos: o combate usa só o dps
médio do motor. Não leve sorteio de crítico para o motor sem simular.

Os arquivos originais (`motor-idle.ts`, `simulacao-zonas.js`) estão no primeiro
commit do git, caso precise consultar.
