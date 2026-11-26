// Panel del personal: últimos retoques de Soporte (v7): nombres de cliente en el Inicio, iniciales
// únicas, autor de la conversación, casillas, línea de recepción, ayuda y fila de acciones.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { leerCssPanel, resolverVarsCss } from "./util-css.mjs";
import { iniciales } from "../../src/panel/utilidades-panel.js";
import { renderizarBarraSuperior } from "../../src/panel/panel-layout.js";
import { actividadReciente } from "../../src/panel/inicio/admin-logica.js";
import { crearContextosPedido } from "../../src/panel/pantallas/contextos-pedido.js";
import { renderizarColaReclamos, renderizarDevolucionesPorAtender, renderizarEnManosDeOtros } from "../../src/panel/inicio/soporte-inicio.js";
import { renderizarDetalleDevolucion, renderizarDetalleReclamo } from "../../src/panel/pantallas/bandeja-vista.js";

const leer = (ruta) => readFileSync(new URL(ruta, import.meta.url), "utf8");
const css = leerCssPanel();
const visible = (html) => html.replaceAll("&#x2F;", "/");
const contar = (texto, re) => (texto.match(re) ?? []).length;
const AHORA = new Date("2026-11-25T12:00:00Z");
const haceH = (h) => new Date(AHORA.getTime() - h * 3600_000).toISOString();

function bloquesMedia(consulta) {
  let salida = "";
  let desde = 0;
  for (;;) {
    const i = css.indexOf(`@media ${consulta}`, desde);
    if (i < 0) break;
    const abre = css.indexOf("{", i);
    let nivel = 1;
    let j = abre + 1;
    while (nivel > 0 && j < css.length) {
      if (css[j] === "{") nivel += 1;
      else if (css[j] === "}") nivel -= 1;
      j += 1;
    }
    salida += css.slice(abre + 1, j - 1);
    desde = j;
  }
  assert.ok(salida, `falta @media ${consulta}`);
  return salida;
}
function reglaEn(texto, selector) {
  const cuerpos = [];
  for (const m of texto.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (m[1].split(",").some((x) => x.trim().split(/\n/).pop().trim() === selector)) cuerpos.push(m[2]);
  }
  assert.ok(cuerpos.length, `falta la regla ${selector}`);
  return resolverVarsCss(cuerpos.join(" "));
}
const regla = (selector) => reglaEn(css, selector);

const ANDREA = 4;
const NOMBRES = new Map([[2, "Renzo Gutiérrez Pinto"], [3, "Sofía Medina Arce"], [7, "Carmen Vargas Lozano"], [4, "Renzo Gutiérrez Pinto"], [8, "Sofía Medina Arce"]]);
const reclamo1 = { id: 1, pedidoId: 2, soporteId: ANDREA, motivo: "Producto defectuoso", estado: "EN_ATENCION", creadoEn: haceH(215), descripcion: "Dos teclas no responden.", respuesta: "Hola Renzo, ¿puedes enviar un video?" };
const reclamo2 = { id: 2, pedidoId: 3, soporteId: 5, motivo: "Producto dañado en el envío", estado: "EN_ATENCION", creadoEn: haceH(190), descripcion: "Caja golpeada.", respuesta: "Gracias por avisarnos." };
const reclamo4 = { id: 4, pedidoId: 7, soporteId: ANDREA, motivo: "Cobro incorrecto", estado: "ESCALADO", creadoEn: haceH(110), descripcion: "Doble cobro." };
const reclamo5 = { id: 5, pedidoId: 6, soporteId: null, motivo: "Retraso en la entrega", estado: "ABIERTO", creadoEn: haceH(60), descripcion: "Llegó tarde." };
const dev2 = { id: 2, pedidoId: 4, estado: "APROBADA", motivo: "Compatibilidad", importeReembolso: 175, creadoEn: haceH(100), lineas: [{ id: 5, nombreProducto: "Memoria RAM Fury Beast 16 GB DDR4 3200 MHz", cantidad: 1, reintegrarStock: false, subtotalReembolso: 175 }] };
const dev4 = { id: 4, pedidoId: 8, estado: "SOLICITADA", motivo: "Las almohadillas", importeReembolso: 348, creadoEn: haceH(30), lineas: [{ id: 7, nombreProducto: "Auriculares gamer Cloud Stinger Core", cantidad: 1, reintegrarStock: false, subtotalReembolso: 199 }] };
const contexto = (n) => ({
  pedido: { idPedido: n, clienteNombre: NOMBRES.get(n) ?? "Cliente", clienteCorreo: "carmen.vargas@correo.example", estado: "ENTREGADO", total: 198, productos: [], historial: [] },
  pago: null, reclamos: [], devoluciones: [],
});

