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

// Trunca em vez de arredondar: nunca mostra mais ouro do que o jogador tem.
function truncate(n: number, decimals: number): string {
  const scale = Math.pow(10, decimals);
  return (Math.floor(n * scale + 1e-9) / scale).toFixed(decimals);
}

// `decimals` só vale abaixo de mil (ex.: dps 2.16); acima disso são sempre 2 casas + sufixo.
export function formatNumber(n: number, decimals = 0): string {
  if (Number.isNaN(n)) return 'NaN';
  if (n < 0) return '-' + formatNumber(-n, decimals);
  if (n === Infinity) return '∞';
  if (n < 1000) return truncate(n, decimals);

  let group = Math.floor(Math.log10(n) / 3);
  let mantissa = n / Math.pow(1000, group);
  // log10 erra na borda das potências de mil (ex.: 1e93 → 92.999…)
  if (mantissa >= 1000) { mantissa /= 1000; group++; }
  if (mantissa < 1) { mantissa *= 1000; group--; }

  return truncate(mantissa, 2) + suffix(group);
}

// Tempo fora do app: "45m", "3h12m", "8h".
export function formatDuration(seconds: number): string {
  const totalMinutes = Math.floor(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  return minutes === 0 ? `${hours}h` : `${hours}h${String(minutes).padStart(2, '0')}m`;
}
