/**
 * Desenho do QR Code e checagem de contraste. Funções puras (sem DOM).
 */

const HEX = /^#([0-9a-f]{6})$/i;

/** "#ff8800" → [255, 136, 0] */
export function hexToRgb(hex) {
  const match = HEX.exec(hex);
  if (!match) throw new TypeError(`Cor inválida: ${hex}`);
  return [0, 2, 4].map((i) => parseInt(match[1].slice(i, i + 2), 16));
}

/** Luminância relativa segundo a WCAG 2.x. */
export function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Razão de contraste entre duas cores (1 a 21). */
export function contrastRatio(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Avalia se as cores vão ser lidas pelas câmeras.
 * Leitores esperam módulos escuros sobre fundo claro, e contraste baixo falha.
 */
export function checkColors(foreground, background) {
  const ratio = contrastRatio(foreground, background);
  if (luminance(foreground) > luminance(background)) {
    return { level: "warn", ratio, message: "QR claro sobre fundo escuro: muitos leitores não reconhecem. Use a cor escura nos quadradinhos." };
  }
  if (ratio < 4.5) {
    return { level: "warn", ratio, message: `Contraste baixo (${ratio.toFixed(1)}:1). Pode falhar na leitura; o ideal é acima de 4,5:1.` };
  }
  return { level: "ok", ratio, message: "" };
}

/**
 * Converte a matriz em um único <path> SVG.
 * Quadradinhos vizinhos na mesma linha viram um retângulo só,
 * o que deixa o arquivo bem menor do que um <rect> por módulo.
 */
export function matrixToPath(matrix, margin = 0) {
  let d = "";
  matrix.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      if (!row[x]) { x += 1; continue; }
      const start = x;
      while (x < row.length && row[x]) x += 1;
      d += `M${start + margin} ${y + margin}h${x - start}v1h-${x - start}z`;
    }
  });
  return d;
}

export function toSvg(matrix, { foreground = "#000000", background = "#ffffff", margin = 4 } = {}) {
  const size = matrix.length + margin * 2;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges">`,
    `<rect width="${size}" height="${size}" fill="${background}"/>`,
    `<path d="${matrixToPath(matrix, margin)}" fill="${foreground}"/>`,
    "</svg>",
  ].join("");
}
