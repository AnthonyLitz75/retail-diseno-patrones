// Revisión UX, arreglos medianos 6–9: cabecera móvil, menú "Gestionar",
// pestañas en Administración y kardex paginado.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
// Los módulos se importan antes de instalar el `document` falso: tarjeta-producto carga
// Bootstrap (vía notificaciones), que solo se registra en el DOM si `document` existe.
import { crearMenuAcciones } from "../../src/utilidades/menu-acciones.js";
import { crearPestanasSecciones } from "../../src/utilidades/pestanas-secciones.js";
import { accionesPersonalProducto } from "../../src/catalogo/componentes/tarjeta-producto.js";
import {
  crearControlesPaginacionKardex,
  textoEstadoKardex,
  MOVIMIENTOS_POR_PAGINA,
} from "../../src/inventario/inventario-vista.js";
import { paginarProductos } from "../../src/catalogo/componentes/filtros-catalogo.js";
import { renderizarHeader } from "../../src/layout/header.js";

// DOM mínimo con eventos, clases y foco; suficiente para los componentes de esta revisión.
class ElementoFalso {
  constructor(etiqueta) {
    this.tagName = etiqueta.toUpperCase();
    this.children = [];
    this.parent = null;
    this.attrs = {};
    this.oyentes = {};
    this.hidden = false;
    this.disabled = false;
    this.textContent = "";
    this.className = "";
    this.id = "";
    this.tabIndex = 0;
    const clases = new Set();
    this.classList = {
      add: (...c) => c.forEach((x) => clases.add(x)),
      remove: (...c) => c.forEach((x) => clases.delete(x)),
      contains: (c) => clases.has(c),
      toggle: (c, forzar) => {
        const poner = forzar === undefined ? !clases.has(c) : forzar;
        if (poner) clases.add(c);
        else clases.delete(c);
        return poner;
      },
    };
  }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getAttribute(k) { return this.attrs[k]; }
  append(...nodos) { for (const n of nodos) { n.parent = this; this.children.push(n); } }
  contains(otro) {
    for (let n = otro; n; n = n.parent) if (n === this) return true;
    return false;
  }
  addEventListener(tipo, fn) { (this.oyentes[tipo] ||= []).push(fn); }
  removeEventListener(tipo, fn) { this.oyentes[tipo] = (this.oyentes[tipo] || []).filter((f) => f !== fn); }
  emitir(tipo, extra = {}) {
    const evento = { target: this, stopPropagation() {}, preventDefault() {}, ...extra };
    for (const fn of [...(this.oyentes[tipo] || [])]) fn(evento);
  }
  focus() { globalThis.document.activeElement = this; }
}

const documentoFalso = {
  activeElement: null,
  oyentes: {},
  createElement: (t) => new ElementoFalso(t),
  addEventListener(tipo, fn) { (this.oyentes[tipo] ||= []).push(fn); },
  removeEventListener(tipo, fn) { this.oyentes[tipo] = (this.oyentes[tipo] || []).filter((f) => f !== fn); },
  emitir(tipo, evento) { for (const fn of [...(this.oyentes[tipo] || [])]) fn({ preventDefault() {}, ...evento }); },
};
globalThis.document = documentoFalso;


const leer = (ruta) => readFileSync(new URL(ruta, import.meta.url), "utf8");

// ---------- Punto 7: menú "Gestionar" ----------

function menuDePrueba() {
  const elegidas = [];
  const menu = crearMenuAcciones({
    nombreAccesible: "Gestionar Mouse M170",
    acciones: [
      { texto: "Editar ficha", alElegir: () => elegidas.push("ficha") },
      { texto: "Ajustar stock", alElegir: () => elegidas.push("stock") },
    ],
  });
  const [boton, lista] = menu.children;
  const items = lista.children.map((li) => li.children[0]);
  return { menu, boton, lista, items, elegidas };
}

test("el menú Gestionar empieza cerrado y es accesible", () => {
  const { boton, lista, items } = menuDePrueba();
  assert.equal(lista.hidden, true);
  assert.equal(boton.getAttribute("aria-haspopup"), "menu");
  assert.equal(boton.getAttribute("aria-expanded"), "false");
  assert.equal(boton.getAttribute("aria-controls"), lista.id);
  assert.equal(boton.getAttribute("aria-label"), "Gestionar Mouse M170");
  assert.equal(lista.getAttribute("role"), "menu");
  assert.deepEqual(items.map((i) => i.getAttribute("role")), ["menuitem", "menuitem"]);
});

