/**
 * Monta o conteúdo (payload) de cada tipo de QR Code.
 * Funções puras: recebem os campos do formulário e devolvem
 * { ok: true, value } ou { ok: false, error }, com a mensagem para o usuário.
 */

const ok = (value) => ({ ok: true, value });
const fail = (error) => ({ ok: false, error });

export const MAX_TEXT = 1200;

/** Mantém só os dígitos. */
export const digits = (value = "") => String(value).replace(/\D/g, "");

/**
 * Normaliza telefone brasileiro para o formato internacional sem "+".
 * "(17) 98113-4522" → "5517981134522". Números que já têm DDI são mantidos.
 */
export function normalizePhone(value) {
  const international = /^\s*(\+|00)/.test(String(value)); // "+" ou "00" = DDI informado
  let n = digits(value);
  if (n.startsWith("00")) n = n.slice(2);
  if (!international && (n.length === 10 || n.length === 11)) n = `55${n}`; // DDD + número
  return n;
}

const isPhone = (n) => n.length >= 10 && n.length <= 15;

/** Escapa caracteres especiais do formato WIFI: (\ ; , : ") */
export const escapeWifi = (value) => String(value).replace(/([\\;,:"])/g, "\\$1");

export const BUILDERS = {
  link({ url = "" }) {
    const raw = url.trim();
    if (!raw) return fail("Digite um endereço.");
    const withScheme = /^[a-z][a-z\d+.-]*:/i.test(raw) ? raw : `https://${raw}`;
    try {
      const parsed = new URL(withScheme);
      if (!["http:", "https:"].includes(parsed.protocol)) return fail("Use um endereço que comece com http ou https.");
      if (!parsed.hostname.includes(".")) return fail("Esse endereço parece incompleto.");
      return ok(parsed.href);
    } catch {
      return fail("Esse endereço não é válido.");
    }
  },

  text({ text = "" }) {
    if (!text.trim()) return fail("Digite o texto.");
    if (text.length > MAX_TEXT) return fail(`O texto passou de ${MAX_TEXT} caracteres. QR Codes muito densos falham na leitura.`);
    return ok(text);
  },

  wifi({ ssid = "", password = "", security = "WPA", hidden = false }) {
    if (!ssid.trim()) return fail("Digite o nome da rede.");
    const type = ["WPA", "WEP", "nopass"].includes(security) ? security : "WPA";
    if (type !== "nopass" && !password) return fail("Digite a senha ou escolha \"Sem senha\".");
    const parts = [`T:${type}`, `S:${escapeWifi(ssid)}`];
    if (type !== "nopass") parts.push(`P:${escapeWifi(password)}`);
    if (hidden) parts.push("H:true");
    return ok(`WIFI:${parts.join(";")};;`);
  },

  whatsapp({ phone = "", message = "" }) {
    const n = normalizePhone(phone);
    if (!isPhone(n)) return fail("Digite o número com DDD.");
    const text = message.trim() ? `?text=${encodeURIComponent(message.trim())}` : "";
    return ok(`https://wa.me/${n}${text}`);
  },

  email({ to = "", subject = "", body = "" }) {
    const address = to.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) return fail("Digite um e-mail válido.");
    const params = new URLSearchParams();
    if (subject.trim()) params.set("subject", subject.trim());
    if (body.trim()) params.set("body", body.trim());
    // URLSearchParams usa "+" para espaço; mailto precisa de %20
    const query = params.toString().replace(/\+/g, "%20");
    return ok(`mailto:${address}${query ? `?${query}` : ""}`);
  },

  phone({ phone = "" }) {
    const n = normalizePhone(phone);
    if (!isPhone(n)) return fail("Digite o número com DDD.");
    return ok(`tel:+${n}`);
  },
};

export function buildPayload(type, fields) {
  const builder = BUILDERS[type];
  if (!builder) return fail("Tipo desconhecido.");
  return builder(fields);
}
