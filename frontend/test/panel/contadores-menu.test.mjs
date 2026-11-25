// Panel del personal: contadores del menú (lógica pura, pintado y carga de respaldo).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { calcularContadores, crearContadores, FUENTES_POR_ROL } from "../../src/panel/contadores-menu.js";

const leer = (ruta) => readFileSync(new URL(ruta, import.meta.url), "utf8");

// ---------- Lógica pura ----------

test("ADMIN: «Pedidos» = pendientes del resumen y «Incidencias» = escalados (en rojo)", () => {
  const resumen = { pedidosPorEstado: { PENDIENTE: 5, ENTREGADO: 9 }, escalados: 2 };
  const c = calcularContadores("ADMIN", { resumen });
  assert.deepEqual(c["#/pedidos"], { valor: 5, tono: "ambar", texto: "5 pendientes", etiqueta: "Pedidos" });
  assert.deepEqual(c["#/incidencias"], { valor: 2, tono: "rojo", texto: "2 escalados", etiqueta: "Incidencias" });
});

test("ALMACEN: «Pedidos por atender» = PENDIENTE + EN_PREPARACION de los operativos", () => {
  const pedidos = [{ estado: "PENDIENTE" }, { estado: "EN_PREPARACION" }, { estado: "EN_PREPARACION" }, { estado: "DESPACHADO" }];
  const c = calcularContadores("ALMACEN", { pedidos });
  assert.deepEqual(Object.keys(c), ["#/pedidos"]);
  assert.equal(c["#/pedidos"].valor, 3);
  assert.equal(c["#/pedidos"].etiqueta, "Pedidos por atender");
  assert.equal(c["#/pedidos"].texto, "3 por atender");
});

test("VENDEDOR: «Consultas de clientes» = preguntas pendientes", () => {
  const c = calcularContadores("VENDEDOR", { preguntas: [{}, {}, {}] });
  assert.equal(c["#/consultas"].valor, 3);
  assert.equal(c["#/consultas"].texto, "3 pendientes");
  assert.equal(c["#/consultas"].etiqueta, "Consultas de clientes");
});

test("SOPORTE: «Reclamos» = ABIERTO y «Devoluciones» = SOLICITADA", () => {
  const reclamos = [{ estado: "ABIERTO" }, { estado: "ABIERTO" }, { estado: "EN_ATENCION" }, { estado: "ESCALADO" }];
  const devoluciones = [{ estado: "SOLICITADA" }, { estado: "APROBADA" }];
  const c = calcularContadores("SOPORTE", { reclamos, devoluciones });
  assert.equal(c["#/reclamos"].valor, 2);
  assert.equal(c["#/reclamos"].texto, "2 abiertos");
  assert.equal(c["#/devoluciones"].valor, 1);
  assert.equal(c["#/devoluciones"].texto, "1 solicitada");
  assert.equal(c["#/devoluciones"].tono, "ambar");
});

test("no se muestra el contador si el valor es 0, si su fuente falló (null) o si aún no se cargó", () => {
  assert.deepEqual(calcularContadores("ADMIN", { resumen: { pedidosPorEstado: {}, escalados: 0 } }), {});
  assert.deepEqual(calcularContadores("ADMIN", { resumen: null }), {});
  assert.deepEqual(calcularContadores("ADMIN", {}), {});
  assert.deepEqual(calcularContadores("SOPORTE", { reclamos: null, devoluciones: [{ estado: "SOLICITADA" }] }), {
    "#/devoluciones": { valor: 1, tono: "ambar", texto: "1 solicitada", etiqueta: "Devoluciones" },
  });
  assert.deepEqual(calcularContadores("CLIENTE", { resumen: {} }), {});
});

test("las fuentes de cada rol son las que su Inicio ya carga", () => {
  assert.deepEqual(FUENTES_POR_ROL, { ADMIN: ["resumen"], ALMACEN: ["pedidos"], VENDEDOR: ["preguntas"], SOPORTE: ["reclamos", "devoluciones"] });
});

