// Panel del personal (spec 19, T04): router del panel. resolverRuta es pura; el router se
// prueba sobre un DOM mínimo simulado (sin navegador).
import test from "node:test";
import assert from "node:assert/strict";
import {
  resolverRuta,
  tituloPantalla,
  crearPanelRouter,
  RUTA_INICIO,
} from "../../src/panel/panel-router.js";
import { entradasDeRol } from "../../src/panel/menu-por-rol.js";

const PERSONAL = ["ADMIN", "VENDEDOR", "ALMACEN", "SOPORTE"];
const MENSAJE = "Tu rol no tiene acceso a esa sección.";

// ---------- resolverRuta ----------

test("cada ruta del menú del rol se resuelve a su entrada, sin redirección", () => {
  for (const rol of PERSONAL) {
    for (const entrada of entradasDeRol(rol)) {
      const r = resolverRuta(entrada.ruta, rol);
      assert.equal(r.ruta, entrada.ruta, `${rol} ${entrada.ruta}`);
      assert.equal(r.entrada, entrada);
      assert.deepEqual(r.parametros, {});
      assert.equal(r.redireccion, undefined);
    }
  }
});

test("hash vacío o desconocido: #/inicio en silencio (motivo «desconocida», sin mensaje)", () => {
  for (const hash of ["", "#", "#/", "#/no-existe", "pedidos", "/pedidos", "#pedidos", "#/pedidos/", "#/Pedidos",
    "#/PEDIDOS", "#/inicio/extra", " #/pedidos", undefined, null]) {
    const r = resolverRuta(hash, "ALMACEN");
    assert.equal(r.ruta, RUTA_INICIO, String(hash));
    assert.equal(r.entrada.ruta, "#/inicio");
    assert.deepEqual(r.parametros, {});
    assert.deepEqual(r.redireccion, { a: "#/inicio", motivo: "desconocida" }, String(hash));
  }
});

test("ruta que existe en el panel pero no en el menú del rol: #/inicio con motivo «sin-acceso» y mensaje", () => {
  const casos = [
    ["ALMACEN", "#/auditoria"], ["ALMACEN", "#/productos"], ["ALMACEN", "#/reclamos"],
    ["VENDEDOR", "#/auditoria"], ["VENDEDOR", "#/cuentas"], ["VENDEDOR", "#/consulta-pedido?pedido=3"],
    ["SOPORTE", "#/pedidos"], ["SOPORTE", "#/inventario"], ["ADMIN", "#/reclamos"], ["ADMIN", "#/consultas"],
  ];
  for (const [rol, hash] of casos) {
    const r = resolverRuta(hash, rol);
    assert.equal(r.ruta, "#/inicio", `${rol} ${hash}`);
    assert.deepEqual(r.parametros, {});
    assert.deepEqual(r.redireccion, { a: "#/inicio", motivo: "sin-acceso", mensaje: MENSAJE }, `${rol} ${hash}`);
  }
});

test("#/consulta-pedido lee el parámetro pedido tal cual, sin validarlo", () => {
  assert.deepEqual(resolverRuta("#/consulta-pedido?pedido=3", "SOPORTE").parametros, { pedido: "3" });
  assert.deepEqual(resolverRuta("#/consulta-pedido?pedido=abc", "SOPORTE").parametros, { pedido: "abc" });
  assert.deepEqual(resolverRuta("#/consulta-pedido?pedido=", "SOPORTE").parametros, { pedido: "" });
  assert.deepEqual(resolverRuta("#/consulta-pedido", "SOPORTE").parametros, {});
  const r = resolverRuta("#/consulta-pedido?pedido=3", "SOPORTE");
  assert.equal(r.ruta, "#/consulta-pedido");
  assert.equal(r.redireccion, undefined);
});

test("con un parámetro repetido vale el primero", () => {
  assert.deepEqual(resolverRuta("#/consulta-pedido?pedido=3&pedido=9", "SOPORTE").parametros, { pedido: "3" });
});