// ---------- 3. Iniciales ----------

test("3: iniciales = primera letra de las dos primeras palabras, en mayúsculas", () => {
  assert.equal(iniciales("Andrea Flores Mendoza"), "AF");
  assert.equal(iniciales("Renzo Gutiérrez Pinto"), "RG");
  assert.equal(iniciales("Ana María López"), "AM");
  assert.equal(iniciales("  carlos   ruiz "), "CR");
  assert.equal(iniciales("ángel"), "Á");
  assert.equal(iniciales("Ñusta Quispe Ramos"), "ÑQ");
  for (const vacio of [null, undefined, "", "   ", 5]) assert.equal(iniciales(vacio), "?", String(vacio));
});

test("3: es la única función de iniciales: el chip, la actividad, las conversaciones y Cuentas la usan", () => {
  assert.doesNotMatch(leer("../../src/panel/panel-layout.js"), /export function iniciales/);
  for (const f of ["panel-layout.js", "roles-visual.js", "inicio/admin-logica.js"]) {
    assert.match(leer(`../../src/panel/${f}`), /import \{[^}]*\biniciales\b[^}]*\} from "(\.\.\/)?\.?\/?(\.\.\/)?utilidades-panel\.js"/, f);
  }
  assert.match(leer("../../src/administracion/cuentas-logica.js"), /htmlAvatarRol/);
  assert.match(renderizarBarraSuperior({ nombre: "Andrea Flores Mendoza", rol: "SOPORTE" }), /<span class="panel-avatar" aria-hidden="true">AF<\/span>/);
  const [a] = actividadReciente({ items: [{ accionEtiqueta: "Inicio de sesión", usuarioNombre: "Ana María López", usuarioCorreo: "a@x.pe", rol: "ADMIN", fecha: haceH(1) }] });
  assert.equal(a.iniciales, "AM");
});

// ---------- 1 y 2. Nombres del cliente en el Inicio ----------

test("1: la cola muestra el nombre del cliente en negrita con el motivo debajo", () => {
  const html = renderizarColaReclamos([reclamo1, reclamo5], ANDREA, AHORA, NOMBRES);
  assert.match(html, /<span class="panel-reclamos-cliente">Renzo Gutiérrez Pinto<\/span>\s*<span class="panel-reclamos-motivo">Producto defectuoso<\/span>/);
  assert.match(regla(".panel-reclamos-cliente"), /font-weight:\s*700/);
  // Sin nombre conocido, solo el motivo.
  assert.doesNotMatch(renderizarColaReclamos([reclamo5], ANDREA, AHORA, new Map()), /panel-reclamos-cliente/);
});

