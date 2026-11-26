// Panel del personal: bandejas de Reclamos y Devoluciones de dos paneles (pestañas, buscador, lista y
// detalle; el elegido va en la URL). Datos como los del escenario demo, vistos por Andrea (usuario 4).
import test from "node:test";
import assert from "node:assert/strict";
import { leerCssPanel, resolverVarsCss } from "./util-css.mjs";
import {
  PESTANAS_DEVOLUCIONES, PESTANAS_RECLAMOS, elegirSeleccion, filtrarElementos, idDeParametros, lineasRecepcion,
  ordenarPestana, pasosDevolucion, recepcionCompleta, responsableReclamo, rutaDeElemento,
} from "../../src/panel/pantallas/bandeja-logica.js";
import { crearBandeja } from "../../src/panel/pantallas/bandeja-controlador.js";
import {
  renderizarBandeja, renderizarDetalleDevolucion, renderizarDetalleReclamo, renderizarLista, renderizarPestanas,
} from "../../src/panel/pantallas/bandeja-vista.js";

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
const R = {
  1: { id: 1, pedidoId: 2, clienteId: 7, soporteId: ANDREA, motivo: "Producto defectuoso", estado: "EN_ATENCION", creadoEn: haceH(215),
    descripcion: "El teclado llegó con dos teclas que no responden.", respuesta: "Hola Renzo, ¿puedes enviarnos un video corto?" },
  2: { id: 2, pedidoId: 3, clienteId: 8, soporteId: 5, motivo: "Producto dañado en el envío", estado: "EN_ATENCION", creadoEn: haceH(190),
    descripcion: "La caja del parlante llegó golpeada.", respuesta: "Gracias por avisarnos." },
  3: { id: 3, pedidoId: 5, clienteId: 11, soporteId: 5, motivo: "Producto incompatible", estado: "RESUELTO", creadoEn: haceH(150),
    descripcion: "La webcam no funciona con mi laptop.", respuesta: "Se activa con el controlador." },
  4: { id: 4, pedidoId: 7, clienteId: 1, soporteId: ANDREA, motivo: "Cobro incorrecto", estado: "ESCALADO", creadoEn: haceH(110),
    descripcion: "Me cobraron dos veces el mismo pedido.", respuesta: "Revisamos el pedido.", motivoEscalamiento: "Requiere confirmar con el proveedor de pago." },
  5: { id: 5, pedidoId: 6, clienteId: 10, soporteId: null, motivo: "Retraso en la entrega", estado: "ABIERTO", creadoEn: haceH(60),
    descripcion: "El pedido llegó tres días después de la fecha indicada." },
  6: { id: 6, pedidoId: 9, clienteId: 9, soporteId: null, motivo: "Producto incompleto", estado: "ABIERTO", creadoEn: haceH(6),
    descripcion: "Falta el cable USB-C." },
};
const D = {
  1: { id: 1, pedidoId: 1, estado: "CERRADA", motivo: "No era el modelo que buscaba", soporteId: ANDREA, importeReembolso: 49, creadoEn: haceH(200), fechaCierre: haceH(160),
    observacion: "Recibimos el mouse sin uso.", lineas: [{ id: 1, nombreProducto: "Mouse inalámbrico M170", cantidad: 1, reintegrarStock: true, subtotalReembolso: 49 }] },
  2: { id: 2, pedidoId: 4, estado: "APROBADA", motivo: "Compatibilidad: mi placa usa DDR5", soporteId: ANDREA, importeReembolso: 175, creadoEn: haceH(100),
    observacion: "Envíanos el módulo en su empaque.", lineas: [{ id: 5, nombreProducto: "Memoria RAM Fury Beast 16 GB DDR4 3200 MHz", cantidad: 1, reintegrarStock: false, subtotalReembolso: 175 }] },
  3: { id: 3, pedidoId: 6, estado: "RECHAZADA", motivo: "Ya no lo necesito", soporteId: 5, importeReembolso: 59, creadoEn: haceH(90),
    observacion: "El producto presenta señales de uso.", lineas: [{ id: 6, nombreProducto: "Cargador de pared 20 W USB-C", cantidad: 1, reintegrarStock: false, subtotalReembolso: 59 }] },
  4: { id: 4, pedidoId: 8, estado: "SOLICITADA", motivo: "Las almohadillas me incomodan", soporteId: null, importeReembolso: 348, creadoEn: haceH(30),
    lineas: [{ id: 7, nombreProducto: "Auriculares gamer Cloud Stinger Core", cantidad: 1, reintegrarStock: false, subtotalReembolso: 199 },
      { id: 8, nombreProducto: "Teclado inalámbrico K380", cantidad: 1, reintegrarStock: false, subtotalReembolso: 149 }] },
};
const NOMBRES = new Map([[2, "Renzo Gutiérrez Pinto"], [3, "Sofía Medina Arce"], [7, "Carmen Vargas Lozano"], [6, "Valeria Rojas Nieto"], [8, "Sofía Medina Arce"], [4, "Renzo Gutiérrez Pinto"]]);
const CONTEXTO = (n) => ({
  pedido: { idPedido: n, clienteNombre: NOMBRES.get(n) ?? "Cliente", clienteCorreo: "cliente@correo.example", estado: "ENTREGADO", total: 198, creadoEn: haceH(200), productos: [], historial: [] },
  pago: null, reclamos: [], devoluciones: [],
});
const porEstadoReclamos = () => ({
  ABIERTO: [R[6], R[5]], EN_ATENCION: [R[2], R[1]], ESCALADO: [R[4]], RESUELTO: [R[3]],
});

