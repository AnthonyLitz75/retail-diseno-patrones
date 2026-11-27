import test from "node:test";
import assert from "node:assert/strict";
import {
  crearFilaMovimientoKardex,
  poblarSelectoresInventario,
  cargarMovimientosProducto,
  configurarPanelInventario,
} from "../../src/inventario/inventario-vista.js";

// Mock mínimo de DOM si estamos en entorno Node.js
if (typeof document === "undefined") {
  class MockElement {
    constructor(tag) {
      this.tagName = tag.toUpperCase();
      this.className = "";
      this.style = {};
      this.classList = {
        _classes: new Set(),
        add(...cls) {
          cls.forEach((c) => this._classes.add(c));
        },
        remove(...cls) {
          cls.forEach((c) => this._classes.delete(c));
        },
        contains(cls) {
          return this._classes.has(cls);
        },
      };
      this.children = [];
      this.dataset = {};
      this.textContent = "";
      this.value = "";
      this.hidden = false;
      this.disabled = false;
    }
    append(...nodes) {
      nodes.forEach((n) => this.children.push(n));
    }
    replaceChildren(...nodes) {
      this.children = [...nodes];
    }
    remove() {
      // noop
    }
    addEventListener() {}
    querySelector() {
      return new MockElement("div");
    }
    querySelectorAll() {
      return [];
    }
    reset() {
      this.value = "";
    }
  }

  global.document = {
    createElement(tag) {
      return new MockElement(tag);
    },
    addEventListener() {},
  };
}

test("crearFilaMovimientoKardex genera fila <tr> con formato de fecha, producto y cantidad firmada", () => {
  const movimientoEntrada = {
    productoId: 10,
    tipo: "ENTRADA",
    motivo: "Compra a proveedor",
    responsableId: 1,
    cantidadFirmada: 15,
    fecha: "2026-11-06T10:00:00Z",
  };
  const productos = [{ id: 10, nombre: "Laptop Gamer Asus ROG" }];

  const fila = crearFilaMovimientoKardex(movimientoEntrada, productos);
  assert.equal(fila.tagName, "TR");
  assert.equal(fila.children.length, 6);

  // Columna 1: Fecha
  assert.ok(fila.children[0].textContent.length > 0);
  // Columna 2: Producto (nombre mapeado)
  assert.equal(fila.children[1].textContent, "Laptop Gamer Asus ROG");
  // Columna 3: Tipo
  assert.equal(fila.children[2].textContent, "ENTRADA");
  // Columna 4: Motivo
  assert.equal(fila.children[3].textContent, "Compra a proveedor");
  // Columna 5: Responsable
  assert.equal(fila.children[4].textContent, "Usuario #1");
  // Columna 6: Cantidad con signo '+'
  assert.equal(fila.children[5].textContent, "+15");

  // Etiquetas de columna para tabla apilable en móvil
  assert.deepEqual(
    fila.children.map((td) => td.dataset.etiqueta),
    ["Fecha", "Producto", "Movimiento", "Motivo", "Responsable", "Cantidad"],
  );

  // Caso con cantidad negativa (SALIDA)
  const movimientoSalida = {
    productoId: 99, // Desconocido en lista
    tipo: "VENTA",
    motivo: "Pedido #105",
    responsableId: null,
    cantidadFirmada: -3,
    fecha: "2026-11-06T11:00:00Z",
  };
  const filaSalida = crearFilaMovimientoKardex(movimientoSalida, productos);
  assert.equal(filaSalida.children[1].textContent, "Producto #99");
  assert.equal(filaSalida.children[4].textContent, "Sistema");
  assert.equal(filaSalida.children[5].textContent, "-3");
});

test("poblarSelectoresInventario llena los elementos <select> preservando valor previo si existe", () => {
  const selectorFiltro = global.document.createElement("select");
  const selectorEntrada = global.document.createElement("select");
  selectorFiltro.value = "2"; // Existirá

  const productos = [
    { id: 1, nombre: "Mouse Inalámbrico" },
    { id: 2, nombre: "Teclado Mecánico" },
  ];

  poblarSelectoresInventario(productos, [selectorFiltro, selectorEntrada], selectorEntrada);

  // selectorFiltro tiene opción 'Todos' + 2 productos
  assert.equal(selectorFiltro.children.length, 3);
  assert.equal(selectorFiltro.children[0].textContent, "Todos");
  assert.equal(selectorFiltro.value, "2"); // Preserva valor

  // selectorEntrada tiene 'Selecciona un producto' + 2 productos
  assert.equal(selectorEntrada.children.length, 3);
  assert.equal(selectorEntrada.children[0].textContent, "Selecciona un producto");
});