test("abrir enfoca la primera opción y elegir ejecuta la acción y cierra", () => {
  const { boton, lista, items, elegidas } = menuDePrueba();
  boton.emitir("click");
  assert.equal(lista.hidden, false);
  assert.equal(boton.getAttribute("aria-expanded"), "true");
  assert.equal(document.activeElement, items[0]);

  items[1].emitir("click");
  assert.deepEqual(elegidas, ["stock"]);
  assert.equal(lista.hidden, true);
  assert.equal(boton.getAttribute("aria-expanded"), "false");
});

test("Escape cierra y devuelve el foco; las flechas recorren las opciones", () => {
  const { boton, lista, items } = menuDePrueba();
  boton.emitir("click");
  document.emitir("keydown", { key: "ArrowDown" });
  assert.equal(document.activeElement, items[1]);
  document.emitir("keydown", { key: "ArrowDown" });
  assert.equal(document.activeElement, items[0], "da la vuelta al final");
  document.emitir("keydown", { key: "Escape" });
  assert.equal(lista.hidden, true);
  assert.equal(document.activeElement, boton);
});

test("un clic fuera cierra el menú y suelta los oyentes del documento", () => {
  const { boton, lista } = menuDePrueba();
  const antes = (document.oyentes.click || []).length;
  boton.emitir("click");
  assert.equal((document.oyentes.click || []).length, antes + 1);
  document.emitir("click", { target: new ElementoFalso("div") });
  assert.equal(lista.hidden, true);
  assert.equal((document.oyentes.click || []).length, antes);
});

test("accionesPersonalProducto respeta los permisos de cada rol", () => {
  const llamadas = [];
  const callbacks = {
    onAbrirModalEditar: () => llamadas.push("ficha"),
    onAbrirModalPrecio: () => llamadas.push("precio"),
    onAbrirModalStock: () => llamadas.push("stock"),
    onCargarMovimientos: () => llamadas.push("movimientos"),
  };
  const producto = { id: 6, nombre: "Mouse inalámbrico M170" };

  const vendedor = accionesPersonalProducto(producto, { puedeGestionarInventario: true, puedeGestionarCatalogo: true, callbacks });
  assert.deepEqual(vendedor.map((a) => a.texto), ["Editar ficha", "Editar precio", "Ajustar stock", "Ver movimientos"]);
  vendedor.forEach((a) => a.alElegir());
  assert.deepEqual(llamadas, ["ficha", "precio", "stock", "movimientos"]);

  const almacen = accionesPersonalProducto(producto, { puedeGestionarInventario: true, callbacks });
  assert.deepEqual(almacen.map((a) => a.texto), ["Ajustar stock", "Ver movimientos"]);
  assert.deepEqual(accionesPersonalProducto(producto, {}), []);
});

// ---------- Punto 8: pestañas en Administración ----------

function seccion(id) {
  const el = new ElementoFalso("section");
  el.id = id;
  return el;
}

test("las pestañas muestran una sección a la vez", () => {
  const pestanas = crearPestanasSecciones({ etiquetaGrupo: "Secciones", prefijo: "p" });
  const [cuentas, reportes, incidencias] = [seccion("s-cuentas"), seccion("s-reportes"), seccion("s-incidencias")];
  pestanas.agregar({ id: "cuentas", etiqueta: "Cuentas", elemento: cuentas });
  pestanas.agregar({ id: "reportes", etiqueta: "Reportes", elemento: reportes });
  pestanas.agregar({ id: "incidencias", etiqueta: "Incidencias", elemento: incidencias });

  assert.equal(pestanas.element.getAttribute("role"), "tablist");
  assert.equal(pestanas.activa(), "cuentas", "la primera queda activa");
  assert.equal(cuentas.classList.contains("seccion-oculta"), false);
  assert.equal(reportes.classList.contains("seccion-oculta"), true);
  assert.equal(incidencias.classList.contains("seccion-oculta"), true);

  const [, botonReportes] = pestanas.element.children;
  assert.equal(botonReportes.getAttribute("role"), "tab");
  assert.equal(botonReportes.getAttribute("aria-controls"), "s-reportes");
  botonReportes.emitir("click");
  assert.equal(pestanas.activa(), "reportes");
  assert.equal(botonReportes.getAttribute("aria-selected"), "true");
  assert.equal(botonReportes.tabIndex, 0);
  assert.equal(cuentas.classList.contains("seccion-oculta"), true);
  assert.equal(reportes.classList.contains("seccion-oculta"), false);
  assert.equal(reportes.getAttribute("role"), "tabpanel");
});