test("los parámetros declarados se pasan al controlador y los desconocidos se ignoran sin redirigir", () => {
  const conConocidos = resolverRuta("#/pedidos?estado=PENDIENTE&pedido=3&x=1", "ALMACEN");
  assert.equal(conConocidos.ruta, "#/pedidos");
  assert.deepEqual(conConocidos.parametros, { estado: "PENDIENTE", pedido: "3" });
  assert.equal(conConocidos.redireccion, undefined);

  const inv = resolverRuta("#/inventario?producto=7&otro=1", "ALMACEN");
  assert.equal(inv.ruta, "#/inventario");
  assert.deepEqual(inv.parametros, { producto: "7" });
  assert.equal(inv.redireccion, undefined);

  const r = resolverRuta("#/pedidos?x=1", "ALMACEN");
  assert.equal(r.ruta, "#/pedidos");
  assert.deepEqual(r.parametros, {});
  assert.equal(r.redireccion, undefined);
  assert.deepEqual(resolverRuta("#/consulta-pedido?pedido=4&otro=1", "SOPORTE").parametros, { pedido: "4" });
});

test("el título es «{Pantalla} · Panel del personal · Píxel Andino»", () => {
  assert.equal(tituloPantalla("Inicio"), "Inicio · Panel del personal · Píxel Andino");
  assert.equal(tituloPantalla("Pedidos por atender"), "Pedidos por atender · Panel del personal · Píxel Andino");
});

// ---------- DOM mínimo simulado ----------

class Elemento {
  constructor(etiqueta, documento) {
    this.tagName = etiqueta.toUpperCase();
    this.ownerDocument = documento;
    this.children = [];
    this.atributos = new Map();
    this.dataset = {};
    this.hidden = false;
    this.textContent = "";
  }
  append(...hijos) { this.children.push(...hijos); }
  setAttribute(nombre, valor) { this.atributos.set(nombre, String(valor)); }
  getAttribute(nombre) { return this.atributos.has(nombre) ? this.atributos.get(nombre) : null; }
  hasAttribute(nombre) { return this.atributos.has(nombre); }
  removeAttribute(nombre) { this.atributos.delete(nombre); }
  focus() { this.ownerDocument.activeElement = this; }
  *descendientes() { for (const h of this.children) { yield h; yield* h.descendientes(); } }
  querySelector(selector) { return this.querySelectorAll(selector)[0] ?? null; }
  querySelectorAll(selector) {
    const todos = [...this.descendientes()];
    if (selector === "a[href]") return todos.filter((e) => e.tagName === "A" && e.hasAttribute("href"));
    return todos.filter((e) => e.tagName === selector.toUpperCase());
  }
}

function crearEntorno(rol, hashInicial) {
  const documento = { title: "", activeElement: null, createElement: (t) => new Elemento(t, documento) };
  const menu = new Elemento("nav", documento);
  for (const { ruta } of entradasDeRol(rol)) {
    const a = new Elemento("a", documento);
    a.setAttribute("href", ruta);
    menu.append(a);
  }
  const area = new Elemento("main", documento);
  const oyentes = {};
  const reemplazos = [];
  const ventana = {
    location: { hash: hashInicial, pathname: "/panel.html", search: "" },
    history: {
      replaceState: (_estado, _t, url) => {
        reemplazos.push(url);
        ventana.location.hash = url.slice(url.indexOf("#"));
      },
    },
    addEventListener: (tipo, fn) => { oyentes[tipo] = fn; },
  };
  const toasts = [];
  const cargas = {};
  const montajes = {};
  const cargadores = {};
  for (const { ruta } of entradasDeRol(rol)) {
    cargadores[ruta] = async () => {
      cargas[ruta] = (cargas[ruta] ?? 0) + 1;
      return {
        montar(contenedor, { entrada }) {
          montajes[ruta] = (montajes[ruta] ?? 0) + 1;
          const h1 = documento.createElement("h1");
          h1.textContent = entrada.etiqueta;
          contenedor.append(h1);
        },
      };
    };
  }
  const router = crearPanelRouter({
    rol, ventana, documento, menu, area, cargadores, mostrarToast: (m, t) => toasts.push({ m, t }),
  });
  async function irA(hash) {
    ventana.location.hash = hash;
    await oyentes.hashchange();
  }
  const activos = () => menu.querySelectorAll("a[href]").filter((a) => a.getAttribute("aria-current") === "page")
    .map((a) => a.getAttribute("href"));
  const visibles = () => area.children.filter((c) => !c.hidden).map((c) => c.dataset.ruta);
  return { router, documento, area, ventana, reemplazos, toasts, cargas, montajes, irA, activos, visibles };
}

