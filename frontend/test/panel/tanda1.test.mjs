// Panel del personal, tanda 1 de arreglos tras el informe de pruebas manuales:
// F1 categorías del formulario, F2 <h1> por pantalla, F3 foco inicial, F4 foco del cajón,
// F5–F7 reglas CSS acotadas, F8 plurales.
import test from "node:test";
import assert from "node:assert/strict";
import { leerCssPanel } from "./util-css.mjs";
import { cargarCategoriasProducto } from "../../src/panel/categorias-producto.js";
import { encabezadoPantalla } from "../../src/panel/pantallas/titulo-pantalla.js";
import { MENU_POR_ROL } from "../../src/panel/menu-por-rol.js";
import { crearCajonMenu } from "../../src/panel/cajon-menu.js";
import { plural } from "../../src/panel/utilidades-panel.js";

const css = leerCssPanel();

// ---------- F1 ----------

function crearSelector() {
  return {
    value: "",
    opciones: [],
    replaceChildren(...hijos) { this.opciones = [...hijos]; },
    append(...hijos) { this.opciones.push(...hijos); },
  };
}
const crearOpcion = (texto, valor) => ({ texto, valor });

test("F1: el selector queda con «Selecciona una categoría» y una opción por categoría (value = nombre)", async () => {
  const selector = crearSelector();
  const pedidas = [];
  await cargarCategoriasProducto({
    apiRequest: async (url) => { pedidas.push(url); return { json: async () => [{ nombre: "Audio" }, { nombre: "Teclados" }] }; },
    selector, crearOpcion, mostrarToast() {},
  });
  assert.deepEqual(pedidas, ["/api/categorias"]);
  assert.deepEqual(selector.opciones, [
    { texto: "Selecciona una categoría", valor: "" },
    { texto: "Audio", valor: "Audio" },
    { texto: "Teclados", valor: "Teclados" },
  ]);
});

test("F1: cada carga rehace la lista (salen las categorías recién creadas) y conserva la elegida si sigue", async () => {
  const selector = crearSelector();
  let datos = [{ nombre: "Audio" }];
  const apiRequest = async () => ({ json: async () => datos });
  await cargarCategoriasProducto({ apiRequest, selector, crearOpcion, mostrarToast() {} });
  selector.value = "Audio";
  datos = [{ nombre: "Audio" }, { nombre: "Nueva" }];
  await cargarCategoriasProducto({ apiRequest, selector, crearOpcion, mostrarToast() {} });
  assert.deepEqual(selector.opciones.map((o) => o.valor), ["", "Audio", "Nueva"]);
  assert.equal(selector.value, "Audio");
});

test("F1: si la carga falla, avisa con un toast y el selector queda solo con su opción por defecto", async () => {
  const selector = crearSelector();
  selector.opciones = [{ texto: "viejo", valor: "viejo" }];
  const avisos = [];
  await cargarCategoriasProducto({
    apiRequest: async () => { throw new Error("sin red"); },
    selector, crearOpcion, mostrarToast: (m, tipo) => avisos.push([m, tipo]),
  });
  assert.deepEqual(selector.opciones, [{ texto: "Selecciona una categoría", valor: "" }]);
  assert.equal(avisos.length, 1);
  assert.equal(avisos[0][1], "error");
});

test("F1: sin selector en la página no hace nada ni falla", async () => {
  await cargarCategoriasProducto({ apiRequest: async () => assert.fail("no debe pedir"), selector: null, crearOpcion, mostrarToast() {} });
});

// ---------- F2 ----------

test("F2: cada pantalla con módulo propio tiene un <h1> con el nombre de su ítem del menú", () => {
  const rutas = ["#/pedidos", "#/productos", "#/consultas", "#/inventario"];
  const vistos = [];
  for (const [rol, grupos] of Object.entries(MENU_POR_ROL)) {
    for (const { entradas } of grupos) {
      for (const entrada of entradas.filter((e) => rutas.includes(e.ruta))) {
        const html = String(encabezadoPantalla(entrada));
        assert.match(html, /^<h1 class="panel-titulo">/, `${rol} ${entrada.ruta}`);
        assert.ok(html.includes(`>${entrada.etiqueta}</h1>`), `${rol} ${entrada.ruta}: ${html}`);
        vistos.push(`${rol}${entrada.ruta}:${entrada.etiqueta}`);
      }
    }
  }
  for (const esperado of ["ALMACEN#/pedidos:Pedidos por atender", "VENDEDOR#/pedidos:Pedidos", "ADMIN#/pedidos:Pedidos", "VENDEDOR#/inventario:Inventario",
    "ALMACEN#/inventario:Inventario y kardex", "ADMIN#/inventario:Inventario y kardex", "VENDEDOR#/consultas:Consultas de clientes", "VENDEDOR#/productos:Productos", "ADMIN#/productos:Productos"]) {
    assert.ok(vistos.includes(esperado), esperado);
  }
});

