import { test } from "node:test";
import assert from "node:assert/strict";
import { checkColors, contrastRatio, matrixToPath, toSvg } from "../src/render.js";
import { encode } from "../src/vendor/uqr.mjs";

test("contraste preto x branco é 21:1 e cores iguais 1:1", () => {
  assert.equal(Math.round(contrastRatio("#000000", "#ffffff")), 21);
  assert.equal(contrastRatio("#777777", "#777777"), 1);
});

test("avisa sobre cores invertidas e contraste baixo", () => {
  assert.equal(checkColors("#000000", "#ffffff").level, "ok");
  assert.match(checkColors("#ffffff", "#000000").message, /claro sobre fundo escuro/);
  assert.match(checkColors("#9a9a9a", "#ffffff").message, /Contraste baixo/);
});

test("matrixToPath junta módulos vizinhos da mesma linha", () => {
  const matrix = [
    [true, true, false, true],
    [false, false, false, false],
  ];
  assert.equal(matrixToPath(matrix), "M0 0h2v1h-2zM3 0h1v1h-1z");
  assert.equal(matrixToPath(matrix, 4), "M4 4h2v1h-2zM7 4h1v1h-1z");
});

test("toSvg gera um SVG com margem de silêncio e as cores escolhidas", () => {
  const { data } = encode("https://wglsoftware.com", { ecc: "M", border: 0 });
  const svg = toSvg(data, { foreground: "#1d1d1b", background: "#ffffff", margin: 4 });
  const size = data.length + 8;
  assert.match(svg, new RegExp(`viewBox="0 0 ${size} ${size}"`));
  assert.match(svg, /fill="#1d1d1b"/);
  assert.match(svg, /^<svg[^>]+>.*<\/svg>$/);
});