// ---------- crearPanelRouter ----------

test("al iniciar muestra la ruta del hash, marca su ítem y actualiza el título (sin mover el foco)", async () => {
  const e = crearEntorno("ALMACEN", "#/pedidos");
  await e.router.iniciar();
  assert.deepEqual(e.visibles(), ["#/pedidos"]);
  assert.deepEqual(e.activos(), ["#/pedidos"]);
  assert.equal(e.documento.title, "Pedidos por atender · Panel del personal · Píxel Andino");
  // F3: en la carga inicial el foco no se mueve al <h1>; así el primer Tab va a «Saltar al contenido».
  assert.equal(e.documento.activeElement, null);
  assert.deepEqual(e.reemplazos, []);
});

test("F3: tras una navegación dentro del panel el foco sí pasa al <h1> de la nueva pantalla", async () => {
  const e = crearEntorno("ALMACEN", "#/inicio");
  await e.router.iniciar();
  assert.equal(e.documento.activeElement, null);
  await e.irA("#/pedidos");
  assert.equal(e.documento.activeElement?.tagName, "H1");
  assert.equal(e.documento.activeElement.textContent, "Pedidos por atender");
  assert.equal(e.documento.activeElement.getAttribute("tabindex"), "-1");
});

test("al cambiar el hash solo el ítem de la ruta actual lleva aria-current", async () => {
  const e = crearEntorno("ADMIN", "#/inicio");
  await e.router.iniciar();
  await e.irA("#/auditoria");
  assert.deepEqual(e.activos(), ["#/auditoria"]);
  assert.deepEqual(e.visibles(), ["#/auditoria"]);
  assert.equal(e.documento.title, "Auditoría · Panel del personal · Píxel Andino");
  assert.equal(e.documento.activeElement.textContent, "Auditoría");
});

test("una ruta con parámetros mantiene activo su ítem", async () => {
  const e = crearEntorno("SOPORTE", "#/consulta-pedido?pedido=3");
  await e.router.iniciar();
  assert.deepEqual(e.activos(), ["#/consulta-pedido"]);
  assert.deepEqual(e.visibles(), ["#/consulta-pedido"]);
  assert.deepEqual(e.reemplazos, []);
});

test("cada pantalla se carga con import() la primera vez y se monta una sola vez", async () => {
  const e = crearEntorno("ALMACEN", "#/inicio");
  await e.router.iniciar();
  await e.irA("#/pedidos");
  await e.irA("#/inicio");
  await e.irA("#/pedidos");
  await e.irA("#/inventario");
  await e.irA("#/pedidos");
  assert.deepEqual(e.cargas, { "#/inicio": 1, "#/pedidos": 1, "#/inventario": 1 });
  assert.deepEqual(e.montajes, { "#/inicio": 1, "#/pedidos": 1, "#/inventario": 1 });
  assert.equal(e.area.children.length, 3);
  assert.deepEqual(e.visibles(), ["#/pedidos"]);
});

test("dos cambios seguidos a la misma ruta no la montan dos veces", async () => {
  const e = crearEntorno("ALMACEN", "#/inicio");
  await e.router.iniciar();
  e.ventana.location.hash = "#/inventario";
  await Promise.all([e.router.navegar(), e.router.navegar()]);
  assert.equal(e.cargas["#/inventario"], 1);
  assert.equal(e.montajes["#/inventario"], 1);
});