test("F2: panel.css oculta los títulos propios (h2) de pedidos, inventario, productos y consultas, acotado al panel", () => {
  for (const id of ["titulo-pedidos", "titulo-inventario", "titulo-formulario", "titulo-preguntas-vendedor"]) {
    assert.match(css, new RegExp(`\\.panel-pagina[^{}]*#${id}[^{}]*\\{[^}]*display:\\s*none`), id);
  }
});

// ---------- F3 (CSS; la lógica del router está en panel-router.test.mjs) ----------

test("F3: un <h1 tabindex=-1> enfocado por código no dibuja contorno", () => {
  assert.match(css, /h1\[tabindex="-1"\]:focus[^{}]*\{[^}]*outline:\s*none/);
  assert.match(css, /h1\[tabindex="-1"\]:focus-visible[^{}]*\{[^}]*outline:\s*none/);
});

// ---------- F4 ----------

class Elemento {
  constructor(etiqueta, documento) {
    this.tagName = etiqueta.toUpperCase(); this.documento = documento; this.children = []; this.parent = null;
    this.atributos = new Map(); this.dataset = {}; this.oyentes = {}; this.visible = true;
  }
  append(...hijos) { for (const h of hijos) { h.parent = this; this.children.push(h); } }
  setAttribute(k, v) { this.atributos.set(k, String(v)); }
  getAttribute(k) { return this.atributos.has(k) ? this.atributos.get(k) : null; }
  addEventListener(tipo, fn) { (this.oyentes[tipo] ??= []).push(fn); }
  // Como un navegador: un elemento con visibility:hidden no recibe el foco.
  focus() { if (this.visible && this.cadenaVisible()) this.documento.activeElement = this; }
  cadenaVisible() { for (let n = this; n; n = n.parent) if (n.visible === false) return false; return true; }
  contains(otro) { for (let n = otro; n; n = n.parent) if (n === this) return true; return false; }
  *todos() { for (const h of this.children) { yield h; yield* h.todos(); } }
  querySelectorAll(selector) {
    return selector === "a[href]" ? [...this.todos()].filter((n) => n.tagName === "A" && n.getAttribute("href")) : [];
  }
}

function entornoCajon() {
  const documento = { activeElement: null, addEventListener() {}, removeEventListener() {} };
  const boton = new Elemento("button", documento);
  const menu = new Elemento("nav", documento);
  menu.id = "panel-menu";
  const enlaces = ["#/inicio", "#/pedidos"].map((ruta) => { const a = new Elemento("a", documento); a.setAttribute("href", ruta); menu.append(a); return a; });
  // El cajón empieza oculto (visibility:hidden) y solo es visible cuando pasa un frame tras abrir.
  menu.visible = false;
  const frames = [];
  const esperas = [];
  const cajon = crearCajonMenu({
    boton, menu, documento,
    siguienteFrame: (fn) => frames.push(fn),
    esperar: (fn, ms) => esperas.push({ fn, ms }),
  });
  return { documento, boton, menu, enlaces, cajon, frames, esperas, pasarFrame: () => { menu.visible = true; frames.splice(0).forEach((f) => f()); } };
}

test("F4: el foco no se pide antes de que el cajón sea visible; va a la primera entrada cuando lo es", () => {
  const e = entornoCajon();
  e.cajon.abrir();
  assert.notEqual(e.documento.activeElement, e.enlaces[0], "en el mismo instante el cajón aún está oculto: el foco no puede ir");
  assert.equal(e.frames.length, 1, "el foco se programa para el siguiente frame");
  e.pasarFrame();
  assert.equal(e.documento.activeElement, e.enlaces[0]);
});

test("F4: si el frame llega y el cajón aún no es visible, reintenta con un respaldo temporizado", () => {
  const e = entornoCajon();
  e.cajon.abrir();
  e.frames.splice(0).forEach((f) => f()); // el frame pasa pero la transición aún no lo hizo visible
  assert.notEqual(e.documento.activeElement, e.enlaces[0]);
  assert.ok(e.esperas.length >= 1, "hay un respaldo");
  e.menu.visible = true;
  e.esperas.splice(0).forEach(({ fn }) => fn());
  assert.equal(e.documento.activeElement, e.enlaces[0]);
});