test("poblarSelectoresInventario incluye el stock actual en la etiqueta cuando está disponible", () => {
  const selectorEntrada = global.document.createElement("select");
  const productos = [
    { id: 1, nombre: "Mouse Lift", stock: 0 },
    { id: 2, nombre: "Cargador GaN", stock: 4 },
  ];

  poblarSelectoresInventario(productos, [selectorEntrada], selectorEntrada);

  assert.equal(selectorEntrada.children[1].textContent, "Mouse Lift (stock: 0)");
  assert.equal(selectorEntrada.children[2].textContent, "Cargador GaN (stock: 4)");
});

test("iniciarPanelInventario preselecciona el producto recibido por parámetro", async () => {
  const seccionInventario = global.document.createElement("section");
  const seccionEntrada = global.document.createElement("div");
  const selectorProducto = global.document.createElement("select");

  const panel = configurarPanelInventario({
    apiRequest: async (url) => ({
      json: async () => (url === "/api/productos"
        ? [{ id: 1, nombre: "Mouse Lift", stock: 0 }, { id: 7, nombre: "Webcam C922", stock: 2 }]
        : []),
    }),
    obtenerEstado: () => ({ usuarioSesion: { rol: "ALMACEN" }, productosInventario: [] }),
    mostrarToast: () => {},
    elementos: {
      seccionInventario,
      seccionEntradaInventario: seccionEntrada,
      selectorProductoMovimientos: selectorProducto,
    },
  });

  await panel.iniciarPanelInventario({ producto: "7" });
  assert.equal(selectorProducto.value, "7");
});

test("cargarMovimientosProducto maneja respuestas con movimientos y vacías", async () => {
  const contenedor = global.document.createElement("div");
  const producto = { id: 5, nombre: "Monitor 27" };

  // Caso 1: Con movimientos
  const apiMock = async () => ({
    json: async () => [
      {
        tipo: "ENTRADA",
        cantidadFirmada: 10,
        motivo: "Stock inicial",
        fecha: "2026-11-06T09:00:00Z",
      },
    ],
  });

  await cargarMovimientosProducto(producto, contenedor, apiMock);
  // Debe contener h2 (título) y ul (lista)
  assert.ok(contenedor.children.some((el) => el.tagName === "UL"));
  const lista = contenedor.children.find((el) => el.tagName === "UL");
  assert.equal(lista.children.length, 1);
  assert.ok(lista.children[0].textContent.includes("+10 unidades"));

  // Caso 2: Sin movimientos
  const apiVaciaMock = async () => ({
    json: async () => [],
  });
  await cargarMovimientosProducto(producto, contenedor, apiVaciaMock);
  assert.ok(
    contenedor.children.some((el) =>
      el.textContent.includes("Este producto todavía no tiene movimientos."),
    ),
  );
});

test("configurarPanelInventario expone funciones y valida visibilidad según rol", async () => {
  const seccionInventario = global.document.createElement("section");
  const seccionEntrada = global.document.createElement("div");
  let rolActual = "CLIENTE";

  const panel = configurarPanelInventario({
    apiRequest: async () => ({ json: async () => [] }),
    obtenerEstado: () => ({ usuarioSesion: { rol: rolActual }, productosInventario: [] }),
    mostrarToast: () => {},
    elementos: {
      seccionInventario,
      seccionEntradaInventario: seccionEntrada,
    },
  });

  assert.equal(typeof panel.iniciarPanelInventario, "function");
  assert.equal(typeof panel.cargarMovimientosInventario, "function");

  // Rol CLIENTE no tiene acceso
  await panel.iniciarPanelInventario();
  assert.equal(seccionInventario.hidden, true);

  // Rol ALMACEN sí tiene acceso
  rolActual = "ALMACEN";
  await panel.iniciarPanelInventario();
  assert.equal(seccionInventario.hidden, false);
  assert.equal(seccionEntrada.hidden, false);
});