test("hash vacío o desconocido: replaceState a #/inicio, sin toast ni entrada nueva", async () => {
  for (const hash of ["", "#/no-existe", "#/pedidos/", "#/Pedidos"]) {
    const e = crearEntorno("ALMACEN", hash);
    await e.router.iniciar();
    assert.deepEqual(e.reemplazos, ["/panel.html#/inicio"], hash);
    assert.deepEqual(e.toasts, [], hash);
    assert.deepEqual(e.visibles(), ["#/inicio"], hash);
    assert.deepEqual(e.activos(), ["#/inicio"], hash);
  }
});

test("ruta sin acceso: replaceState a #/inicio y toast «Tu rol no tiene acceso a esa sección.»", async () => {
  const e = crearEntorno("ALMACEN", "#/inicio");
  await e.router.iniciar();
  await e.irA("#/auditoria");
  assert.deepEqual(e.reemplazos, ["/panel.html#/inicio"]);
  assert.equal(e.toasts.length, 1);
  assert.equal(e.toasts[0].m, MENSAJE);
  assert.deepEqual(e.visibles(), ["#/inicio"]);
  assert.deepEqual(e.activos(), ["#/inicio"]);
  assert.equal(e.documento.title, "Inicio · Panel del personal · Píxel Andino");
});

test("replaceState conserva la ruta y la búsqueda de la página", async () => {
  const e = crearEntorno("VENDEDOR", "#/auditoria");
  e.ventana.location.search = "?x=1";
  await e.router.iniciar();
  assert.deepEqual(e.reemplazos, ["/panel.html?x=1#/inicio"]);
});

test("si falla la carga de una pantalla: toast de error y se reintenta al volver", async () => {
  const e = crearEntorno("ALMACEN", "#/inicio");
  await e.router.iniciar();
  let intentos = 0;
  const original = e.router.cargadores["#/inventario"];
  e.router.cargadores["#/inventario"] = async () => {
    intentos += 1;
    if (intentos === 1) throw new Error("sin red");
    return original();
  };
  await e.irA("#/inventario");
  assert.equal(e.toasts.length, 1);
  assert.equal(e.toasts[0].t, "error");
  await e.irA("#/inicio");
  await e.irA("#/inventario");
  assert.equal(intentos, 2);
  assert.deepEqual(e.visibles(), ["#/inventario"]);
});

test("por defecto, cada ruta del menú tiene un cargador", () => {
  for (const rol of PERSONAL) {
    const router = crearPanelRouter({
      rol,
      ventana: { location: { hash: "" }, history: {}, addEventListener() {} },
      documento: {},
      menu: null,
      area: null,
      mostrarToast() {},
    });
    for (const { ruta } of entradasDeRol(rol)) {
      assert.equal(typeof router.cargadores[ruta], "function", `${rol} ${ruta}`);
    }
  }
});

// ---------- T06: gancho alMostrar y servicios ----------

function entornoConGancho(hashInicial) {
  const documento = { title: "", activeElement: null, createElement: (t) => new Elemento(t, documento) };
  const area = new Elemento("main", documento);
  const oyentes = {};
  const ventana = {
    location: { hash: hashInicial, pathname: "/panel.html", search: "" },
    history: { replaceState: (_e, _t, url) => { ventana.location.hash = url.slice(url.indexOf("#")); } },
    addEventListener: (tipo, fn) => { oyentes[tipo] = fn; },
  };
  const llamadas = [];
  const contextos = [];
  const servicios = { apiRequest: () => {}, estado: {} };
  const cargadores = {};
  for (const ruta of ["#/inicio", "#/pedidos", "#/inventario"]) {
    cargadores[ruta] = async () => ({
      montar(contenedor, contexto) {
        contextos.push(contexto);
        contenedor.append(documento.createElement("h1"));
        if (ruta === "#/inventario") return undefined; // pantalla sin gancho
        return { alMostrar: (parametros) => { llamadas.push([ruta, parametros]); } };
      },
    });
  }
  const router = crearPanelRouter({
    rol: "ALMACEN", ventana, documento, menu: null, area, cargadores, servicios, mostrarToast() {},
  });
  const irA = async (hash) => { ventana.location.hash = hash; await oyentes.hashchange(); };
  return { router, llamadas, contextos, servicios, irA };
}

