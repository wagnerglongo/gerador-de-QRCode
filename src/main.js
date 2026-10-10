import { encode } from "./vendor/uqr.mjs";
import { buildPayload } from "./payloads.js";
import { checkColors, toSvg } from "./render.js";

const MARGIN = 4; // "zona de silêncio" exigida pela especificação do QR Code
const form = document.querySelector("#form");
const $ = (id) => document.getElementById(id);

let current = null; // { matrix, payload } do último QR válido

/* -------------------------------------------------------------------------
   Leitura do formulário
   ------------------------------------------------------------------------- */
const selectedType = () => form.elements.type.value;

function fieldsOf(type) {
  const group = form.querySelector(`.group[data-type="${type}"]`);
  const fields = {};
  group.querySelectorAll("input, select, textarea").forEach((input) => {
    fields[input.name] = input.type === "checkbox" ? input.checked : input.value;
  });
  return fields;
}

function showGroup(type) {
  form.querySelectorAll(".group").forEach((group) => {
    group.hidden = group.dataset.type !== type;
  });
}

/* -------------------------------------------------------------------------
   Geração
   ------------------------------------------------------------------------- */
function update() {
  const type = selectedType();
  const result = buildPayload(type, fieldsOf(type));
  const { fg, bg, ecc, caption } = form.elements;

  // Aviso de contraste
  const colors = checkColors(fg.value, bg.value);
  $("contrast").hidden = colors.level === "ok";
  $("contrast").textContent = colors.message;

  // Legenda do cartão
  $("card-caption").hidden = !caption.value.trim();
  $("card-caption").textContent = caption.value.trim();
  $("card").style.setProperty("--card-bg", bg.value);
  $("card").style.setProperty("--card-fg", fg.value);

  if (!result.ok) {
    current = null;
    $("error").hidden = false;
    $("error").textContent = result.error;
    $("card").classList.add("is-empty");
    $("meta").textContent = "";
    setActionsEnabled(false);
    return;
  }

  const { data, version } = encode(result.value, { ecc: ecc.value, border: 0 });
  current = { matrix: data, payload: result.value };

  $("qr").innerHTML = toSvg(data, { foreground: fg.value, background: bg.value, margin: MARGIN });
  // Não coloca o conteúdo no rótulo: no Wi-Fi ele incluiria a senha
  const label = form.querySelector(`input[name="type"][value="${type}"]`).nextElementSibling.textContent;
  $("qr").setAttribute("aria-label", `QR Code de ${label} gerado`);
  $("error").hidden = true;
  $("card").classList.remove("is-empty");
  $("meta").textContent = `Versão ${version}, ${data.length} × ${data.length} módulos. Quanto menor, mais fácil de ler de longe.`;
  setActionsEnabled(true);
}

function setActionsEnabled(enabled) {
  ["download-png", "download-svg", "copy-image"].forEach((id) => ($(id).disabled = !enabled));
}

let timer;
const scheduleUpdate = () => {
  clearTimeout(timer);
  timer = setTimeout(update, 100);
};

form.addEventListener("input", scheduleUpdate);
form.addEventListener("change", (event) => {
  if (event.target.name === "type") {
    showGroup(selectedType());
    form.querySelector(`.group[data-type="${selectedType()}"] input, .group[data-type="${selectedType()}"] textarea`)?.focus();
  }
  update();
});
form.addEventListener("submit", (event) => event.preventDefault());

/* -------------------------------------------------------------------------
   Exportação
   ------------------------------------------------------------------------- */
const fileName = (ext) => `qrcode-${selectedType()}.${ext}`;

function download(blob, name) {
  const url = URL.createObjectURL(blob);
  const link = Object.assign(document.createElement("a"), { href: url, download: name });
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Desenha o cartão (QR + legenda) em um canvas de alta resolução. */
async function renderPng() {
  const { fg, bg, caption } = form.elements;
  const matrix = current.matrix;
  const cell = Math.floor(1024 / (matrix.length + MARGIN * 2));
  const qrSize = cell * (matrix.length + MARGIN * 2);
  const text = caption.value.trim();
  const captionHeight = text ? Math.round(qrSize * 0.12) : 0;

  const canvas = document.createElement("canvas");
  canvas.width = qrSize;
  canvas.height = qrSize + captionHeight;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = bg.value;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = fg.value;
  matrix.forEach((row, y) =>
    row.forEach((dark, x) => dark && ctx.fillRect((x + MARGIN) * cell, (y + MARGIN) * cell, cell, cell)),
  );

  if (text) {
    await document.fonts.load(`600 ${Math.round(captionHeight * 0.42)}px Archivo`);
    ctx.font = `600 ${Math.round(captionHeight * 0.42)}px Archivo, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, canvas.width / 2, qrSize + captionHeight * 0.3, canvas.width - cell * MARGIN * 2);
  }

  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}

let statusTimer;
function announce(message) {
  $("status").textContent = message;
  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => ($("status").textContent = ""), 2500);
}

$("download-png").addEventListener("click", async () => {
  if (!current) return;
  download(await renderPng(), fileName("png"));
  announce("PNG baixado.");
});

$("download-svg").addEventListener("click", () => {
  if (!current) return;
  const { fg, bg } = form.elements;
  const svg = toSvg(current.matrix, { foreground: fg.value, background: bg.value, margin: MARGIN });
  download(new Blob([svg], { type: "image/svg+xml" }), fileName("svg"));
  announce("SVG baixado. Ele pode ser ampliado sem perder qualidade.");
});

$("copy-image").addEventListener("click", async () => {
  if (!current) return;
  try {
    // ClipboardItem aceita a Promise direto, o que mantém o gesto do usuário no Safari
    await navigator.clipboard.write([new ClipboardItem({ "image/png": renderPng() })]);
    announce("Imagem copiada. Cole onde quiser.");
  } catch {
    announce("Seu navegador não deixou copiar a imagem. Use Baixar PNG.");
  }
});

update();