test("kardex muestra vacío con Limpiar filtros, error con Reintentar y validación inline al registrar entrada", async () => {
  class NodoInv {
    constructor(tag) {
      this.tagName = tag.toUpperCase();
      this.className = "";
      this.style = {};
      this.children = [];
      this.dataset = {};
      this.textContent = "";
      this.value = "";
      this.hidden = false;
      this.disabled = false;
      this.colSpan = 1;
      this.focused = false;
      this.atributos = new Map();
      this._eventos = {};
      this._consultas = new Map();
      this.classList = {
        _set: new Set(),
        add: (...cls) => cls.forEach((c) => this.classList._set.add(c)),
        remove: (...cls) => cls.forEach((c) => this.classList._set.delete(c)),
        contains: (c) => this.classList._set.has(c),
      };
    }
    append(...nodes) { this.children.push(...nodes); }
    replaceChildren(...nodes) { this.children = [...nodes]; }
    setAttribute(k, v) { this.atributos.set(k, String(v)); }
    getAttribute(k) { return this.atributos.get(k) ?? null; }
    removeAttribute(k) { this.atributos.delete(k); }
    focus() { this.focused = true; }
    reset() { this.children.forEach((c) => { c.value = ""; }); }
    addEventListener(ev, cb) { (this._eventos[ev] ??= []).push(cb); }
    dispatch(ev) {
      for (const cb of this._eventos[ev] ?? []) {
        cb({ type: ev, preventDefault() {} });
      }
    }
    querySelector(sel) { return this._consultas.get(sel) ?? null; }
  }

  const prevDoc = global.document;
  global.document = { createElement: (tag) => new NodoInv(tag) };

  try {
    const seccionInventario = new NodoInv("section");
    const seccionEntrada = new NodoInv("div");
    const formEntrada = new NodoInv("form");
    const selProdEntrada = new NodoInv("select");
    const inputCant = new NodoInv("input");
    const inputMotivo = new NodoInv("input");
    const errProd = new NodoInv("div");
    const errCant = new NodoInv("div");
    const errMotivo = new NodoInv("div");
    const btnSubmit = new NodoInv("button");
    btnSubmit.textContent = "Registrar entrada";
    formEntrada.append(selProdEntrada, inputCant, inputMotivo, btnSubmit);
    formEntrada._consultas.set("[data-campo-entrada=\"producto\"]", errProd);
    formEntrada._consultas.set("[data-campo-entrada=\"cantidad\"]", errCant);
    formEntrada._consultas.set("[data-campo-entrada=\"motivo\"]", errMotivo);
    formEntrada._consultas.set("button[type=\"submit\"]", btnSubmit);

    const estadoEntrada = new NodoInv("p");
    const selProdFiltro = new NodoInv("select");
    selProdFiltro.value = "7";
    const estadoMovimientos = new NodoInv("p");
    const tablaKardex = new NodoInv("table");
    const listaMovimientos = new NodoInv("tbody");
    listaMovimientos.closest = (sel) => (sel === "table" ? tablaKardex : null);

    let fallarMovimientos = true;
    const postBodies = [];
    const panel = configurarPanelInventario({
      apiRequest: async (url, opciones = {}) => {
        if (opciones.method === "POST") {
          postBodies.push(opciones.json);
          return { json: async () => ({}) };
        }
        if (url === "/api/productos") {
          return { json: async () => [{ id: 7, nombre: "Webcam C922", stock: 2 }] };
        }
        if (fallarMovimientos) throw new Error("Kardex caído");
        return { json: async () => [] };
      },
      obtenerEstado: () => ({ usuarioSesion: { rol: "ALMACEN" }, productosInventario: [{ id: 7, nombre: "Webcam C922", stock: 2 }] }),
      mostrarToast: () => {},
      elementos: {
        seccionInventario,
        seccionEntradaInventario: seccionEntrada,
        formularioEntradaInventario: formEntrada,
        selectorProductoEntrada: selProdEntrada,
        cantidadEntrada: inputCant,
        motivoEntrada: inputMotivo,
        estadoEntradaInventario: estadoEntrada,
        selectorProductoMovimientos: selProdFiltro,
        estadoMovimientos,
        listaMovimientos,
      },
    });

    // Error con Reintentar
    await panel.cargarMovimientosInventario();
    assert.ok(tablaKardex.classList.contains("tabla-apilable"));
    assert.match(estadoMovimientos.textContent, /No se pudieron cargar los movimientos/);
    const cajaError = listaMovimientos.children[0].children[0].children[0];
    assert.match(cajaError.className, /\bpanel-error\b/);
    const btnReintentar = cajaError.children.find((n) => n.tagName === "BUTTON");

    fallarMovimientos = false;
    btnReintentar.dispatch("click");
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Vacío con filtro activo -> Limpiar filtros
    const cajaVacio = listaMovimientos.children[0].children[0].children[0];
    assert.match(cajaVacio.className, /\bpanel-recuadro-vacio\b/);
    const btnLimpiar = cajaVacio.children.find((n) => n.id === "limpiar-filtros-movimientos");
    assert.ok(btnLimpiar);
    btnLimpiar.dispatch("click");
    await new Promise((resolve) => setTimeout(resolve, 10));
    assert.equal(selProdFiltro.value, "");

    // Validación inline en formulario de entrada
    formEntrada.dispatch("submit");
    assert.equal(postBodies.length, 0);
    assert.equal(selProdEntrada.getAttribute("aria-invalid"), "true");
    assert.ok(selProdEntrada.classList.contains("is-invalid"));
    assert.equal(selProdEntrada.focused, true);
    assert.equal(errProd.textContent, "Selecciona un producto.");

    selProdEntrada.value = "7";
    inputCant.value = "5";
    inputMotivo.value = "Reposición urgente";
    formEntrada.dispatch("submit");
    await new Promise((resolve) => setTimeout(resolve, 10));
    assert.equal(postBodies.length, 1);
    assert.equal(btnSubmit.textContent, "Registrar entrada");
    assert.equal(btnSubmit.disabled, false);
  } finally {
    global.document = prevDoc;
  }
});
