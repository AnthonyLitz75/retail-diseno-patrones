import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  configurarControladorPedidos,
  contarPedidosOperativos,
  filtrarPedidosOperativos,
} from "../../src/pedidos/pedidos-controlador.js";

// Mock mínimo de DOM si estamos en entorno Node.js
if (typeof document === "undefined") {
  class MockElement {
    constructor(tag) {
      this.tagName = tag.toUpperCase();
      this.className = "";
      this.children = [];
      this.textContent = "";
      this.hidden = false;
      this._eventos = {};
    }
    append(...nodes) {
      nodes.forEach((n) => this.children.push(n));
    }
    replaceChildren(...nodes) {
      this.children = [...nodes];
    }
    addEventListener(ev, cb) {
      if (!this._eventos[ev]) this._eventos[ev] = [];
      this._eventos[ev].push(cb);
    }
  }

  global.document = {
    createElement(tag) {
      return new MockElement(tag);
    },
    addEventListener() {},
  };
}

test("configurarControladorPedidos oculta la sección si no hay sesión", async () => {
  const seccion = global.document.createElement("section");
  const lista = global.document.createElement("div");

  const ctrl = configurarControladorPedidos({
    apiRequest: async () => ({ json: async () => [] }),
    obtenerEstado: () => ({ usuarioSesion: null }),
    elementos: {
      seccionPedidos: seccion,
      listaPedidos: lista,
    },
  });

  await ctrl.cargarPedidos();
  assert.equal(seccion.hidden, true);
});

test("configurarControladorPedidos consulta endpoint correspondiente según rol CLIENTE vs ALMACEN", async () => {
  const seccion = global.document.createElement("section");
  const titulo = global.document.createElement("h2");
  const estadoPedidos = global.document.createElement("div");
  const lista = global.document.createElement("div");

  let rutaConsultada = null;
  let rutas = [];
  const apiMock = async (ruta) => {
    rutas.push(ruta);
    rutaConsultada = rutas[0];
    return { json: async () => [] };
  };

  let rolActual = "CLIENTE";

  const ctrl = configurarControladorPedidos({
    apiRequest: apiMock,
    obtenerEstado: () => ({ usuarioSesion: { rol: rolActual } }),
    elementos: {
      seccionPedidos: seccion,
      tituloPedidos: titulo,
      estadoPedidos,
      listaPedidos: lista,
    },
  });

  // Rol CLIENTE
  await ctrl.cargarPedidos();
  assert.equal(seccion.hidden, false);
  assert.equal(rutaConsultada, "/api/pedidos/mis-pedidos");
  assert.deepEqual(rutas.slice(1).sort(), ["/api/devoluciones/mis-devoluciones", "/api/reclamos/mis-reclamos"],
    "El cliente también carga sus reclamos y devoluciones");
  assert.equal(titulo.textContent, "Mis pedidos");

  // Rol ALMACEN
  rolActual = "ALMACEN";
  rutas = [];
  await ctrl.cargarPedidos();
  assert.equal(rutaConsultada, "/api/pedidos/operativos");
  assert.equal(rutas.length, 1, "El personal no consulta atenciones de cliente");
  assert.equal(titulo.textContent, "Gestión operativa de pedidos");
});

test("contarPedidosOperativos y filtrarPedidosOperativos filtran por estado, #pedido y cliente", () => {
  const pedidos = [
    { idPedido: 12, estado: "PENDIENTE", clienteNombre: "María Pérez", clienteCorreo: "maria@ejemplo.com" },
    { idPedido: 15, estado: "EN_PREPARACION", clienteNombre: "Diego Salazar", clienteCorreo: "diego@ejemplo.com" },
    { idPedido: 18, estado: "PENDIENTE", clienteNombre: "Lucía Gómez", clienteCorreo: "lucia@ejemplo.com" },
  ];

  assert.deepEqual(contarPedidosOperativos(pedidos), {
    TODOS: 3,
    PENDIENTE: 2,
    EN_PREPARACION: 1,
    DESPACHADO: 0,
    ENTREGADO: 0,
  });

  assert.deepEqual(filtrarPedidosOperativos(pedidos, { estado: "PENDIENTE" }).map((p) => p.idPedido), [12, 18]);
  assert.deepEqual(filtrarPedidosOperativos(pedidos, { texto: "#15" }).map((p) => p.idPedido), [15]);
  assert.deepEqual(filtrarPedidosOperativos(pedidos, { estado: "PENDIENTE", texto: "perez" }).map((p) => p.idPedido), [12]);
});

