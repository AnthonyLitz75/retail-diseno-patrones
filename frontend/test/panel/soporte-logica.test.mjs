// Panel del personal (spec 19, T08): lógica pura del Inicio de Soporte (spec 16, P2, P7, P9).
import test from "node:test";
import assert from "node:assert/strict";
import {
  reclamosParaInicio,
  devolucionesParaInicio,
  indicadoresReclamos,
  indicadoresDevoluciones,
  insigniaReclamo,
  insigniaDevolucion,
  accionReclamoInicio,
  accionDevolucionInicio,
  productoDevolucion,
  resumirMotivo,
  validarNumeroPedido,
  rutaConsultaPedido,
  MENSAJE_BUSQUEDA,
  MAX_FILAS_SOPORTE,
  MAX_MOTIVO_RECLAMO,
} from "../../src/panel/inicio/soporte-logica.js";

const reclamo = (id, estado, creadoEn, extra = {}) => ({ id, estado, creadoEn, pedidoId: id * 10, motivo: "m", ...extra });
const devolucion = (id, estado, creadoEn, lineas = []) => ({ id, estado, creadoEn, pedidoId: id * 10, lineas });

// ---------- Orden y filtro ----------

test("reclamos: sin RESUELTO, del más antiguo al más reciente; sin fecha, por id", () => {
  const lista = reclamosParaInicio([
    reclamo(3, "ABIERTO", "2026-11-20T00:00:00Z"),
    reclamo(1, "ESCALADO", "2026-11-18T00:00:00Z"),
    reclamo(2, "RESUELTO", "2026-11-17T00:00:00Z"),
    reclamo(4, "EN_ATENCION", "2026-11-19T00:00:00Z"),
  ]);
  assert.deepEqual(lista.map((r) => r.id), [1, 4, 3]);
  assert.deepEqual(reclamosParaInicio([reclamo(9, "ABIERTO"), reclamo(2, "ABIERTO")]).map((r) => r.id), [2, 9]);
  assert.deepEqual(reclamosParaInicio(null), []);
});

test("devoluciones: solo SOLICITADA y APROBADA, de la más antigua a la más reciente", () => {
  const lista = devolucionesParaInicio([
    devolucion(5, "APROBADA", "2026-11-21T00:00:00Z"),
    devolucion(6, "CERRADA", "2026-11-10T00:00:00Z"),
    devolucion(7, "SOLICITADA", "2026-11-19T00:00:00Z"),
    devolucion(8, "RECHAZADA", "2026-11-11T00:00:00Z"),
  ]);
  assert.deepEqual(lista.map((d) => d.id), [7, 5]);
  assert.equal(MAX_FILAS_SOPORTE, 5);
});

// ---------- Indicadores ----------

test("indicadores de reclamos: abiertos, en atención y escalados", () => {
  assert.deepEqual(indicadoresReclamos([
    reclamo(1, "ABIERTO"), reclamo(2, "ABIERTO"), reclamo(3, "EN_ATENCION"), reclamo(4, "ESCALADO"), reclamo(5, "RESUELTO"),
  ]), { abiertos: 2, enAtencion: 1, escalados: 1 });
  assert.deepEqual(indicadoresReclamos([]), { abiertos: 0, enAtencion: 0, escalados: 0 });
});

test("devoluciones por atender: solo cuenta SOLICITADA", () => {
  assert.deepEqual(indicadoresDevoluciones([
    devolucion(1, "SOLICITADA"), devolucion(2, "APROBADA"), devolucion(3, "SOLICITADA"),
  ]), { porAtender: 2 });
});

// ---------- Insignias (spec 16) ----------

test("insignias de reclamo, exactamente las de la spec", () => {
  assert.deepEqual(insigniaReclamo("ABIERTO"), { texto: "Abierto", variante: "ambar" });
  assert.deepEqual(insigniaReclamo("EN_ATENCION"), { texto: "En atención", variante: "azul" });
  assert.deepEqual(insigniaReclamo("ESCALADO"), { texto: "Escalado", variante: "rojo" });
  assert.deepEqual(insigniaReclamo("RESUELTO"), { texto: "Resuelto", variante: "neutro" });
});

