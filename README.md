# Soulgrind — Idle RPG

Idle RPG para Android, feito com Expo e React Native. O herói luta sozinho contra
inimigos infinitos; o jogador gasta ouro em upgrades, decide quando avançar de fase,
escolhe uma zona a cada 10 fases e, quando trava, reseta em troca de almas que dão
bônus permanente de dano.

O jogo é todo em inglês. O repositório é em português: comentários, commits e
documentação. O objetivo do projeto é praticar e publicar um APK — não é um produto
comercial.

**Sem arte:** não há sprite nem ilustração. A identidade visual é feita com ícones
vetoriais (Lucide), cor e tipografia, inclusive o ícone do app e o splash.

## Como rodar

```bash
npm install
npm start
```

Abra pelo **Expo Go** (leia o QR code). Para ver no navegador, use `npm run web`.

| Comando | O que faz |
|---|---|
| `npm start` | Servidor de desenvolvimento (Expo Go ou web) |
| `npm run sim` | Simulador de balanceamento; roda o motor tick a tick e imprime a curva |
| `npm test` | Testes do motor, do save e do conteúdo (Node, sem React) |
| `npm run typecheck` | TypeScript no projeto inteiro |
| `npm run build:apk` | APK pelo EAS Build (veja abaixo) |

## Como o jogo funciona

- **Combate:** tick fixo de 100ms. O inimigo morto renasce na mesma fase; avançar é
  sempre decisão do jogador.
- **Bosses:** a cada 10 fases, com limite de tempo. Perdeu, volta uma fase.
- **Zonas:** depois de cada boss, 3 cartas. Ruins rende mais ouro mas o boss foge em
  30s; Ravine é pobre mas tem boss fraco; Catacombs é neutra. Os modificadores valem
  só dentro da zona.
- **Prestígio:** cada boss vencido pela primeira vez rende 1 alma (a partir da fase
  30), e cada alma multiplica o dano por 1.9. Prestigiar zera ouro, upgrades e fase,
  e mantém almas e recorde. Fases abaixo do recorde sobem sozinhas.
- **Offline:** metade do ouro por segundo da fase atual, com teto de 8h, creditado ao
  abrir o app ou ao voltar do segundo plano.

## Arquitetura

```
src/engine/    motor puro: combate, upgrades, zonas, prestígio, offline, save
src/game/      estado do app (Zustand), loop de 100ms, persistência, haptics
src/screens/   Combat, Upgrades, Prestige
src/components/cartas de zona, inimigo, barra de vida, números flutuantes, modal
src/content/   armas cosméticas e inimigos procedurais (puros, testados)
sim/           simulador de balanceamento — fica fora do bundle do app
scripts/       gerador do ícone, do splash e do favicon
```

O motor (`src/engine/`) não importa React nem tem side effect: o mesmo código roda no
app e no simulador. É isso que permite medir o balanceamento de verdade.

## Balanceamento

Os números do jogo não são chutes: saíram de simulação. `npm run sim` joga o motor
real, com um jogador modelado (farma até o kill ficar rápido, escolhe zona olhando o
próximo boss, prestigia quando trava) e imprime a curva.

Com os valores atuais:

- primeira run trava na fase 200, depois de ~8h de jogo (96% farmando);
- prestigiando quando trava, a fase 1000 chega em ~3,7h e o jogo termina na fase
  ~1780 depois de ~64h;
- jogando 30 min por dia com 8h offline, a fase 1000 chega em ~2 dias e o fim em
  ~4 meses.

**Não altere constante de balanceamento sem rodar `npm run sim` antes.** A janela é
estreita: bônus de alma ×1.8 faz o jogo parar na fase 1100, ×2.0 estoura o limite dos
números. O histórico de cada decisão, com os números que a motivaram, está no
[CLAUDE.md](CLAUDE.md).

## Build do APK

O build roda no EAS, então precisa de uma conta Expo (o login é interativo):

```bash
npx eas-cli login
npx eas-cli build --platform android --profile preview
```

O perfil `preview` gera um APK para instalar no celular; `production` gera um APK com
o número de versão incrementado automaticamente. A configuração está em
[eas.json](eas.json), e o identificador do app (`com.victorfariasw.soulgrind`) em
[app.json](app.json).

## Ícone e splash

São gerados a partir do fantasma do Lucide, na cor das almas:

```bash
npm install --no-save @resvg/resvg-js
node scripts/generate-icons.mjs
```

## Estado

Marcos 1 a 9 prontos: motor, simulação, Combat, Upgrades e save, zonas, progresso
offline, prestígio, armas e inimigos procedurais, polimento. Falta o marco 10: gerar
o APK, testar no aparelho e publicar.

Os problemas ainda em aberto — papel das Catacombs, efeito de anúncio recompensado na
curva — estão listados na seção 8 do [CLAUDE.md](CLAUDE.md).