test("alMostrar se llama cada vez que se muestra la pantalla, también la primera", async () => {
  const e = entornoConGancho("#/inicio");
  await e.router.iniciar();
  await e.irA("#/pedidos");
  await e.irA("#/inicio");
  await e.irA("#/inicio");
  assert.deepEqual(e.llamadas.map(([ruta]) => ruta), ["#/inicio", "#/pedidos", "#/inicio", "#/inicio"]);
});

test("alMostrar recibe los parámetros de la ruta", async () => {
  const e = entornoConGancho("#/pedidos?pedido=3");
  await e.router.iniciar();
  assert.deepEqual(e.llamadas, [["#/pedidos", { pedido: "3" }]]);
});

test("una pantalla sin alMostrar se muestra igual", async () => {
  const e = entornoConGancho("#/inventario");
  await e.router.iniciar();
  assert.equal(e.router.rutaActual(), "#/inventario");
  assert.deepEqual(e.llamadas, []);
});

test("si alMostrar falla, el router no se rompe", async () => {
  const e = entornoConGancho("#/inicio");
  e.router.cargadores["#/pedidos"] = async () => ({
    montar(contenedor) {
      contenedor.append(new Elemento("h1", { activeElement: null }));
      return { alMostrar: () => { throw new Error("sin red"); } };
    },
  });
  await e.router.iniciar();
  await e.irA("#/pedidos");
  assert.equal(e.router.rutaActual(), "#/pedidos");
});

test("montar recibe los servicios del panel en su contexto", async () => {
  const e = entornoConGancho("#/inicio");
  await e.router.iniciar();
  assert.equal(e.contextos[0].servicios, e.servicios);
  assert.equal(e.contextos[0].rol, "ALMACEN");
  assert.equal(e.contextos[0].entrada.ruta, "#/inicio");
});

test("cada rol tiene su propio Inicio (distinto para cada rol) y el ADMIN su pantalla de auditoría", async () => {
  // T10: el marcador temporal ya no existe.
  const ventana = { location: { hash: "" }, history: {}, addEventListener() {} };
  const inicios = [];
  for (const rol of ["ADMIN", "VENDEDOR", "ALMACEN", "SOPORTE"]) {
    const router = crearPanelRouter({ rol, ventana, documento: {}, menu: null, area: null, mostrarToast() {} });
    inicios.push((await router.cargadores["#/inicio"]()).montar);
  }
  assert.ok(inicios.every((montar) => typeof montar === "function"));
  assert.equal(new Set(inicios).size, 4, "un Inicio propio por rol");
  const admin = crearPanelRouter({ rol: "ADMIN", ventana, documento: {}, menu: null, area: null, mostrarToast() {} });
  const auditoria = await admin.cargadores["#/auditoria"]();
  assert.equal(typeof auditoria.montar, "function");
  assert.notEqual(auditoria.montar, (await admin.cargadores["#/cuentas"]()).montar, "pantalla propia, no la de Administración");
});

// ---------- Ajuste c de T09: la pantalla sabe si su ruta sigue activa ----------

test("montar recibe estaVisible(): verdadero solo mientras su ruta es la actual", async () => {
  const documento = { title: "", activeElement: null, createElement: (t) => new Elemento(t, documento) };
  const area = new Elemento("main", documento);
  const oyentes = {};
  const ventana = {
    location: { hash: "#/pedidos", pathname: "/panel.html", search: "" },
    history: { replaceState() {} },
    addEventListener: (tipo, fn) => { oyentes[tipo] = fn; },
  };
  let estaVisible = null;
  const cargadores = {
    "#/pedidos": async () => ({ montar(c, contexto) { estaVisible = contexto.estaVisible; c.append(documento.createElement("h1")); } }),
    "#/inventario": async () => ({ montar(c) { c.append(documento.createElement("h1")); } }),
  };
  const router = crearPanelRouter({ rol: "ALMACEN", ventana, documento, menu: null, area, cargadores, mostrarToast() {} });
  await router.iniciar();
  assert.equal(estaVisible(), true);
  ventana.location.hash = "#/inventario";
  await oyentes.hashchange();
  assert.equal(estaVisible(), false);
});