// ---------- Lógica ----------

test("2: pestañas de reclamos y de devoluciones, en su orden", () => {
  assert.deepEqual(PESTANAS_RECLAMOS.map((p) => [p.id, p.etiqueta]), [["ABIERTO", "Abiertos"], ["EN_ATENCION", "En atención"], ["ESCALADO", "Escalados"], ["RESUELTO", "Resueltos"]]);
  assert.deepEqual(PESTANAS_DEVOLUCIONES.map((p) => [p.id, p.etiqueta]), [["SOLICITADA", "Por evaluar"], ["APROBADA", "Por recibir"], ["CERRADA", "Cerradas"], ["RECHAZADA", "Rechazadas"]]);
});

test("1: el id del hash: entero positivo o nada; la ruta del elemento lleva ?id=", () => {
  assert.equal(idDeParametros({ id: "5" }), 5);
  for (const p of [{ id: "0" }, { id: "x" }, { id: "" }, {}, null]) assert.equal(idDeParametros(p), null);
  assert.equal(rutaDeElemento("reclamos", 5), "#/reclamos?id=5");
  assert.equal(rutaDeElemento("devoluciones", 2), "#/devoluciones?id=2");
});

test("4: orden de cada pestaña: lo pendiente, del más antiguo; lo cerrado, del más reciente", () => {
  assert.deepEqual(ordenarPestana("ABIERTO", [R[6], R[5]]).map((r) => r.id), [5, 6]);
  assert.deepEqual(ordenarPestana("RESUELTO", [{ id: 1, creadoEn: haceH(10) }, { id: 2, creadoEn: haceH(5) }]).map((r) => r.id), [2, 1]);
  assert.deepEqual(ordenarPestana("SOLICITADA", [D[4], D[2]]).map((d) => d.id), [2, 4]);
});

test("1: selección: con id, su pestaña y su elemento; sin id, la primera pestaña con elementos", () => {
  const por = Object.fromEntries(Object.entries(porEstadoReclamos()).map(([e, l]) => [e, ordenarPestana(e, l)]));
  assert.deepEqual([elegirSeleccion(por, PESTANAS_RECLAMOS, 4).pestana, elegirSeleccion(por, PESTANAS_RECLAMOS, 4).elemento.id], ["ESCALADO", 4]);
  assert.deepEqual([elegirSeleccion(por, PESTANAS_RECLAMOS, null).pestana, elegirSeleccion(por, PESTANAS_RECLAMOS, null).elemento.id], ["ABIERTO", 5]);
  const sinAbiertos = { ...por, ABIERTO: [] };
  assert.equal(elegirSeleccion(sinAbiertos, PESTANAS_RECLAMOS, null).pestana, "EN_ATENCION");
  // Sin id, se queda en la pestaña activa y elige su primer elemento.
  assert.equal(elegirSeleccion(por, PESTANAS_RECLAMOS, null, "RESUELTO").elemento.id, 3);
  // Un id que no existe cae en la primera pestaña con elementos.
  assert.equal(elegirSeleccion(por, PESTANAS_RECLAMOS, 99).pestana, "ABIERTO");
  assert.equal(elegirSeleccion({}, PESTANAS_RECLAMOS, null).elemento, null);
});

