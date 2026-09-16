// Gera o ícone, o ícone adaptativo do Android, o splash e o favicon a partir do
// fantasma do Lucide — sem arte: ícone vetorial + cor (seção 1).
//
// Rodar (o renderizador não fica nas dependências do projeto):
//   npm install --no-save @resvg/resvg-js
//   node scripts/generate-icons.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const out = process.argv[2] ?? fileURLToPath(new URL('../assets', import.meta.url));

// Mesmas cores de src/theme.ts.
const BG = '#0E0D0B';
const SURFACE = '#191714';
const BORDER = '#2E2A25';
const SOULS = '#9A86D1';

// Lucide "ghost", viewBox 24.
const BODY = 'M7.528 20.472a1.6 1.6 0 012.277 0l1.057 1.056a1.6 1.6 0 002.276 0l1.057-1.056a1.6 1.6 0 012.277 0l1.114 1.114a1.4 1.4 0 002.414-1V10a8 8 0 00-16 0v10.586a1.4 1.4 0 002.414 1z';
const EYES = ['M15 10v1', 'M9 10v1'];

function ghost({ px, cx, cy, color, strokeWidth = 1.6, tint = true }) {
  const s = px / 24;
  const fill = tint ? `fill="${color}" fill-opacity="0.14"` : 'fill="none"';
  return `<g transform="translate(${cx - 12 * s} ${cy - 12 * s}) scale(${s})" fill="none" stroke="${color}"
      stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">
    <path d="${BODY}" ${fill}/>
    ${EYES.map(d => `<path d="${d}"/>`).join('')}
  </g>`;
}

function svg(size, content, background) {
  const bg = background ? `<rect width="${size}" height="${size}" fill="${background}"/>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${bg}${content}</svg>`;
}

function write(name, svgText) {
  const png = new Resvg(svgText).render().asPng();
  fs.writeFileSync(path.join(out, name), png);
  console.log(name, png.length + ' bytes');
}

// Ícone clássico: fantasma dentro de um disco, sobre o fundo do jogo.
write('icon.png', svg(1024,
  `<circle cx="512" cy="512" r="400" fill="${SURFACE}" stroke="${BORDER}" stroke-width="10"/>` +
  ghost({ px: 560, cx: 512, cy: 512, color: SOULS }), BG));

// Ícone adaptativo do Android: o sistema recorta a forma, então o conteúdo fica na
// zona segura (os 66% do centro).
write('android-icon-background.png', svg(512, '', BG));
write('android-icon-foreground.png', svg(512, ghost({ px: 250, cx: 256, cy: 256, color: SOULS }), null));
write('android-icon-monochrome.png', svg(432, ghost({ px: 212, cx: 216, cy: 216, color: '#FFFFFF', tint: false }), null));

// Splash: só o fantasma; o fundo vem do backgroundColor do plugin no app.json.
write('splash-icon.png', svg(1024, ghost({ px: 640, cx: 512, cy: 512, color: SOULS }), null));

write('favicon.png', svg(48, ghost({ px: 40, cx: 24, cy: 24, color: SOULS, strokeWidth: 2.2 }), BG));
