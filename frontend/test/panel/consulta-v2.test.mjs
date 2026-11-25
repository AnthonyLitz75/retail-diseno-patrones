// Panel del personal: rediseño de «Consulta de pedido» (encabezado con búsqueda, ficha, seguimiento,
// productos, pago y atenciones). Datos como los pedidos #7 (entregado) y #10 (cancelado) del escenario demo.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  atencionesDelPedido, insigniasDelPedido, pasosSeguimiento, resumenPago,
} from "../../src/panel/pantallas/consulta-logica.js";
import {
  renderizarConsultaPedido, renderizarEstadoVacioConsulta, renderizarSeguimiento,
} from "../../src/panel/pantallas/consulta-vista.js";
import { renderizarCabeceraConsulta } from "../../src/panel/pantallas/soporte.js";
import { ICONOS } from "../../src/panel/iconos.js";
import { relacionContraste } from "../../src/panel/contraste.js";

const css = readFileSync(new URL("../../src/css/panel.css", import.meta.url), "utf8");
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
  return cuerpos.join(" ");
}
const regla = (selector) => reglaEn(css, selector);

const entregado = {
  pedido: {
    idPedido: 7, clienteNombre: "Carmen Vargas Lozano", clienteCorreo: "carmen.vargas@correo.example",
    estado: "ENTREGADO", total: 198, creadoEn: haceH(190),
    envio: { transportista: "Shalom", codigoSeguimiento: "SHA-71614093", despachadoEn: haceH(165), entregadoEn: haceH(117) },
    productos: [
      { productoId: 8, nombreProducto: "Mouse gamer DeathAdder Essential", precioUnitario: 139, cantidad: 1, subtotal: 139, idDetalle: 11 },
      { productoId: 18, nombreProducto: "Mousepad gamer XL 900x400 mm", precioUnitario: 59, cantidad: 1, subtotal: 59, idDetalle: 12 },
    ],
    historial: [
      { estado: "PENDIENTE", responsable: "Carmen Vargas Lozano", comentario: "Pedido creado y pago simulado aprobado", fecha: haceH(190) },
      { estado: "EN_PREPARACION", responsable: "Marco Huamán Torres", comentario: "Pedido preparado por almacén", fecha: haceH(185) },
      { estado: "DESPACHADO", responsable: "Marco Huamán Torres", comentario: "Pedido despachado por almacén", fecha: haceH(165) },
      { estado: "ENTREGADO", responsable: "Marco Huamán Torres", comentario: "Entrega del pedido registrada por almacén", fecha: haceH(117) },
    ],
  },
  pago: { estado: "APROBADO", monto: 198, montoReembolsado: 0, creadoEn: haceH(190) },
  reclamos: [{ id: 4, pedidoId: 7, estado: "ESCALADO", motivo: "Cobro incorrecto", creadoEn: haceH(110) }],
  devoluciones: [],
};
const cancelado = {
  pedido: {
    idPedido: 10, clienteNombre: "Carmen Vargas Lozano", clienteCorreo: "carmen.vargas@correo.example",
    estado: "CANCELADO", total: 218, creadoEn: haceH(130), envio: null,
    productos: [{ productoId: 1, nombreProducto: "Teclado mecánico 60% RGB Fizz K617", precioUnitario: 169, cantidad: 1, subtotal: 169, idDetalle: 20 },
      { productoId: 6, nombreProducto: "Mouse inalámbrico M170", precioUnitario: 49, cantidad: 1, subtotal: 49, idDetalle: 21 }],
    historial: [
      { estado: "PENDIENTE", responsable: "Carmen Vargas Lozano", comentario: "Pedido creado y pago simulado aprobado", fecha: haceH(130) },
      { estado: "CANCELADO", responsable: "Carmen Vargas Lozano", comentario: "Pedido cancelado; stock y pago simulado reversados", fecha: haceH(128) },
    ],
  },
  pago: { estado: "REVERSADO", monto: 218, montoReembolsado: 0, creadoEn: haceH(130) },
  reclamos: [],
  devoluciones: [],
};