test("3: buscador por pedido, cliente y motivo, sin distinguir mayúsculas ni tildes", () => {
  const lista = [R[1], R[2], R[4], R[5]];
  assert.deepEqual(filtrarElementos(lista, "", NOMBRES).map((r) => r.id), [1, 2, 4, 5]);
  assert.deepEqual(filtrarElementos(lista, "3", NOMBRES).map((r) => r.id), [2], "por número de pedido");
  assert.deepEqual(filtrarElementos(lista, "#7", NOMBRES).map((r) => r.id), [4]);
  assert.deepEqual(filtrarElementos(lista, "SOFIA", NOMBRES).map((r) => r.id), [2], "cliente sin tildes ni mayúsculas");
  assert.deepEqual(filtrarElementos(lista, "dañado", NOMBRES).map((r) => r.id), [2]);
  assert.deepEqual(filtrarElementos(lista, "danado en el envio", NOMBRES).map((r) => r.id), [2], "motivo sin tildes");
  assert.deepEqual(filtrarElementos(lista, "retraso", NOMBRES).map((r) => r.id), [5]);
  assert.deepEqual(filtrarElementos(lista, "zzz", NOMBRES), []);
  assert.deepEqual(filtrarElementos([D[2], D[4]], "ddr4", NOMBRES).map((d) => d.id), [2], "producto de la devolución");
});

test("4: quién lo atiende: «Tú lo atiendes», «Lo atiende otro agente», «Sin asignar», «Decide la administración»", () => {
  assert.equal(responsableReclamo(R[1], ANDREA).fila, "Tú lo atiendes");
  assert.equal(responsableReclamo(R[2], ANDREA).fila, "Lo atiende otro agente");
  assert.equal(responsableReclamo(R[5], ANDREA).fila, "Sin asignar");
  assert.equal(responsableReclamo(R[4], ANDREA).fila, "Decide la administración");
  assert.equal(responsableReclamo(R[3], ANDREA).fila, "Resuelto por otro agente");
  assert.equal(responsableReclamo({ ...R[3], soporteId: ANDREA }, ANDREA).fila, "Resuelto por ti");
  assert.deepEqual(["Tú", "Otro agente", "Sin asignar", "Administración"],
    [R[1], R[2], R[5], R[4]].map((r) => responsableReclamo(r, ANDREA).casilla));
});

test("6: la recepción exige respuesta en todas las líneas y manda la reposición elegida", () => {
  const lineas = D[4].lineas;
  assert.equal(recepcionCompleta(lineas, {}), false);
  assert.equal(recepcionCompleta(lineas, { 7: "si" }), false);
  assert.equal(recepcionCompleta(lineas, { 7: "si", 8: "no" }), true);
  assert.equal(recepcionCompleta([], {}), false, "sin líneas no hay recepción");
  assert.deepEqual(lineasRecepcion(lineas, { 7: "si", 8: "no" }), [
    { detalleDevolucionId: 7, reintegrarStock: true }, { detalleDevolucionId: 8, reintegrarStock: false },
  ]);
  assert.throws(() => lineasRecepcion(lineas, { 7: "si" }), /todas las líneas/);
});

test("6: progreso de 3 pasos; en una rechazada, solo el primero en gris", () => {
  const estados = (e) => pasosDevolucion(e).map((p) => p.estado);
  assert.deepEqual(pasosDevolucion("SOLICITADA").map((p) => p.etiqueta), ["Solicitada", "Aprobada", "Recibida y reembolsada"]);
  assert.deepEqual(estados("SOLICITADA"), ["hecho", "pendiente", "pendiente"]);
  assert.deepEqual(estados("APROBADA"), ["hecho", "hecho", "pendiente"]);
  assert.deepEqual(estados("CERRADA"), ["hecho", "hecho", "hecho"]);
  assert.deepEqual(estados("RECHAZADA"), ["rechazado", "pendiente", "pendiente"]);
});

// ---------- Controlador ----------

function fakeApi({ reclamos = porEstadoReclamos(), fallar = null } = {}) {
  const pedidas = [];
  const apiRequest = async (ruta) => {
    pedidas.push(ruta);
    if (fallar && ruta.includes(fallar)) throw new Error("sin red");
    const estado = new URL(ruta, "http://x").searchParams.get("estado");
    if (ruta.startsWith("/api/soporte/reclamos")) return { json: async () => reclamos[estado] ?? [] };
    if (ruta.startsWith("/api/soporte/devoluciones")) {
      return { json: async () => Object.values(D).filter((d) => d.estado === estado) };
    }
    const n = Number(ruta.split("/").pop());
    return { json: async () => CONTEXTO(n) };
  };
  return { apiRequest, pedidas };
}