// ---------- Pintado ----------

function enlace(href) {
  return { href, html: "", getAttribute: (k) => (k === "href" ? href : null),
    querySelectorAll() { return this.html ? [{ remove: () => { this.html = ""; } }] : []; },
    insertAdjacentHTML(_donde, texto) { this.html += texto; } };
}
function entorno(rol, rutas, chips = []) {
  const enlaces = rutas.map(enlace);
  const enlacesChips = chips.map(enlace);
  const peticiones = [];
  const respuestas = {};
  const contadores = crearContadores({
    rol,
    menu: { querySelectorAll: () => enlaces },
    documento: { querySelectorAll: () => enlacesChips },
    apiRequest: async (url) => {
      peticiones.push(url);
      if (respuestas[url] instanceof Error) throw respuestas[url];
      return { json: async () => respuestas[url] };
    },
  });
  return { enlaces, enlacesChips, contadores, peticiones, respuestas };
}

test("actualizarContadores pinta la pastilla (número oculto a lectores) y el texto oculto de la entrada", () => {
  const e = entorno("ADMIN", ["#/inicio", "#/pedidos", "#/incidencias"]);
  e.contadores.actualizarContadores({ resumen: { pedidosPorEstado: { PENDIENTE: 1 }, escalados: 3 } });
  assert.equal(e.enlaces[0].html, "");
  assert.match(e.enlaces[1].html, /<span class="panel-contador" aria-hidden="true">1<\/span><span class="visually-hidden">, 1 pendiente<\/span>/);
  assert.match(e.enlaces[2].html, /<span class="panel-contador panel-contador-rojo" aria-hidden="true">3<\/span><span class="visually-hidden">, 3 escalados<\/span>/);
});