test("las flechas, Inicio y Fin mueven la pestaña activa", () => {
  const pestanas = crearPestanasSecciones({ etiquetaGrupo: "Secciones" });
  for (const id of ["a", "b", "c"]) pestanas.agregar({ id, etiqueta: id, elemento: seccion(`s-${id}`) });
  pestanas.element.emitir("keydown", { key: "ArrowLeft" });
  assert.equal(pestanas.activa(), "c", "desde la primera vuelve a la última");
  pestanas.element.emitir("keydown", { key: "Home" });
  assert.equal(pestanas.activa(), "a");
  pestanas.element.emitir("keydown", { key: "End" });
  assert.equal(pestanas.activa(), "c");
  assert.equal(document.activeElement, pestanas.element.children[2]);
});

test("Administración arma las pestañas e incluye Incidencias", () => {
  const plantilla = leer("../../src/layout/plantillas/administracion.html");
  for (const id of ["cuentas", "categorias", "reportes"]) {
    assert.ok(plantilla.includes(`id="admin-seccion-${id}"`), id);
  }
  assert.ok(!plantilla.includes("<hr>"), "sin separadores entre secciones");
  const main = leer("../../src/main.js");
  assert.match(main, /panelAdministracion\.agregarSeccion\(\{\s*id: "incidencias"/);
});

// ---------- Punto 9: kardex ----------

test("el kardex pagina de 10 en 10 y describe el rango", () => {
  assert.equal(MOVIMIENTOS_POR_PAGINA, 10);
  const movimientos = Array.from({ length: 35 }, (_, i) => ({ id: i }));
  const pagina1 = paginarProductos(movimientos, 1, MOVIMIENTOS_POR_PAGINA);
  assert.equal(pagina1.items.length, 10);
  assert.equal(textoEstadoKardex(pagina1), "35 movimientos · mostrando 1–10");
  const pagina4 = paginarProductos(movimientos, 4, MOVIMIENTOS_POR_PAGINA);
  assert.equal(pagina4.items.length, 5);
  assert.equal(textoEstadoKardex(paginarProductos([{}], 1, 10)), "1 movimiento");
  assert.equal(textoEstadoKardex(paginarProductos([], 1, 10)), "No hay movimientos para esos filtros.");
});

test("los controles del kardex se desactivan en los extremos y cambian de página", () => {
  const movimientos = Array.from({ length: 25 }, (_, i) => i);
  const paginas = [];
  const [anterior, indicador, siguiente] = crearControlesPaginacionKardex(
    paginarProductos(movimientos, 1, 10),
    (p) => paginas.push(p),
  );
  assert.equal(anterior.disabled, true);
  assert.equal(siguiente.disabled, false);
  assert.equal(indicador.textContent, "Página 1 de 3");
  siguiente.emitir("click");
  assert.deepEqual(paginas, [2]);

  const [, , ultimaSiguiente] = crearControlesPaginacionKardex(paginarProductos(movimientos, 3, 10), () => {});
  assert.equal(ultimaSiguiente.disabled, true);
});

test("la tabla del kardex tiene contenedor de paginación y cabecera sin '(ID)'", () => {
  const layout = leer("../../src/layout/catalogo-layout.js");
  assert.ok(layout.includes('id="paginacion-movimientos"'));
  assert.ok(!layout.includes("Responsable (ID)"));
  assert.ok(leer("../../src/main.js").includes('paginacionMovimientos: document.querySelector("#paginacion-movimientos")'));
});

// ---------- Punto 6: cabecera móvil ----------

test("la cabecera conserva el texto de Cerrar sesión para lectores y suma un icono", () => {
  const html = renderizarHeader();
  assert.match(html, /id="cerrar-sesion"[^>]*header-btn-salir/);
  assert.match(html, /class="header-btn-texto">Cerrar sesión</);
  assert.match(html, /header-btn-salir-icono[^>]*aria-hidden="true"/);

  const css = leer("../../src/css/header.css");
  const movil = css.slice(css.lastIndexOf("@media (max-width: 575.98px)"));
  assert.match(movil, /#usuario-activo,\s*\.header-btn-texto \{[^}]*clip: rect\(0, 0, 0, 0\)/);
  assert.match(movil, /\.header-brand-subtitle,\s*#enlace-registro \{\s*display: none !important;/);
});
