import { test } from "node:test";
import assert from "node:assert/strict";
import { buildPayload, escapeWifi, normalizePhone, MAX_TEXT } from "../src/payloads.js";

const value = (type, fields) => {
  const result = buildPayload(type, fields);
  assert.equal(result.ok, true, result.error);
  return result.value;
};
const error = (type, fields) => {
  const result = buildPayload(type, fields);
  assert.equal(result.ok, false);
  return result.error;
};

test("link: adiciona https quando falta e normaliza", () => {
  assert.equal(value("link", { url: "wglsoftware.com" }), "https://wglsoftware.com/");
  assert.equal(value("link", { url: "  http://exemplo.com.br/a?b=1 " }), "http://exemplo.com.br/a?b=1");
});

test("link: recusa protocolos perigosos e endereços quebrados", () => {
  assert.match(error("link", { url: "javascript:alert(1)" }), /http/);
  assert.match(error("link", { url: "localhost" }), /incompleto/);
  assert.match(error("link", { url: "" }), /Digite/);
});

test("texto: aceita e limita o tamanho", () => {
  assert.equal(value("text", { text: "Olá" }), "Olá");
  assert.match(error("text", { text: "a".repeat(MAX_TEXT + 1) }), /caracteres/);
});

test("wifi: monta o formato padrão e escapa caracteres especiais", () => {
  assert.equal(escapeWifi('a;b,c:d"e\\f'), 'a\\;b\\,c\\:d\\"e\\\\f');
  assert.equal(
    value("wifi", { ssid: "Casa;2G", password: "s3nh@:forte", security: "WPA" }),
    "WIFI:T:WPA;S:Casa\\;2G;P:s3nh@\\:forte;;",
  );
});

test("wifi: rede aberta e rede oculta", () => {
  assert.equal(value("wifi", { ssid: "Visitantes", security: "nopass" }), "WIFI:T:nopass;S:Visitantes;;");
  assert.equal(value("wifi", { ssid: "X", password: "p", security: "WPA", hidden: true }), "WIFI:T:WPA;S:X;P:p;H:true;;");
  assert.match(error("wifi", { ssid: "X", security: "WPA" }), /senha/);
});

test("telefone brasileiro ganha o 55 e mantém número internacional", () => {
  assert.equal(normalizePhone("(17) 98113-4522"), "5517981134522");
  assert.equal(normalizePhone("+55 17 98113-4522"), "5517981134522");
  assert.equal(normalizePhone("00 1 415 555 0100"), "14155550100");
});

test("whatsapp: link wa.me com mensagem codificada", () => {
  assert.equal(
    value("whatsapp", { phone: "17 98113-4522", message: "Oi, quero um orçamento" }),
    "https://wa.me/5517981134522?text=Oi%2C%20quero%20um%20or%C3%A7amento",
  );
  assert.match(error("whatsapp", { phone: "1234" }), /DDD/);
});

test("e-mail: mailto com assunto e corpo usando %20", () => {
  assert.equal(
    value("email", { to: "contato@wgl.com", subject: "Orçamento de site", body: "" }),
    "mailto:contato@wgl.com?subject=Or%C3%A7amento%20de%20site",
  );
  assert.match(error("email", { to: "sem-arroba" }), /e-mail/);
});

test("telefone: tel com +", () => {
  assert.equal(value("phone", { phone: "(17) 3222-1000" }), "tel:+551732221000");
});

test("tipo desconhecido é recusado", () => {
  assert.equal(buildPayload("pix", {}).ok, false);
});