test("al llegar datos nuevos se repinta; si la fuente falla o el valor es 0, el contador desaparece", () => {
  const e = entorno("ADMIN", ["#/pedidos"]);
  e.contadores.actualizarContadores({ resumen: { pedidosPorEstado: { PENDIENTE: 4 }, escalados: 0 } });
  assert.match(e.enlaces[0].html, />4</);
  e.contadores.actualizarContadores({ resumen: { pedidosPorEstado: { PENDIENTE: 2 }, escalados: 0 } });
  assert.equal((e.enlaces[0].html.match(/panel-contador"/g) ?? []).length, 1, "no se acumulan");
  assert.match(e.enlaces[0].html, />2</);
  e.contadores.actualizarContadores({ resumen: null });
  assert.equal(e.enlaces[0].html, "");
  e.contadores.actualizarContadores({ resumen: { pedidosPorEstado: { PENDIENTE: 0 }, escalados: 0 } });
  assert.equal(e.enlaces[0].html, "");
});

test("una actualización parcial conserva las demás fuentes (Soporte carga reclamos y devoluciones por separado)", () => {
  const e = entorno("SOPORTE", ["#/reclamos", "#/devoluciones"]);
  e.contadores.actualizarContadores({ reclamos: [{ estado: "ABIERTO" }] });
  e.contadores.actualizarContadores({ devoluciones: [{ estado: "SOLICITADA" }, { estado: "SOLICITADA" }] });
  assert.match(e.enlaces[0].html, />1</);
  assert.match(e.enlaces[1].html, />2</);
});

test("en celular los mismos contadores aparecen en los accesos rápidos", () => {
  const e = entorno("ALMACEN", ["#/inicio", "#/pedidos"], ["#/inicio", "#/pedidos", "#/inventario"]);
  e.contadores.actualizarContadores({ pedidos: [{ estado: "PENDIENTE" }, { estado: "EN_PREPARACION" }] });
  assert.equal(e.enlacesChips[0].html, "");
  assert.match(e.enlacesChips[1].html, /panel-contador" aria-hidden="true">2<\/span><span class="visually-hidden">, 2 por atender/);
  assert.equal(e.enlacesChips[2].html, "");
});

// ---------- Carga de respaldo ----------

test("cargarEnSegundoPlano pide UNA vez las mismas fuentes del rol y pinta los contadores", async () => {
  const e = entorno("SOPORTE", ["#/reclamos", "#/devoluciones"]);
  e.respuestas["/api/soporte/reclamos"] = [{ estado: "ABIERTO" }, { estado: "ABIERTO" }];
  e.respuestas["/api/soporte/devoluciones"] = [{ estado: "SOLICITADA" }];
  await e.contadores.cargarEnSegundoPlano();
  assert.deepEqual(e.peticiones.sort(), ["/api/soporte/devoluciones", "/api/soporte/reclamos"]);
  assert.match(e.enlaces[0].html, />2</);
  assert.match(e.enlaces[1].html, />1</);
});

test("endpoints de respaldo de cada rol", async () => {
  const esperados = { ADMIN: ["/api/admin/reportes/resumen"], ALMACEN: ["/api/pedidos/operativos"], VENDEDOR: ["/api/vendedor/preguntas"] };
  for (const [rol, urls] of Object.entries(esperados)) {
    const e = entorno(rol, []);
    for (const url of urls) e.respuestas[url] = rol === "ADMIN" ? { pedidosPorEstado: {}, escalados: 0 } : [];
    await e.contadores.cargarEnSegundoPlano();
    assert.deepEqual(e.peticiones, urls, rol);
  }
});

test("si la carga de respaldo falla, no muestra el contador y no lanza (sin toast)", async () => {
  const e = entorno("ADMIN", ["#/pedidos"]);
  e.respuestas["/api/admin/reportes/resumen"] = new Error("sin red");
  await assert.doesNotReject(() => e.contadores.cargarEnSegundoPlano());
  assert.equal(e.enlaces[0].html, "");
});

test("un dato que llega del Inicio no lo pisa la carga de respaldo que termina después", async () => {
  const e = entorno("ADMIN", ["#/pedidos"]);
  let liberar;
  e.contadores = crearContadores({
    rol: "ADMIN", menu: { querySelectorAll: () => e.enlaces }, documento: { querySelectorAll: () => [] },
    apiRequest: () => new Promise((resolver) => { liberar = () => resolver({ json: async () => ({ pedidosPorEstado: { PENDIENTE: 99 }, escalados: 0 }) }); }),
  });
  const carga = e.contadores.cargarEnSegundoPlano();
  e.contadores.actualizarContadores({ resumen: { pedidosPorEstado: { PENDIENTE: 3 }, escalados: 0 } });
  liberar();
  await carga;
  assert.match(e.enlaces[0].html, />3</);
});

// ---------- Cableado ----------

test("el marco ofrece actualizarContadores a las pantallas y pide la carga de respaldo fuera de #/inicio", () => {
  const main = leer("../../src/panel/panel-main.js");
  assert.match(main, /actualizarContadores:\s*contadores\.actualizarContadores/);
  assert.match(main, /cargarEnSegundoPlano\(\)/);
  assert.match(main, /resolverRuta\(window\.location\.hash, usuario\.rol\)\.ruta !== "#\/inicio"/);
});

test("cada Inicio avisa a los contadores cuando recibe (o pierde) su fuente", () => {
  const esperado = {
    "almacen-inicio.js": ["pedidos"], "vendedor-inicio.js": ["preguntas"], "soporte-inicio.js": ["reclamos", "devoluciones"], "admin-inicio.js": ["resumen"],
  };
  for (const [archivo, fuentes] of Object.entries(esperado)) {
    const fuente = leer(`../../src/panel/inicio/${archivo}`);
    for (const f of fuentes) assert.match(fuente, new RegExp(`actualizarContadores\\?\\.\\(\\{ ${f}`), `${archivo}: ${f}`);
  }
});