// ---------- 8. Encabezado y estado vacío ----------

test("8: el formulario va en el encabezado, a la derecha, con «Número de pedido» y «Buscar»", () => {
  const html = renderizarCabeceraConsulta();
  assert.match(html, /<header class="panel-encabezado panel-encabezado-acciones">[\s\S]*<h1 class="panel-titulo">Consulta de pedido<\/h1>[\s\S]*<form id="consulta-form-busqueda"/);
  assert.ok(html.indexOf("<h1") < html.indexOf("<form"));
  assert.match(html, /<label [^>]*for="consulta-buscar-pedido"[^>]*>Número de pedido<\/label>/);
  assert.match(html, /<button [^>]*type="submit"[^>]*>Buscar<\/button>/);
  assert.match(html, /id="consulta-error-busqueda"[^>]*role="alert"/);
});

test("8: sin pedido, estado vacío con el texto pedido", () => {
  assert.match(renderizarEstadoVacioConsulta(), /Escribe un número de pedido para ver su detalle\./);
});

// ---------- 9. Ficha ----------

test("9: ficha: «Pedido #n · hace …», nombre como título, correo e insignias de estado y atenciones abiertas", () => {
  const html = visible(renderizarConsultaPedido(entregado, AHORA));
  assert.match(html, /Pedido #7 · hace 7 días/);
  assert.match(html, /<h2 class="panel-ficha-cliente">Carmen Vargas Lozano<\/h2>\s*<p class="panel-ficha-correo">carmen\.vargas@correo\.example<\/p>/);
  assert.match(html, /panel-insignia-verde[^>]*>Entregado/);
  assert.match(html, /panel-insignia-rojo[^>]*>Reclamo #4 escalado/);
});

test("9: insignias: estado del pedido y reclamos o devoluciones abiertos (no los resueltos, cerrados ni rechazados)", () => {
  const todo = {
    ...entregado,
    reclamos: [{ id: 1, estado: "ABIERTO" }, { id: 2, estado: "EN_ATENCION" }, { id: 3, estado: "RESUELTO" }],
    devoluciones: [{ id: 5, estado: "SOLICITADA" }, { id: 6, estado: "APROBADA" }, { id: 7, estado: "CERRADA" }, { id: 8, estado: "RECHAZADA" }],
  };
  assert.deepEqual(insigniasDelPedido(todo).map((i) => i.texto), [
    "Entregado", "Reclamo #1 abierto", "Reclamo #2 en atención", "Devolución #5 solicitada", "Devolución #6 aprobada",
  ]);
  assert.deepEqual(insigniasDelPedido(cancelado).map((i) => [i.texto, i.variante]), [["Cancelado", "neutro"]]);
});

// ---------- 10. Seguimiento ----------

test("10: seguimiento de un pedido entregado: 4 pasos hechos con fecha y detalle", () => {
  const pasos = pasosSeguimiento(entregado.pedido, entregado.pago);
  assert.deepEqual(pasos.map((p) => [p.etiqueta, p.estado]), [
    ["Pagado", "hecho"], ["En preparación", "hecho"], ["Despachado", "hecho"], ["Entregado", "hecho"],
  ]);
  assert.equal(pasos[2].detalle, "Shalom · SHA-71614093");
  assert.equal(pasos[1].detalle, "Marco Huamán Torres");
  assert.ok(pasos.every((p) => p.fecha));
});

test("10: un pedido en preparación deja pendientes Despachado y Entregado, sin fecha", () => {
  const pedido = { ...entregado.pedido, estado: "EN_PREPARACION", envio: null, historial: entregado.pedido.historial.slice(0, 2) };
  const pasos = pasosSeguimiento(pedido, entregado.pago);
  assert.deepEqual(pasos.map((p) => p.estado), ["hecho", "hecho", "pendiente", "pendiente"]);
  assert.equal(pasos[2].fecha, null);
});

test("10: pedido cancelado: Pagado → Cancelado (segundo paso en gris) con el motivo", () => {
  const pasos = pasosSeguimiento(cancelado.pedido, cancelado.pago);
  assert.deepEqual(pasos.map((p) => [p.etiqueta, p.estado]), [["Pagado", "hecho"], ["Cancelado", "cancelado"]]);
  assert.equal(pasos[1].detalle, "Pedido cancelado; stock y pago simulado reversados");
});

test("10: lista ordenada con aria-label, círculo con icono, fecha y detalle", () => {
  const html = visible(renderizarSeguimiento(pasosSeguimiento(entregado.pedido, entregado.pago)));
  assert.match(html, /<ol class="panel-seguimiento" aria-label="Seguimiento del pedido">/);
  assert.equal(contar(html, /<li class="panel-paso panel-paso-hecho">/g), 4);
  assert.equal(contar(html, /<span class="panel-paso-circulo" aria-hidden="true"><svg/g), 4);
  assert.match(html, /Despachado[\s\S]*?Shalom · SHA-71614093/);
  assert.match(html, /<time [^>]*datetime="[^"]+"[^>]*>\d{2}\/\d{2}\/\d{2}, /);
  const canc = renderizarSeguimiento(pasosSeguimiento(cancelado.pedido, cancelado.pago));
  assert.equal(contar(canc, /<li class="panel-paso /g), 2);
  assert.match(canc, /panel-paso-cancelado/);
  const pend = renderizarSeguimiento(pasosSeguimiento({ ...entregado.pedido, estado: "PENDIENTE", envio: null, historial: entregado.pedido.historial.slice(0, 1) }, entregado.pago));
  assert.match(pend, /panel-paso-pendiente/);
  for (const n of ["pagado", "preparacion", "despacho", "entrega", "cancelar"]) assert.ok(ICONOS[n], `icono ${n}`);
});

test("10: colores: pasos hechos #0a58ca, pendientes #cbd5e1, círculo de 40 px y línea que los une", () => {
  assert.match(regla(".panel-paso-hecho .panel-paso-circulo"), /background:\s*#0a58ca/i);
  assert.match(regla(".panel-paso-pendiente .panel-paso-circulo"), /background:\s*#cbd5e1/i);
  assert.match(regla(".panel-paso-circulo"), /width:\s*40px/);
  assert.match(regla(".panel-paso-circulo"), /height:\s*40px/);
  assert.match(regla(".panel-paso-cancelado .panel-paso-circulo"), /background:/);
  assert.match(regla(".panel-paso::before"), /height:\s*2px/);
  assert.ok(relacionContraste("#ffffff", "#0a58ca") >= 4.5);
});

test("10: en celular la línea de tiempo es vertical", () => {
  const m = bloquesMedia("(max-width: 575.98px)");
  assert.match(reglaEn(m, ".panel-seguimiento"), /flex-direction:\s*column|display:\s*grid/);
  assert.match(reglaEn(m, ".panel-paso::before"), /width:\s*2px/);
});

// ---------- 11. Productos, pago y atenciones ----------

test("11: productos: producto como <th scope=row>, cantidad, precio, subtotal y fila de Total", () => {
  const html = visible(renderizarConsultaPedido(entregado, AHORA));
  for (const col of ["Producto", "Cantidad", "Precio", "Subtotal"]) assert.match(html, new RegExp(`<th scope="col"[^>]*>${col}</th>`), col);
  assert.match(html, /<th scope="row">Mouse gamer DeathAdder Essential<\/th>\s*<td[^>]*>1<\/td>\s*<td[^>]*>S\/\s*139\.00<\/td>\s*<td[^>]*>S\/\s*139\.00<\/td>/);
  assert.match(html, /<tfoot>[\s\S]*?<th scope="row"[^>]*>Total<\/th>[\s\S]*?S\/\s*198\.00/);
});

test("11: pago: un cobro aprobado con importe y la nota de que no hay cobros duplicados", () => {
  const r = resumenPago(entregado.pago);
  assert.deepEqual([r.aprobados, r.nota], [1, true]);
  const html = visible(renderizarConsultaPedido(entregado, AHORA));
  assert.match(html, /<h2[^>]*>Pago<\/h2>[\s\S]*?1 cobro aprobado[\s\S]*?S\/\s*198\.00[\s\S]*?No hay cobros duplicados registrados en el sistema\./);
});

test("11: pago reversado, reembolsado y sin pago", () => {
  assert.deepEqual([resumenPago(cancelado.pago).aprobados, resumenPago(cancelado.pago).nota], [0, false]);
  assert.match(visible(renderizarConsultaPedido(cancelado, AHORA)), /Cobro reversado/);
  assert.doesNotMatch(renderizarConsultaPedido(cancelado, AHORA), /No hay cobros duplicados/);
  assert.match(visible(renderizarConsultaPedido({ ...entregado, pago: { ...entregado.pago, montoReembolsado: 49 } }, AHORA)), /Reembolsado S\/\s*49\.00/);
  assert.match(renderizarConsultaPedido({ ...entregado, pago: null }, AHORA), /Sin cobro registrado/);
});

test("11: atenciones del pedido con insignia y enlace a #/reclamos?id= o #/devoluciones?id=", () => {
  const ctx = { ...entregado, devoluciones: [{ id: 2, estado: "APROBADA", motivo: "Compatibilidad" }] };
  assert.deepEqual(atencionesDelPedido(ctx).map((a) => [a.tipo, a.id, a.ruta]), [
    ["Reclamo", 4, "#/reclamos?id=4"], ["Devolución", 2, "#/devoluciones?id=2"],
  ]);
  const html = visible(renderizarConsultaPedido(ctx, AHORA));
  assert.match(html, /<h2[^>]*>Atenciones del pedido<\/h2>[\s\S]*?Reclamo #4[\s\S]*?Cobro incorrecto[\s\S]*?panel-insignia-rojo[^>]*>Escalado[\s\S]*?href="#\/reclamos\?id=4"/);
  assert.match(html, /Devolución #2[\s\S]*?panel-insignia-verde[^>]*>Aprobada[\s\S]*?href="#\/devoluciones\?id=2"/);
  assert.match(visible(renderizarConsultaPedido(cancelado, AHORA)), /Este pedido no tiene reclamos ni devoluciones\./);
});

test("11: dos columnas desde 992 px y texto escapado", () => {
  assert.match(bloquesMedia("(min-width: 992px)"), /\.panel-consulta-columnas\s*\{[^}]*grid-template-columns/);
  const html = renderizarConsultaPedido({ ...entregado, pedido: { ...entregado.pedido, clienteNombre: "<b>x</b>" } }, AHORA);
  assert.doesNotMatch(html, /<b>x<\/b>/);
});

// ---------- 12. «Ver pedido» sigue llevando aquí ----------

test("12: «Ver pedido #n» sigue navegando a #/consulta-pedido?pedido=n (ver-pedido.test.mjs)", async () => {
  const { alVerPedidoDelPanel } = await import("../../src/panel/pantallas/soporte.js");
  const navegadas = [];
  alVerPedidoDelPanel((r) => navegadas.push(r))(7);
  assert.deepEqual(navegadas, ["#/consulta-pedido?pedido=7"]);
});

test("11: en celular la tabla de productos cabe sin desplazamiento (sin ancho mínimo y con menos relleno)", () => {
  const m = bloquesMedia("(max-width: 575.98px)");
  assert.match(reglaEn(m, ".panel-pagina .panel-tabla-productos"), /min-width:\s*0/);
  assert.match(reglaEn(m, ".panel-pagina .panel-tabla-productos td"), /padding/);
});

test("las tarjetas de la consulta van separadas por 24 px", () => {
  assert.match(regla(".panel-consulta-pedido"), /display:\s*grid/);
  assert.match(regla(".panel-consulta-pedido"), /gap:\s*24px/);
});