test("2: al mostrarse carga cada estado con ?estado= y cuenta todas las pestañas", async () => {
  const { apiRequest, pedidas } = fakeApi();
  const b = crearBandeja({ tipo: "reclamos", apiRequest, usuarioId: ANDREA, navegar() {} });
  await b.cargar();
  assert.deepEqual(pedidas.filter((r) => r.startsWith("/api/soporte/reclamos")).sort(), [
    "/api/soporte/reclamos?estado=ABIERTO", "/api/soporte/reclamos?estado=EN_ATENCION",
    "/api/soporte/reclamos?estado=ESCALADO", "/api/soporte/reclamos?estado=RESUELTO",
  ]);
  b.mostrar({});
  assert.deepEqual(b.vista().pestanas.map((p) => [p.id, p.total]), [["ABIERTO", 2], ["EN_ATENCION", 2], ["ESCALADO", 1], ["RESUELTO", 1]]);
  const d = crearBandeja({ tipo: "devoluciones", apiRequest, usuarioId: ANDREA, navegar() {} });
  await d.cargar();
  assert.equal(pedidas.filter((r) => r.startsWith("/api/soporte/devoluciones?estado=")).length, 4);
  d.mostrar({});
  assert.deepEqual(d.vista().pestanas.map((p) => [p.id, p.total]), [["SOLICITADA", 1], ["APROBADA", 1], ["CERRADA", 1], ["RECHAZADA", 1]]);
});

test("1: la pestaña inicial es la del id; sin id, la primera con elementos; sin id no hay detalle móvil", async () => {
  const { apiRequest } = fakeApi();
  const b = crearBandeja({ tipo: "reclamos", apiRequest, usuarioId: ANDREA, navegar() {} });
  await b.cargar();
  b.mostrar({ id: "4" });
  assert.deepEqual([b.vista().activa, b.vista().elegido.id, b.vista().conDetalle], ["ESCALADO", 4, true]);
  b.mostrar({});
  assert.deepEqual([b.vista().activa, b.vista().elegido.id, b.vista().conDetalle], ["ESCALADO", 4, false], "sin id conserva la pestaña activa");
  const nueva = crearBandeja({ tipo: "reclamos", apiRequest, usuarioId: ANDREA, navegar() {} });
  await nueva.cargar();
  nueva.mostrar({});
  assert.deepEqual([nueva.vista().activa, nueva.vista().elegido.id, nueva.vista().conDetalle], ["ABIERTO", 5, false]);
});

test("1: elegir un elemento cambia el hash (con historial); «Volver a la lista» lo quita", async () => {
  const { apiRequest } = fakeApi();
  const rutas = [];
  const b = crearBandeja({ tipo: "reclamos", apiRequest, usuarioId: ANDREA, navegar: (r) => rutas.push(r) });
  await b.cargar();
  b.mostrar({});
  b.elegir(1);
  b.volverALaLista();
  assert.deepEqual(rutas, ["#/reclamos?id=1", "#/reclamos"]);
  const d = crearBandeja({ tipo: "devoluciones", apiRequest, usuarioId: ANDREA, navegar: (r) => rutas.push(r) });
  await d.cargar();
  d.mostrar({});
  d.elegir(2);
  assert.equal(rutas.at(-1), "#/devoluciones?id=2");
});

test("2: cambiar de pestaña elige el primero de esa pestaña y lo pone en la URL", async () => {
  const { apiRequest } = fakeApi();
  const rutas = [];
  const b = crearBandeja({ tipo: "reclamos", apiRequest, usuarioId: ANDREA, navegar: (r) => rutas.push(r) });
  await b.cargar();
  b.mostrar({});
  b.cambiarPestana("EN_ATENCION");
  assert.deepEqual(rutas, ["#/reclamos?id=1"], "el más antiguo de En atención es el #1");
  b.mostrar({ id: "1" });
  assert.equal(b.vista().activa, "EN_ATENCION");
});

test("3: el buscador filtra la lista de la pestaña activa y no cambia los contadores", async () => {
  const { apiRequest } = fakeApi();
  const b = crearBandeja({ tipo: "reclamos", apiRequest, usuarioId: ANDREA, navegar() {} });
  await b.cargar();
  b.mostrar({});
  await b.cargarContextos();
  b.buscar("retraso");
  assert.deepEqual(b.vista().elementos.map((r) => r.id), [5]);
  assert.equal(b.vista().pestanas[0].total, 2);
  b.buscar("valeria");
  assert.deepEqual(b.vista().elementos.map((r) => r.id), [5], "por nombre del cliente, que sale del contexto del pedido");
  assert.equal(b.nombres.get(6), "Valeria Rojas Nieto");
});

