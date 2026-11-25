// Panel del personal: «Ver pedido #n» de las bandejas de Soporte. En el panel la tarjeta de contexto
// está oculta en #/reclamos y #/devoluciones, así que el botón navega a #/consulta-pedido?pedido={n}.
import test from "node:test";
import assert from "node:assert/strict";
import { configurarPortalSoporte } from "../../src/soporte/soporte-vista.js";
import { readFileSync } from "node:fs";
import { alVerPedidoDelPanel } from "../../src/panel/pantallas/soporte.js";

/** DOM mínimo con oyentes que se pueden disparar. */
class Nodo {
  constructor(etiqueta) {
    this.tagName = String(etiqueta).toUpperCase();
    this.children = [];
    this.atributos = new Map();
    this.oyentes = {};
    this.textContent = "";
    this.className = "";
    this.hidden = false;
    this.dataset = {};
  }
  get lastChild() { return this.children.at(-1) ?? null; }
  append(...hijos) { this.children.push(...hijos); }
  prepend(...hijos) { this.children.unshift(...hijos); }
  replaceChildren(...hijos) { this.children = hijos; }
  setAttribute(n, v) { this.atributos.set(n, String(v)); }
  getAttribute(n) { return this.atributos.has(n) ? this.atributos.get(n) : null; }
  addEventListener(tipo, fn) { (this.oyentes[tipo] ??= []).push(fn); }
  click() { for (const fn of this.oyentes.click ?? []) fn({ preventDefault() {} }); }
}
const recorrer = (nodo, fn) => { fn(nodo); nodo.children.forEach((h) => recorrer(h, fn)); };
const botones = (raiz, texto) => { const r = []; recorrer(raiz, (n) => { if (n.tagName === "BUTTON" && n.textContent === texto) r.push(n); }); return r; };

async function conDomSimulado(fn) {
  const doc = globalThis.document;
  const opcion = globalThis.Option;
  globalThis.document = { createElement: (t) => new Nodo(t) };
  globalThis.Option = class extends Nodo { constructor(texto, valor) { super("option"); this.textContent = texto; this.value = valor; } };
  try {
    return await fn();
  } finally {
    globalThis.document = doc;
    globalThis.Option = opcion;
  }
}

const respuestas = {
  "/api/soporte/reclamos": [{ id: 1, pedidoId: 3, estado: "RESUELTO", motivo: "Tarde", descripcion: "Llegó tarde", creadoEn: "2026-11-24T10:00:00Z" }],
  "/api/soporte/devoluciones": [{ id: 2, pedidoId: 5, estado: "CERRADA", motivo: "Defecto", importeReembolso: 10, creadoEn: "2026-11-24T10:00:00Z", lineas: [] }],
};
const apiRequest = async (ruta) => ({ json: async () => respuestas[String(ruta).split("?")[0]] ?? [] });
const estado = () => ({ usuarioSesion: { idUsuario: 7, rol: "SOPORTE" } });

test("4a: sin la opción alVerPedido, «Ver pedido #n» sigue llamando a mostrarContexto (no la usa nadie más)", async () => {
  await conDomSimulado(async () => {
    const llamadas = [];
    const contenedor = new Nodo("div");
    const portal = configurarPortalSoporte({
      apiRequest: async (ruta, ...resto) => { llamadas.push(String(ruta)); return apiRequest(ruta, ...resto); },
      obtenerEstado: estado, contenedor, mostrarToast() {},
    });
    await portal.cargar();
    const [contexto] = contenedor.children;
    assert.equal(contexto.hidden, true);
    const [ver] = botones(contenedor, "Ver pedido #3");
    assert.ok(ver, "hay un botón «Ver pedido #3»");
    ver.click();
    assert.equal(contexto.hidden, false, "mostrarContexto pinta la tarjeta de contexto");
    await new Promise((r) => setTimeout(r, 5)); // deja terminar la consulta antes de retirar el DOM simulado
    assert.ok(llamadas.some((r) => r.includes("/api/pedidos/3") || r.includes("/3")), "consulta el pedido 3");
  });
});

test("alVerPedido(pedidoId) sustituye a mostrarContexto en reclamos y en devoluciones", async () => {
  await conDomSimulado(async () => {
    const vistos = [];
    const contenedor = new Nodo("div");
    const portal = configurarPortalSoporte({
      apiRequest, obtenerEstado: estado, contenedor, mostrarToast() {}, alVerPedido: (id) => vistos.push(id),
    });
    await portal.cargar();
    botones(contenedor, "Ver pedido #3")[0].click();
    botones(contenedor, "Ver pedido #5")[0].click();
    assert.deepEqual(vistos, [3, 5]);
    assert.equal(contenedor.children[0].hidden, true, "no pinta la tarjeta de contexto");
  });
});

test("4b: en el panel, «Ver pedido #3» navega (con historial) a #/consulta-pedido?pedido=3, desde reclamos y desde devoluciones", async () => {
  const navegadas = [];
  const alVerPedido = alVerPedidoDelPanel((ruta) => navegadas.push(ruta));
  alVerPedido(3);
  alVerPedido(5);
  assert.deepEqual(navegadas, ["#/consulta-pedido?pedido=3", "#/consulta-pedido?pedido=5"]);
  // Desde la v6 las bandejas del panel ya no usan el portal: el detalle enlaza a la consulta del pedido.
  const vista = readFileSync(new URL("../../src/panel/pantallas/bandeja-vista.js", import.meta.url), "utf8");
  assert.match(vista, /href="\$\{seguro\(`#\/consulta-pedido\?pedido=\$\{pedidoId\}`\)\}">Ver el pedido #/);
  // «navegar» del panel asigna location.hash, que crea entrada en el historial.
  const main = readFileSync(new URL("../../src/panel/panel-main.js", import.meta.url), "utf8");
  assert.match(main, /navegar: \(ruta\) => \{\s*window\.location\.hash = ruta;/);
});