test("insignias de devolución, exactamente las de la spec", () => {
  assert.deepEqual(insigniaDevolucion("SOLICITADA"), { texto: "Solicitada", variante: "ambar" });
  assert.deepEqual(insigniaDevolucion("APROBADA"), { texto: "Aprobada", variante: "verde" });
  assert.deepEqual(insigniaDevolucion("RECHAZADA"), { texto: "Rechazada", variante: "rojo" });
  assert.deepEqual(insigniaDevolucion("CERRADA"), { texto: "Cerrada", variante: "neutro" });
});

test("un estado desconocido usa insignia neutra y no falla", () => {
  assert.equal(insigniaReclamo("OTRO").variante, "neutro");
  assert.equal(insigniaDevolucion(undefined).variante, "neutro");
});

// ---------- Acciones (P2, P7) ----------

test("reclamo ABIERTO: «Atender» (la única acción con un clic)", () => {
  assert.deepEqual(accionReclamoInicio(reclamo(1, "ABIERTO"), 7), { tipo: "tomar", texto: "Atender" });
});

test("reclamo EN_ATENCION propio: «Responder» → #/reclamos; de otro agente: «Ver detalle»", () => {
  assert.deepEqual(accionReclamoInicio(reclamo(1, "EN_ATENCION", null, { soporteId: 7 }), 7),
    { tipo: "enlace", texto: "Responder", ruta: "#/reclamos" });
  assert.deepEqual(accionReclamoInicio(reclamo(1, "EN_ATENCION", null, { soporteId: 8 }), 7),
    { tipo: "enlace", texto: "Ver detalle", ruta: "#/reclamos" });
});

test("reclamo ESCALADO (o RESUELTO): «Ver detalle» → #/reclamos", () => {
  for (const estado of ["ESCALADO", "RESUELTO"]) {
    assert.deepEqual(accionReclamoInicio(reclamo(1, estado), 7), { tipo: "enlace", texto: "Ver detalle", ruta: "#/reclamos" });
  }
});

test("devoluciones: ninguna hace PUT; Evaluar, Registrar recepción o Ver detalle → #/devoluciones", () => {
  assert.deepEqual(accionDevolucionInicio(devolucion(1, "SOLICITADA")), { texto: "Evaluar", ruta: "#/devoluciones" });
  assert.deepEqual(accionDevolucionInicio(devolucion(1, "APROBADA")), { texto: "Registrar recepción", ruta: "#/devoluciones" });
  for (const estado of ["RECHAZADA", "CERRADA"]) {
    assert.deepEqual(accionDevolucionInicio(devolucion(1, estado)), { texto: "Ver detalle", ruta: "#/devoluciones" });
  }
});

// ---------- Textos (P9) ----------

test("producto de la devolución: el nombre con una línea; «{n} productos» con varias", () => {
  assert.equal(productoDevolucion(devolucion(1, "SOLICITADA", null, [{ nombreProducto: "Mouse G203" }])), "Mouse G203");
  assert.equal(productoDevolucion(devolucion(1, "SOLICITADA", null, [{ nombreProducto: "A" }, { nombreProducto: "B" }])), "2 productos");
  assert.equal(productoDevolucion(devolucion(1, "SOLICITADA", null, [])), "0 productos");
});

test("motivo del reclamo: hasta 60 caracteres, con «…» solo si se corta", () => {
  assert.equal(MAX_MOTIVO_RECLAMO, 60);
  assert.equal(resumirMotivo("Llegó dañado"), "Llegó dañado");
  const largo = resumirMotivo("x".repeat(100));
  assert.equal(largo.length, 60);
  assert.ok(largo.endsWith("…"));
});

// ---------- Búsqueda de pedido (P8) ----------

test("búsqueda válida: entero positivo tras recortar; «03» cuenta como 3", () => {
  assert.deepEqual(validarNumeroPedido("3"), { valido: true, numero: 3 });
  assert.deepEqual(validarNumeroPedido("  12 "), { valido: true, numero: 12 });
  assert.deepEqual(validarNumeroPedido("03"), { valido: true, numero: 3 });
  assert.equal(rutaConsultaPedido(3), "#/consulta-pedido?pedido=3");
});

test("búsqueda no válida: «Escribe el número del pedido.»", () => {
  assert.equal(MENSAJE_BUSQUEDA, "Escribe el número del pedido.");
  for (const valor of ["", "   ", "abc", "0", "00", "-3", "3.5", "3a", "1e2", undefined, null]) {
    assert.deepEqual(validarNumeroPedido(valor), { valido: false, mensaje: MENSAJE_BUSQUEDA }, String(valor));
  }
});