test("2: si una estado falla, su pestaña lo dice y las demás se muestran", async () => {
  const { apiRequest } = fakeApi({ fallar: "estado=ESCALADO" });
  const b = crearBandeja({ tipo: "reclamos", apiRequest, usuarioId: ANDREA, navegar() {} });
  await b.cargar();
  b.mostrar({});
  assert.deepEqual(b.vista().errores, ["ESCALADO"]);
  assert.equal(b.vista().pestanas.find((p) => p.id === "ESCALADO").total, null);
  assert.equal(b.vista().pestanas.find((p) => p.id === "ABIERTO").total, 2);
});

// ---------- Marcado ----------

test("2: pestañas: tablist, tab con aria-selected y contador; la activa en blanco con sombra", () => {
  const html = renderizarPestanas("reclamos", [
    { id: "ABIERTO", etiqueta: "Abiertos", total: 2, activa: true }, { id: "EN_ATENCION", etiqueta: "En atención", total: 2, activa: false },
    { id: "ESCALADO", etiqueta: "Escalados", total: 1, activa: false }, { id: "RESUELTO", etiqueta: "Resueltos", total: null, activa: false },
  ]);
  assert.match(html, /<div class="panel-pestanas" role="tablist" aria-label="Reclamos por estado">/);
  assert.equal(contar(html, /role="tab"/g), 4);
  assert.match(html, /<button [^>]*role="tab"[^>]*aria-selected="true"[^>]*data-pestana="ABIERTO"[^>]*>Abiertos <span class="panel-pestana-total">2<\/span>/);
  assert.match(html, /aria-selected="false"[^>]*data-pestana="RESUELTO"[^>]*>Resueltos <span class="panel-pestana-total">—<\/span>/);
  assert.match(regla(".panel-pestanas"), /background:\s*#e9edf3/i);
  assert.match(regla('.panel-pestana[aria-selected="true"]'), /background:\s*#ffffff/i);
  assert.match(regla('.panel-pestana[aria-selected="true"]'), /box-shadow:/);
});

test("4: fila: botón con aria-current, «Pedido #n · cliente», espera, motivo y quién lo atiende", () => {
  const html = visible(renderizarLista("reclamos", [R[1], R[5]], { nombres: NOMBRES, usuarioId: ANDREA, ahora: AHORA, elegidoId: 1 }));
  assert.equal(contar(html, /<button type="button" class="panel-bandeja-fila"/g), 2);
  assert.match(html, /<button [^>]*class="panel-bandeja-fila"[^>]*data-id="1"[^>]*aria-current="true"/);
  assert.equal(contar(html, /aria-current/g), 1);
  assert.match(html, /Pedido #2 · Renzo Gutiérrez Pinto[\s\S]*?panel-espera panel-espera-rojo[\s\S]*?hace 8 días/);
  assert.match(html, /Producto defectuoso[\s\S]*?Tú lo atiendes/);
  assert.match(html, /Pedido #6 · Valeria Rojas Nieto[\s\S]*?Retraso en la entrega[\s\S]*?Sin asignar/);
  const sinNombre = renderizarLista("reclamos", [R[5]], { nombres: new Map(), usuarioId: ANDREA, ahora: AHORA });
  assert.match(sinNombre, /Pedido #6<\/span>/);
  assert.doesNotMatch(sinNombre, / · /);
});

test("4: lista vacía y fila de devolución con el producto", () => {
  assert.match(renderizarLista("reclamos", [], { nombres: NOMBRES, usuarioId: ANDREA, ahora: AHORA }), /No hay reclamos en este estado\./);
  assert.match(renderizarLista("devoluciones", [], { nombres: NOMBRES, usuarioId: ANDREA, ahora: AHORA }), /No hay devoluciones en este estado\./);
  const html = renderizarLista("devoluciones", [D[2], D[4]], { nombres: NOMBRES, usuarioId: ANDREA, ahora: AHORA });
  assert.match(html, /Memoria RAM Fury Beast 16 GB DDR4 3200 MHz/);
  assert.match(html, /2 productos/);
  assert.doesNotMatch(html, /Tú lo atiendes|Sin asignar/);
});

test("4: estilo de la fila elegida: fondo #f5f9ff y barra azul interior de 3 px", () => {
  const r = regla('.panel-bandeja-fila[aria-current="true"]');
  assert.match(r, /background:\s*#f5f9ff/i);
  assert.match(r, /box-shadow:\s*inset 3px 0 0 #0a58ca/i);
});

const ctxDe = (n, extra = {}) => ({ ...CONTEXTO(n), ...extra });

test("5: reclamo ABIERTO: aviso naranja y «Atender este reclamo»; sin formulario", () => {
  const html = visible(renderizarDetalleReclamo(R[5], { contexto: ctxDe(6), usuarioId: ANDREA, ahora: AHORA }));
  assert.match(html, /<h2 [^>]*tabindex="-1"[^>]*>Retraso en la entrega<\/h2>/);
  assert.match(html, /Reclamo #5 · Pedido #6/);
  assert.match(html, /panel-insignia-ambar[^>]*>Abierto/);
  assert.match(html, /Nadie lo está atendiendo todavía\./);
  assert.match(html, /<button [^>]*data-tomar-reclamo="5"[^>]*>Atender este reclamo<\/button>/);
  assert.doesNotMatch(html, /<textarea/);
  assert.match(regla(".panel-aviso-naranja"), /background:\s*#fff7ed/i);
});

test("5: tres casillas: Cliente, Pedido (estado y total) y Responsable", () => {
  const html = visible(renderizarDetalleReclamo(R[1], { contexto: ctxDe(2), usuarioId: ANDREA, ahora: AHORA }));
  assert.match(html, /<dt>Cliente<\/dt>\s*<dd>Renzo Gutiérrez Pinto/);
  assert.match(html, /<dt>Pedido<\/dt>\s*<dd>[\s\S]*?Entregado[\s\S]*?S\/\s*198\.00/);
  assert.match(html, /<dt>Responsable<\/dt>\s*<dd>Tú/);
  const sin = renderizarDetalleReclamo(R[1], { contexto: null, usuarioId: ANDREA, ahora: AHORA });
  assert.match(sin, /<dt>Cliente<\/dt>\s*<dd>—/);
});

test("5: conversación en orden: cliente, respuesta del agente y nota de escalado; sin fecha inventada", () => {
  const html = visible(renderizarDetalleReclamo(R[4], { contexto: ctxDe(7), usuarioId: ANDREA, ahora: AHORA }));
  assert.match(html, /<ol class="panel-conversacion" aria-label="Conversación del reclamo">/);
  assert.equal(contar(html, /<li class="panel-mensaje/g), 3);
  const orden = ["Me cobraron dos veces el mismo pedido.", "Revisamos el pedido.", "Requiere confirmar con el proveedor de pago."].map((t) => html.indexOf(t));
  assert.deepEqual([...orden].sort((a, b) => a - b), orden, "orden: cliente, respuesta, escalado");
  assert.match(html, /<li class="panel-mensaje panel-mensaje-cliente">[\s\S]*?<span class="panel-avatar-rol[^"]*" aria-hidden="true">[A-ZÁÉÍÓÚ?]{1,2}<\/span>[\s\S]*?<time /);
  assert.match(html, /<li class="panel-mensaje panel-mensaje-soporte">[\s\S]*?Revisamos el pedido\./);
  assert.match(html, /panel-mensaje-escalado[\s\S]*?Nota de escalado/);
  const respuesta = html.slice(html.indexOf("panel-mensaje-soporte"), html.indexOf("panel-mensaje-escalado"));
  assert.doesNotMatch(respuesta, /<time/, "la respuesta no trae fecha");
  assert.match(regla(".panel-mensaje-cliente .panel-burbuja"), /background:\s*#ffffff/i);
  assert.match(regla(".panel-mensaje-soporte .panel-burbuja"), /background:\s*#f5f9ff/i);
  assert.match(regla(".panel-mensaje-soporte .panel-burbuja"), /border-color:\s*#dbe7ff/i);
});

test("5: EN_ATENCION tuyo: formulario con etiqueta, casilla «resuelto» SIN marcar y escalado con motivo obligatorio", () => {
  const html = visible(renderizarDetalleReclamo(R[1], { contexto: ctxDe(2), usuarioId: ANDREA, ahora: AHORA }));
  assert.match(html, /<form [^>]*id="bandeja-form-responder"/);
  assert.match(html, /<label [^>]*for="bandeja-respuesta"[^>]*>Responder al cliente<\/label>\s*<textarea [^>]*id="bandeja-respuesta"[^>]*required/);
  const casilla = html.match(/<input [^>]*type="checkbox"[^>]*>/)[0];
  assert.match(casilla, /id="bandeja-resuelto"/);
  assert.doesNotMatch(casilla, /checked/, "la casilla no viene marcada por defecto");
  assert.match(html, /<label [^>]*for="bandeja-resuelto"[^>]*>Marcar como resuelto al enviar<\/label>/);
  assert.match(html, /<button [^>]*type="submit"[^>]*panel-boton-principal[^>]*>Enviar respuesta<\/button>/);
  assert.match(html, /<button [^>]*data-escalar-abrir[^>]*panel-boton-secundario[^>]*>Escalar a la administración<\/button>/);
  assert.match(html, /<label [^>]*for="bandeja-motivo-escalar"[^>]*>Motivo del escalamiento<\/label>\s*<textarea [^>]*id="bandeja-motivo-escalar"[^>]*required/);
  assert.match(html, /<p [^>]*id="bandeja-error-reclamo"[^>]*role="alert"/);
});

test("5: de otro agente, escalado o resuelto: solo lectura con su nota", () => {
  for (const [r, nota] of [[R[2], /Lo atiende otro agente de soporte\./], [R[4], /La administración decide este reclamo\./], [R[3], /Reclamo resuelto\./]]) {
    const html = visible(renderizarDetalleReclamo(r, { contexto: ctxDe(r.pedidoId), usuarioId: ANDREA, ahora: AHORA }));
    assert.match(html, nota);
    assert.doesNotMatch(html, /<textarea|<form|data-tomar-reclamo/);
    assert.match(html, /Ver el pedido #\d+ en Consulta de pedido/);
  }
  const html = visible(renderizarDetalleReclamo(R[1], { contexto: ctxDe(2), usuarioId: ANDREA, ahora: AHORA }));
  assert.match(html, /<a class="panel-enlace" href="#\/consulta-pedido\?pedido=2">Ver el pedido #2 en Consulta de pedido<\/a>/);
});

test("5: texto escapado", () => {
  const html = renderizarDetalleReclamo({ ...R[5], motivo: "<img src=x>", descripcion: "<b>hola</b>" }, { contexto: ctxDe(6), usuarioId: ANDREA, ahora: AHORA });
  assert.doesNotMatch(html, /<img|<b>/);
});

test("6: devolución SOLICITADA: barra de progreso, casillas, motivo, líneas y decisión con motivo", () => {
  const html = visible(renderizarDetalleDevolucion(D[4], { contexto: ctxDe(8), ahora: AHORA }));
  assert.match(html, /Devolución #4 · Pedido #8/);
  assert.match(html, /<ol class="panel-progreso" aria-label="Progreso de la devolución">/);
  assert.equal(contar(html, /<li class="panel-progreso-paso panel-progreso-paso-/g), 3);
  assert.match(html, /<dt>Cliente<\/dt>\s*<dd>Sofía Medina Arce/);
  assert.match(html, /<dt>Solicitada<\/dt>/);
  assert.match(html, /<dt>Importe<\/dt>\s*<dd>S\/\s*348\.00/);
  assert.match(html, /Las almohadillas me incomodan/);
  assert.match(html, /Auriculares gamer Cloud Stinger Core[\s\S]*?1 × [\s\S]*?S\/\s*199\.00/);
  assert.match(html, /<label [^>]*for="bandeja-decision"[^>]*>Motivo de la decisión<\/label>\s*<textarea [^>]*id="bandeja-decision"/);
  assert.match(html, /<button [^>]*data-decidir="rechazar"[^>]*panel-boton-rechazar[^>]*>Rechazar<\/button>/);
  assert.match(html, /<button [^>]*data-decidir="aprobar"[^>]*panel-boton-principal[^>]*>Aprobar devolución<\/button>/);
  assert.match(html, /<p [^>]*id="bandeja-error-devolucion"[^>]*role="alert"/);
  assert.match(regla(".panel-boton-rechazar"), /border-color:\s*#fca5a5/i);
});

test("6: devolución APROBADA: «¿Apta para la venta?» sin ninguna opción preseleccionada y recepción bloqueada", () => {
  const html = visible(renderizarDetalleDevolucion(D[2], { contexto: ctxDe(4), ahora: AHORA }));
  assert.match(html, /<fieldset [^>]*>\s*<legend[^>]*>¿Apta para la venta\?<\/legend>/);
  assert.equal(contar(html, /type="radio"/g), 2);
  assert.doesNotMatch(html, /type="radio"[^>]*checked|checked[^>]*type="radio"/, "ninguna opción preseleccionada");
  assert.match(html, /name="apta-5" value="si"[\s\S]*?Sí, vuelve al stock/);
  assert.match(html, /name="apta-5" value="no"[\s\S]*?>No</);
  assert.match(html, /Al registrar la recepción se reembolsan S\/\s*175\.00 al cliente\./);
  assert.match(html, /<button [^>]*type="submit"[^>]*disabled[^>]*>Registrar recepción y reembolsar<\/button>/);
  assert.doesNotMatch(html, /Reembolso simulado/);
});

test("6: CERRADA y RECHAZADA: solo lectura con su nota", () => {
  const cerrada = visible(renderizarDetalleDevolucion(D[1], { contexto: ctxDe(1), ahora: AHORA }));
  assert.match(cerrada, /Reembolsamos S\/\s*49\.00 al cliente/);
  assert.match(cerrada, /Mouse inalámbrico M170[\s\S]*?vuelve al stock|repuesta al stock/);
  assert.doesNotMatch(cerrada, /<textarea|<form|<button/);
  const rechazada = visible(renderizarDetalleDevolucion(D[3], { contexto: ctxDe(6), ahora: AHORA }));
  assert.match(rechazada, /Motivo del rechazo[\s\S]*?El producto presenta señales de uso\./);
  assert.match(rechazada, /panel-progreso-paso-rechazado/);
  assert.doesNotMatch(rechazada, /<textarea|<form|<button/);
  const sinMotivo = renderizarDetalleDevolucion({ ...D[3], observacion: null }, { contexto: ctxDe(6), ahora: AHORA });
  assert.match(sinMotivo, /Sin motivo registrado/);
});

test("7: esqueleto: lista y detalle, «Volver a la lista» y buscador con etiqueta", () => {
  const html = renderizarBandeja("reclamos");
  assert.match(html, /<div class="panel-bandeja"[^>]*id="bandeja-raiz"/);
  assert.match(html, /<label [^>]*for="bandeja-buscar"[^>]*>Buscar por pedido, cliente o motivo<\/label>/);
  assert.match(html, /<input [^>]*id="bandeja-buscar"[^>]*type="search"/);
  assert.match(html, /<button [^>]*data-volver-lista[^>]*>Volver a la lista<\/button>/);
  assert.match(html, /id="bandeja-pestanas"/);
  assert.match(html, /id="bandeja-lista"/);
  assert.match(html, /id="bandeja-detalle"/);
  assert.match(html, /<section [^>]*aria-label="Detalle del reclamo"/);
  assert.match(renderizarBandeja("devoluciones"), /aria-label="Detalle de la devolución"/);
});

// ---------- CSS ----------

test("1: dos paneles desde 992 px: lista de 360 a 440 px y detalle", () => {
  const m = bloquesMedia("(min-width: 992px)");
  assert.match(reglaEn(m, ".panel-bandeja"), /grid-template-columns:\s*minmax\(360px, 440px\) minmax\(0, 1fr\)/);
  assert.match(reglaEn(m, ".panel-bandeja-volver"), /display:\s*none/);
});

test("7: celular: o lista o detalle, «Volver a la lista», píldoras con desplazamiento y botones de 48 px", () => {
  const m = bloquesMedia("(max-width: 991.98px)");
  assert.match(reglaEn(m, ".panel-bandeja-detalle"), /display:\s*none/);
  assert.match(reglaEn(m, ".panel-bandeja-con-detalle .panel-bandeja-lista-panel"), /display:\s*none/);
  assert.match(reglaEn(m, ".panel-bandeja-con-detalle .panel-bandeja-detalle"), /display:\s*block/);
  assert.match(reglaEn(m, ".panel-pestanas"), /overflow-x:\s*auto/);
  assert.match(reglaEn(m, ".panel-pestana"), /border-radius:\s*999px/);
  const c = bloquesMedia("(max-width: 575.98px)");
  assert.match(reglaEn(c, ".panel-bandeja .panel-boton"), /min-height:\s*48px/);
  assert.match(reglaEn(c, ".panel-bandeja-volver"), /min-height:\s*48px/);
});

test("8: accesibilidad: el título del detalle recibe el foco y no hay colores de estado sin texto", () => {
  const html = renderizarDetalleDevolucion(D[2], { contexto: ctxDe(4), ahora: AHORA });
  assert.match(html, /<h2 [^>]*class="panel-detalle-titulo"[^>]*tabindex="-1"/);
});

test("7: la lista no ensancha la página: su columna se encoge (las pestañas se desplazan dentro)", () => {
  assert.match(regla(".panel-bandeja-lista-panel"), /grid-template-columns:\s*minmax\(0, 1fr\)/);
});