test("1: «En manos de otros» muestra el cliente en negrita y el motivo debajo", () => {
  const html = visible(renderizarEnManosDeOtros([reclamo2, reclamo4], ANDREA, NOMBRES));
  assert.match(html, /<p class="panel-otros-titulo">#3 · Sofía Medina Arce<\/p>\s*<p class="panel-otros-motivo">Producto dañado en el envío<\/p>/);
  assert.match(html, /<p class="panel-otros-titulo">#7 · Carmen Vargas Lozano<\/p>\s*<p class="panel-otros-motivo">Cobro incorrecto<\/p>/);
  assert.match(visible(renderizarEnManosDeOtros([reclamo2], ANDREA, new Map())), /<p class="panel-otros-titulo">#3<\/p>\s*<p class="panel-otros-motivo">Producto dañado/);
});

test("2: devoluciones por atender: «Pedido #n · cliente»", () => {
  const html = visible(renderizarDevolucionesPorAtender([dev2, dev4], AHORA, NOMBRES));
  assert.match(html, /Pedido #4 · Renzo Gutiérrez Pinto/);
  assert.match(html, /Pedido #8 · Sofía Medina Arce/);
  assert.match(visible(renderizarDevolucionesPorAtender([dev2], AHORA, new Map())), /Pedido #4<\/p>/);
});

test("1-2: el Inicio y las bandejas comparten la misma fuente de nombres (el contexto del pedido), una petición por pedido", async () => {
  const pedidas = [];
  const apiRequest = async (ruta) => { pedidas.push(ruta); return { json: async () => contexto(Number(ruta.split("/").pop())) }; };
  const contextos = crearContextosPedido(apiRequest);
  await contextos.cargar([2, 3, 2]);
  await contextos.cargar([2, 7]);
  assert.deepEqual(pedidas.sort(), ["/api/soporte/pedidos/2", "/api/soporte/pedidos/3", "/api/soporte/pedidos/7"]);
  assert.equal(contextos.nombres.get(3), "Sofía Medina Arce");
  assert.equal(contextos.contextos.get(7).pedido.idPedido, 7);
  // Un fallo no rompe la carga de los demás.
  const falla = crearContextosPedido(async (ruta) => { if (ruta.endsWith("/9")) throw new Error("x"); return { json: async () => contexto(2) }; });
  await falla.cargar([9, 2]);
  assert.equal(falla.nombres.has(9), false);
  assert.equal(falla.nombres.has(2), true);
  assert.match(leer("../../src/panel/pantallas/bandeja-controlador.js"), /crearContextosPedido/);
  assert.match(leer("../../src/panel/inicio/soporte-inicio.js"), /crearContextosPedido/);
});

// ---------- 4. Conversación ----------

test("4: autor de soporte: «{nombre} (tú)» con sus iniciales en círculo azul (#e7f0ff / #0a58ca)", () => {
  const html = visible(renderizarDetalleReclamo(reclamo1, { contexto: contexto(2), usuarioId: ANDREA, nombreUsuario: "Andrea Flores Mendoza" }));
  assert.match(html, /<li class="panel-mensaje panel-mensaje-soporte">\s*<span class="panel-avatar-agente" aria-hidden="true">AF<\/span>[\s\S]*?Andrea Flores \(tú\)/);
  const r = regla(".panel-avatar-agente");
  assert.match(r, /background:\s*#e7f0ff/i);
  assert.match(r, /color:\s*#0a58ca/i);
});

test("4: agente desconocido o de otro: «Soporte» con el icono de chat en el mismo círculo azul", () => {
  const html = visible(renderizarDetalleReclamo(reclamo2, { contexto: contexto(3), usuarioId: ANDREA, nombreUsuario: "Andrea Flores Mendoza" }));
  assert.match(html, /<li class="panel-mensaje panel-mensaje-soporte">\s*<span class="panel-avatar-agente" aria-hidden="true"><svg/);
  assert.match(html, /<p class="panel-mensaje-autor">Soporte<\/p>/);
  assert.doesNotMatch(html, /\(tú\)/);
  // Sin el nombre de la sesión, tampoco se inventa: «Soporte».
  assert.match(renderizarDetalleReclamo(reclamo1, { contexto: contexto(2), usuarioId: ANDREA }), /<p class="panel-mensaje-autor">Soporte<\/p>/);
});

// ---------- 5. Casillas ----------

test("5: casillas 2fr 1fr 1fr en escritorio; el correo solo se parte después de la @", () => {
  assert.match(reglaEn(bloquesMedia("(min-width: 992px)"), ".panel-casillas"), /grid-template-columns:\s*2fr 1fr 1fr/);
  assert.match(regla(".panel-casilla small"), /overflow-wrap:\s*normal/);
  for (const html of [
    renderizarDetalleReclamo(reclamo1, { contexto: contexto(2), usuarioId: ANDREA }),
    renderizarDetalleDevolucion(dev4, { contexto: contexto(8), ahora: AHORA }),
  ]) assert.match(html, /<small>carmen\.vargas@<wbr>correo\.example<\/small>/);
});

// ---------- 6 y 7. Devolución aprobada ----------

test("6: devolución aprobada: un solo recuadro por línea (icono, producto y «cantidad × precio» arriba; opciones debajo)", () => {
  const html = visible(renderizarDetalleDevolucion(dev2, { contexto: contexto(4), ahora: AHORA }));
  assert.doesNotMatch(html, /<ul class="panel-lineas"/, "sin el bloque duplicado");
  assert.equal(contar(html, /class="panel-linea-recepcion"/g), 1);
  assert.equal(contar(html, />Memoria RAM Fury Beast 16 GB DDR4 3200 MHz</g), 2, "el título y la línea, no una tercera vez");
  const linea = html.slice(html.indexOf('class="panel-linea-recepcion"'), html.indexOf("</fieldset>"));
  assert.match(linea, /panel-icono-cuadro[\s\S]*?Memoria RAM Fury Beast[\s\S]*?1 × S\/\s*175\.00[\s\S]*?<legend>¿Apta para la venta\?<\/legend>/);
  // Solicitada y cerrada siguen mostrando la lista de líneas.
  assert.match(renderizarDetalleDevolucion(dev4, { contexto: contexto(8), ahora: AHORA }), /<ul class="panel-lineas"/);
});

test("7: bajo el botón deshabilitado, la ayuda enlazada con aria-describedby (12-13 px, #64748b)", () => {
  const html = renderizarDetalleDevolucion(dev2, { contexto: contexto(4), ahora: AHORA });
  assert.match(html, /<button [^>]*type="submit"[^>]*aria-describedby="bandeja-ayuda-recepcion"[^>]*disabled[^>]*>Registrar recepción y reembolsar<\/button>/);
  assert.match(html, /<p id="bandeja-ayuda-recepcion" class="panel-ayuda-recepcion">Indica si cada producto es apto para la venta para continuar\.<\/p>/);
  assert.ok(html.indexOf("Registrar recepción y reembolsar") < html.indexOf("bandeja-ayuda-recepcion\" class"));
  const r = regla(".panel-ayuda-recepcion");
  assert.match(r, /font-size:\s*(12|13)px/);
  assert.match(r, /color:\s*#64748b/i);
});

test("7: el montaje quita la ayuda y el aria-describedby al completar todas las líneas", () => {
  const fuente = leer("../../src/panel/pantallas/bandeja-montaje.js");
  assert.match(fuente, /bandeja-ayuda-recepcion/);
  assert.match(fuente, /removeAttribute\("aria-describedby"\)/);
  assert.match(fuente, /ayuda\.hidden = /);
});

test("7: respuesta del reclamo: casilla a la izquierda y botones a la derecha en una fila; apilados en celular", () => {
  const html = renderizarDetalleReclamo(reclamo1, { contexto: contexto(2), usuarioId: ANDREA, nombreUsuario: "Andrea Flores Mendoza" });
  assert.match(html, /<div class="panel-acciones-fila">\s*<div class="form-check">[\s\S]*?bandeja-resuelto[\s\S]*?<\/div>\s*<div class="panel-acciones-detalle">[\s\S]*?Escalar a la administración[\s\S]*?Enviar respuesta/);
  assert.match(regla(".panel-acciones-fila"), /display:\s*flex/);
  assert.match(regla(".panel-acciones-fila"), /justify-content:\s*space-between/);
  assert.match(reglaEn(bloquesMedia("(max-width: 575.98px)"), ".panel-acciones-fila"), /flex-direction:\s*column/);
  assert.match(regla(".panel-formulario-detalle .panel-errores-formulario:empty"), /margin-top:\s*-12px/);
});
