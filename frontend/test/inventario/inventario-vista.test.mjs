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
