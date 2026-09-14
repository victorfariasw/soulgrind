// Números grandes com sufixo: 4.20K, 1.50T, 1.00aa, 1.00ab … zz.
// Number quebra em ~1.8e308 (sufixo "dt"), bem antes de acabarem os sufixos.

const NAMED = ['K', 'M', 'B', 'T'];
const LETTERS = 'abcdefghijklmnopqrstuvwxyz';

// group 1 = milhar, 2 = milhão, ...
function suffix(group: number): string {
  if (group <= NAMED.length) return NAMED[group - 1];
  const i = group - NAMED.length - 1;
  return LETTERS[Math.floor(i / 26)] + LETTERS[i % 26];
}

export function formatNumber(n: number): string {
  if (Number.isNaN(n)) return 'NaN';
  if (n < 0) return '-' + formatNumber(-n);
  if (n === Infinity) return '∞';
  if (n < 1000) return String(Math.floor(n));

  let group = Math.floor(Math.log10(n) / 3);
  let mantissa = n / Math.pow(1000, group);
  // log10 erra na borda das potências de mil (ex.: 1e93 → 92.999…)
  if (mantissa >= 1000) { mantissa /= 1000; group++; }
  if (mantissa < 1) { mantissa *= 1000; group--; }

  // Trunca em vez de arredondar: nunca mostra mais ouro do que o jogador tem.
  return (Math.floor(mantissa * 100 + 1e-9) / 100).toFixed(2) + suffix(group);
}