test("ALMACEN aplica parámetros ?estado y ?pedido desde la barra de filtros y enfoca la tarjeta", async () => {
  class NodoConFiltros {
    constructor(tag) {
      this.tagName = tag.toUpperCase();
      this.className = "";
      this.children = [];
      this.textContent = "";
      this.hidden = false;
      this.value = "";
      this.id = "";
      this.dataset = {};
      this.atributos = new Map();
      this._eventos = {};
      this._hermanosAntes = [];
      this._enfocado = false;
      this.classList = {
        _set: new Set(),
        add: (...cls) => cls.forEach((c) => this.classList._set.add(c)),
        remove: (...cls) => cls.forEach((c) => this.classList._set.delete(c)),
        toggle: (c, force) => (force ? this.classList._set.add(c) : this.classList._set.delete(c)),
        contains: (c) => this.classList._set.has(c),
      };
    }
    append(...nodes) { this.children.push(...nodes); }
    replaceChildren(...nodes) { this.children = [...nodes]; }
    before(...nodes) { this._hermanosAntes.push(...nodes); }
    setAttribute(k, v) { this.atributos.set(k, String(v)); }
    getAttribute(k) { return this.atributos.get(k) ?? null; }
    addEventListener(ev, cb) {
      if (!this._eventos[ev]) this._eventos[ev] = [];
      this._eventos[ev].push(cb);
    }
    dispatch(ev) { for (const cb of this._eventos[ev] ?? []) cb({ type: ev }); }
    scrollIntoView() { this._enfocado = true; }
    querySelector(sel) {
      if (sel.startsWith("#")) {
        const idBuscado = sel.slice(1);
        const encontrar = (nodo) => {
          if (nodo.id === idBuscado) return nodo;
          for (const h of nodo.children ?? []) {
            const hallado = encontrar(h);
            if (hallado) return hallado;
          }
          return null;
        };
        return encontrar(this);
      }
      return null;
    }
  }

  const prevDoc = global.document;
  global.document = {
    createElement: (tag) => new NodoConFiltros(tag),
    addEventListener() {},
  };

  try {
    const seccion = new NodoConFiltros("section");
    const titulo = new NodoConFiltros("h2");
    const estadoPedidos = new NodoConFiltros("div");
    const lista = new NodoConFiltros("div");
    const pedidos = [
      { idPedido: 1, estado: "PENDIENTE", total: 50, clienteNombre: "Ana", creadoEn: "2026-11-25T10:00:00Z", productos: [] },
      { idPedido: 2, estado: "EN_PREPARACION", total: 80, clienteNombre: "Beto", creadoEn: "2026-11-25T11:00:00Z", productos: [] },
    ];

    const ctrl = configurarControladorPedidos({
      apiRequest: async () => ({ json: async () => pedidos }),
      obtenerEstado: () => ({ usuarioSesion: { rol: "ALMACEN" } }),
      elementos: { seccionPedidos: seccion, tituloPedidos: titulo, estadoPedidos, listaPedidos: lista },
    });

    await ctrl.cargarPedidos({ estado: "PENDIENTE", pedido: "1" });
    assert.equal(lista._hermanosAntes.length, 1);
    const barra = lista._hermanosAntes[0];
    assert.equal(barra.id, "barra-filtros-pedidos");
    assert.equal(lista.children.length, 1);
    assert.equal(lista.children[0].id, "pedido-1");
    assert.ok(lista.children[0].classList.contains("panel-consulta-enfocada"));
    assert.equal(lista.children[0]._enfocado, true);

    const tabPrep = barra.children[0].children.find((b) => b.dataset.estadoPedido === "EN_PREPARACION");
    tabPrep.dispatch("click");
    assert.equal(lista.children.length, 1);
    assert.equal(lista.children[0].id, "pedido-2");

    // Estado vacío filtrado con botón «Limpiar filtros»
    const tabEntregado = barra.children[0].children.find((b) => b.dataset.estadoPedido === "ENTREGADO");
    tabEntregado.dispatch("click");
    assert.equal(lista.children.length, 1);
    assert.equal(lista.children[0].className, "panel-recuadro-vacio");
    const btnLimpiar = lista.querySelector("#limpiar-filtros-pedidos");
    assert.ok(btnLimpiar);
    btnLimpiar.dispatch("click");
    assert.equal(lista.children.length, 2);
  } finally {
    global.document = prevDoc;
  }
});

