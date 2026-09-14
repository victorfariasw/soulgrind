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

- **Expo + React Native + TypeScript**
- Estado: Zustand ou `useReducer` — não precisa de engine de jogo
- Animação: `react-native-reanimated` (roda na thread de UI, não disputa com o loop)
- Ícones: `@expo/vector-icons` (Tabler) ou `lucide-react-native`
- Persistência: AsyncStorage ou MMKV, um único blob JSON
- Build: EAS Build → APK
- Sem backend, sem conta, sem rede

---

## 3. Loop de jogo

1. O herói ataca automaticamente o inimigo da fase atual.
2. Inimigo morre → dropa ouro → **outro inimigo igual aparece na mesma fase**.
3. O jogador decide: continuar farmando ali ou apertar **Advance** para a próxima fase.
4. A cada 10 fases há um boss (2,5× de vida, limite de 45s). Ao vencer, o jogador
   escolhe a próxima zona entre 3 cartas.
5. Em algum ponto o avanço trava. O jogador faz **prestígio**: volta à fase 1 com
   almas, que dão bônus permanente de dano.

**O avanço NÃO é automático.** Essa é a decisão mais importante do design. Com
avanço automático, a primeira run durava 18 minutos e o jogador não tomava
nenhuma decisão. Com avanço manual, a run passou a durar ~4,6 horas e a tensão
entre farmar (seguro, lento) e avançar (mais ouro por kill, risco de travar) virou
a mecânica central.

---

## 4. Números calibrados

Todos os valores abaixo foram validados por simulação. **Não altere nenhum sem
rodar `motor-idle.ts` antes.**

### Inimigos

```
hp(fase)   = 5 * 1.32^(fase-1) * bossMult * zonaHp
ouro(fase) = 10 * 1.24^(fase-1) * zonaOuro

bossMult  = 2.5 se fase % 10 == 0, senão 1
bossTimeout = 45s  (não matou, volta uma fase)
```

### Herói

```
dano       = 2 * 1.08^nivelAttack          // ÚNICO upgrade multiplicativo
velocidade = 1 + nivelSpeed * 0.05         // aditivo
chanceCrit = min(0.5, nivelCritChance * 0.01)
multCrit   = 1.5 + nivelCritDamage * 0.15  // aditivo
bonusAlmas = 1.008^almas

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
almas = floor((maiorFase / 10) ^ 2.5)   // só a partir da fase 30
bônus = 1.008 ^ almas                    // multiplicador de dano
```

Ao prestigiar: zera ouro, upgrades e fase. Mantém almas e maior fase histórica.

### Zonas

Escolhidas a cada 10 fases, após o boss. Valem **apenas dentro da zona** — não
acumulam entre zonas. Isso é essencial: modificadores persistentes de ouro
compõem exponencialmente e destroem a curva.

| Zona | Vida | Ouro | Extra |
|---|---|---|---|
| Ruins | ×1.4 | ×2.0 | — |
| Catacombs | ×1.0 | ×1.0 | alma extra no boss |
| Ravine | ×0.5 | ×0.5 | — |

### O que a simulação produziu

Com ouro 1.24 e um jogador que farma até o kill cair abaixo de 8s, sempre
escolhendo Ruins:

- Muro na **fase 190**
- **~4,6 horas** de jogo até o muro
- **~1.300 kills**, média de 10s por kill
- Nível de Attack ao fim: **572**

Nenhuma estratégia de zona domina: Ruins leva mais fundo e custa mais tempo,
Ravine é mais rápido e para antes, alternar é o caminho curto.

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
interface Save {
  stage: number;
  maiorStage: number;
  gold: number;
  almas: number;
  zona: 'ruins' | 'catacombs' | 'ravine';
  fasesRestantesNaZona: number;
  niveis: { attack: number; speed: number; critChance: number; critDamage: number; greed: number };
  ultimoSave: number;
}
```

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

Estes são conhecidos e ainda não resolvidos. Nenhum bloqueia começar a codar.

**1. A curva de prestígio acelera e quebra.** Com os valores atuais, cada run vai
mais longe e mais rápido que a anterior; por volta da run 6 o jogo perde o
controle (fase 1680 em 4 minutos). O oposto também é fácil de causar: baixando o
bônus, todas as runs empacam na mesma fase. A janela é estreita. Caminho mais
provável: fazer `hpGrowth` acelerar com a fase (ex. `1.32 + fase * 0.0004`) em vez
de ser constante. **Simular antes de codar a tela de prestígio.**

**2. Os marcos de arma não estão calibrados.** O jogador chega ao nível 572 de
Attack numa run. Marcos até 200 seriam todos desbloqueados antes da metade. O
espaçamento precisa sair da simulação: ~12 a 15 marcos até ~650, com intervalos
crescentes (1, 10, 25, 50, 90, 140, 200, 270, 350, 440, 540, 650).

**3. A alma extra das Catacombs não foi simulada.** É o único modificador de zona
que afeta o meta-progresso e pode interagir mal com o problema 1.

**4. Anúncio recompensado não está na curva.** Se entrar 2× de ouro por anúncio,
um jogador que sempre assiste tem o dobro da economia simulada. Simular esse
jogador antes de ligar o rewarded.

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
2. **Simulação de balanceamento** — já feita, ver `motor-idle.ts`. Rodar de novo
   ao mexer em qualquer constante.
3. **Tela de Combat** — barra de vida, números flutuantes, botão Advance
4. **Tela de Upgrades + save local**
5. **Zonas + tela de seleção**
6. **Progresso offline + modal**
7. **Prestígio** (resolver o problema 1 antes)
8. **Armas cosméticas + inimigos procedurais**
9. **Polimento** — haptics, formatação de números, ícone, splash
10. **Build APK** — EAS Build, testar em dispositivo físico, publicar

Os marcos 1 e 2 parecem os menos divertidos e são os que decidem se o jogo presta.

---

## 11. Instruções para o agente

**Não altere constantes de balanceamento sem simular.** Os valores da seção 4 não
são chutes — foram obtidos depois de várias iterações, e as duas primeiras
tentativas produziram um jogo que travava na fase 10 e outro que acabava em 2
minutos. `motor-idle.ts` roda com `npx tsx motor-idle.ts` e imprime a curva. Se
mudar um número, rode e cole o resultado na conversa antes de seguir.

**A intuição falha aqui.** Exemplo real: baixar o limiar de farm de 12s para 4s
parecia que ia deixar o jogo menos grindy. Não deixou — o tempo total ficou
praticamente igual (4,6h → 4,0h), só o número de kills dobrou.

**O limiar de farm não é constante do jogo.** É comportamento do jogador,
existe só na simulação para modelar alguém razoável. Não implemente isso no app.

**O motor é puro.** `motor-idle.ts` não importa React nem tem side effect. Mantenha
assim: o mesmo código roda no app e na simulação. A parte "SIMULADOR" do arquivo
fica fora do bundle.

**Ao adicionar qualquer sistema novo**, cheque a seção 9 primeiro. Se estiver lá,
foi recusado de propósito.

**Não invente conteúdo em português.** O jogo é todo em inglês. Nomes de sabor
(itens, inimigos, zonas) devem seguir estruturas curtas e concretas —
adjetivo + substantivo funciona sempre.

### Arquivos do projeto

- `motor-idle.ts` — motor + simulador, com constantes calibradas
- `simulacao-zonas.js` — experimento de farm manual e zonas, ainda não integrado
  ao motor. Integrar é uma das primeiras tarefas.