test("F4: si se cierra antes del frame, no se mueve el foco", () => {
  const e = entornoCajon();
  e.cajon.abrir();
  e.cajon.cerrar({ devolverFoco: false });
  e.pasarFrame();
  assert.notEqual(e.documento.activeElement, e.enlaces[0]);
});

// ---------- F5, F6, F7 ----------

test("F5: la tarjeta de contexto del pedido consultado se oculta fuera de #/consulta-pedido", () => {
  // La tarjeta de contexto es el único hijo directo de #vista-soporte sin data-bandeja.
  for (const ruta of ["reclamos", "devoluciones"]) {
    assert.match(css, new RegExp(`data-ruta-soporte="${ruta}"\\][^{}]*>\\s*section:not\\(\\[data-bandeja\\]\\)[^{}]*\\{[^}]*display:\\s*none`), ruta);
  }
});

test("F6: los contenedores con desplazamiento del panel son position: relative", () => {
  assert.match(css, /\.panel-tabla-contenedor\s*\{[^}]*position:\s*relative/);
  assert.match(css, /\.panel-pagina \.table-responsive\s*\{[^}]*position:\s*relative/);
});

test("F8: textos con número de los Inicios en singular con 1 y en plural con 0 y 2", async () => {
  const { filasAtencion, indicadoresAdmin } = await import("../../src/panel/inicio/admin-logica.js");
  const fila = (resumen, productos) => filasAtencion({ resumen, productos }).filas.map((f) => f.texto);
  assert.deepEqual(fila({ escalados: 1, pedidosPorEstado: { EN_PREPARACION: 1 } }, [{ stock: 1, activo: true }]), ["1 reclamo escalado", "1 producto con stock bajo", "1 pedido en preparación"]);
  assert.deepEqual(fila({ escalados: 2, pedidosPorEstado: { EN_PREPARACION: 2 } }, [{ stock: 1, activo: true }, { stock: 2, activo: true }]), ["2 reclamos escalados", "2 productos con stock bajo", "2 pedidos en preparación"]);
  const nota = (u, p) => indicadoresAdmin({ unidadesEnStock: u, productosActivos: p }).at(3).detalle;
  assert.equal(nota(1, 1), "1 unidad · 1 producto");
  assert.equal(nota(529, 32), "529 unidades · 32 productos");
  assert.equal(nota(0, 0), "0 unidades · 0 productos");
  const al = await import("../../src/panel/inicio/almacen-logica.js");
  assert.equal(al.detallePorPreparar(1, 1), "1 pendiente · 1 en preparación");
  assert.equal(al.detallePorPreparar(0, 2), "0 pendientes · 2 en preparación");
  assert.equal(al.detalleProductosActivos(1), "1 producto activo");
  assert.equal(al.detalleProductosActivos(32), "32 productos activos");
  assert.equal(al.etiquetaStock(1).texto, "1 unidad");
  assert.equal(al.etiquetaStock(3).texto, "3 unidades");
  assert.equal(al.resumenArticulos({ productos: [{ nombreProducto: "A", cantidad: 1 }, { nombreProducto: "B", cantidad: 1 }] }), "2 artículos");
  assert.equal(al.resumenArticulos({ productos: [{ nombreProducto: "A", cantidad: 3 }] }), "A × 3");
  const so = await import("../../src/panel/inicio/soporte-logica.js");
  assert.equal(so.productoDevolucion({ lineas: [{ nombreProducto: "A" }, { nombreProducto: "B" }] }), "2 productos");
  const ve = await import("../../src/panel/inicio/vendedor-logica.js");
  assert.equal(ve.textoVerStockBajo(1), "Ver el producto");
  assert.equal(ve.textoVerStockBajo(4), "Ver los 4");
});

test("F7: la tabla de líneas de la bandeja de devoluciones se desplaza dentro de su tarjeta", () => {
  assert.match(css, /data-bandeja="devoluciones"\][^{}]*table[^{}]*\{[^}]*overflow-x:\s*auto/);
});

// ---------- F8 ----------

test("F8: plural elige singular con 1 y plural con 0 y 2", () => {
  assert.equal(plural(0, "reclamo escalado", "reclamos escalados"), "0 reclamos escalados");
  assert.equal(plural(1, "reclamo escalado", "reclamos escalados"), "1 reclamo escalado");
  assert.equal(plural(2, "reclamo escalado", "reclamos escalados"), "2 reclamos escalados");
  assert.equal(plural(1, "unidad", "unidades"), "1 unidad");
  assert.equal(plural(5, "unidad", "unidades"), "5 unidades");
});