test("cargarPedidos muestra estado de error con botón Reintentar ante fallo de red", async () => {
  class NodoError {
    constructor(tag) {
      this.tagName = tag.toUpperCase();
      this.className = "";
      this.children = [];
      this.textContent = "";
      this.hidden = false;
      this.atributos = new Map();
      this._eventos = {};
      this.classList = {
        add: () => {},
        remove: () => {},
      };
    }
    append(...nodes) { this.children.push(...nodes); }
    replaceChildren(...nodes) { this.children = [...nodes]; }
    setAttribute(k, v) { this.atributos.set(k, String(v)); }
    removeAttribute(k) { this.atributos.delete(k); }
    addEventListener(ev, cb) { (this._eventos[ev] ??= []).push(cb); }
    dispatch(ev) { for (const cb of this._eventos[ev] ?? []) cb({ type: ev }); }
  }

  const prevDoc = global.document;
  global.document = { createElement: (tag) => new NodoError(tag), addEventListener() {} };
  try {
    const seccion = new NodoError("section");
    const titulo = new NodoError("h2");
    const estadoPedidos = new NodoError("div");
    const lista = new NodoError("div");
    let intentos = 0;

    const ctrl = configurarControladorPedidos({
      apiRequest: async () => {
        intentos += 1;
        if (intentos === 1) throw new Error("Fallo de red");
        return { json: async () => [] };
      },
      obtenerEstado: () => ({ usuarioSesion: { rol: "ALMACEN" } }),
      elementos: { seccionPedidos: seccion, tituloPedidos: titulo, estadoPedidos, listaPedidos: lista },
    });

    await ctrl.cargarPedidos();
    assert.match(estadoPedidos.textContent, /No se pudieron cargar los pedidos\. Fallo de red/);
    assert.equal(lista.children[0].className, "panel-error");
    const btnReintentar = lista.children[0].children.find((n) => n.tagName === "BUTTON");
    assert.equal(btnReintentar.textContent, "Reintentar");

    btnReintentar.dispatch("click");
    await new Promise((resolve) => setTimeout(resolve, 10));
    assert.equal(intentos, 2);
  } finally {
    global.document = prevDoc;
  }
});

test("CLIENTE ve skeletons en Mis compras y estilos responsive de filtros", async () => {
  class NodoCli {
    constructor(tag) {
      this.tagName = tag.toUpperCase();
      this.className = "";
      this.children = [];
      this.textContent = "";
      this.hidden = false;
      this.atributos = new Map();
      this.classList = { add: () => {}, remove: () => {} };
    }
    append(...nodes) { this.children.push(...nodes); }
    replaceChildren(...nodes) { this.children = [...nodes]; }
    setAttribute(k, v) { this.atributos.set(k, String(v)); }
    removeAttribute(k) { this.atributos.delete(k); }
    addEventListener() {}
  }

  const prevDoc = global.document;
  global.document = { createElement: (tag) => new NodoCli(tag), addEventListener() {} };
  try {
    const seccion = new NodoCli("section");
    const estadoPedidos = new NodoCli("div");
    const lista = new NodoCli("div");
    let resolverApi;
    const promesaPendiente = new Promise((resolve) => { resolverApi = resolve; });

    const ctrl = configurarControladorPedidos({
      apiRequest: () => promesaPendiente,
      obtenerEstado: () => ({ usuarioSesion: { rol: "CLIENTE" } }),
      elementos: { seccionPedidos: seccion, estadoPedidos, listaPedidos: lista },
    });

    const carga = ctrl.cargarPedidos();
    assert.equal(lista.atributos.get("aria-busy"), "true");
    assert.equal(lista.children[0].className, "panel-esqueleto-lista");
    resolverApi({ json: async () => [] });
    await carga;
    assert.equal(lista.atributos.get("aria-busy"), undefined);

    const pedidosCss = readFileSync(new URL("../../src/css/pedidos.css", import.meta.url), "utf8");
    assert.match(pedidosCss, /\.filtro-pedido\s*\{[^}]*min-height:\s*44px/);
    assert.match(pedidosCss, /\.storefront \.panel-esqueleto-lista\s*\{/);
    assert.match(pedidosCss, /\.storefront \.panel-error\s*\{/);
  } finally {
    global.document = prevDoc;
  }
});
