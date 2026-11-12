// Revisión UX, arreglos rápidos 1–5 (cuentas en móvil, avance del pedido en móvil,
// botón de WhatsApp, mensaje de carga del catálogo e imagen de respaldo).
import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { renderizarCatalogoLayout } from "../src/layout/catalogo-layout.js";
import {
  asignarImagenConRespaldo,
  IMAGEN_PLACEHOLDER_DEFECTO,
} from "../src/catalogo/imagen-producto.js";
import { etiquetarCeldas } from "../src/utilidades/tabla-apilable.js";

const leer = (ruta) => readFileSync(new URL(ruta, import.meta.url), "utf8");

test("el estado del catálogo usa el mismo id en la plantilla y en quien lo actualiza", () => {
  const html = renderizarCatalogoLayout();
  assert.match(html, /id="estado-catalogo"[^>]*role="status"/);
  assert.doesNotMatch(html, /id="estado"/);

  const main = leer("../src/main.js");
  const vista = leer("../src/catalogo/catalogo-vista.js");
  assert.ok(main.includes('querySelector("#estado-catalogo")'));
  assert.ok(vista.includes('querySelector("#estado-catalogo")'));
  assert.ok(!vista.includes('querySelector("#estado")'));
});

test("asignarImagenConRespaldo cambia a placeholder una sola vez si la imagen falla", () => {
  const img = { src: "", onerror: null };
  asignarImagenConRespaldo(img, "/img/productos/no-existe.png");
  assert.equal(img.src, "/img/productos/no-existe.png");
  assert.equal(typeof img.onerror, "function");

  img.onerror();
  assert.equal(img.src, IMAGEN_PLACEHOLDER_DEFECTO);
  assert.equal(img.onerror, null, "no debe reintentar en bucle si el placeholder también falla");
});

test("asignarImagenConRespaldo usa el placeholder cuando no hay URL", () => {
  const img = { src: "", onerror: null };
  asignarImagenConRespaldo(img, "");
  assert.equal(img.src, IMAGEN_PLACEHOLDER_DEFECTO);
});

test("los SVG de productos no tienen '&' sin escapar (un SVG inválido no se dibuja)", () => {
  const carpeta = new URL("../public/img/productos/", import.meta.url);
  const svgs = readdirSync(carpeta).filter((f) => f.endsWith(".svg"));
  assert.ok(svgs.includes("placeholder.svg"));
  const ampersandSuelto = /&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-f]+);)/i;
  for (const archivo of svgs) {
    const contenido = readFileSync(new URL(archivo, carpeta), "utf8");
    assert.doesNotMatch(contenido, ampersandSuelto, archivo);
  }
});

test("pedidos, carrito y tarjetas usan la imagen con respaldo", () => {
  for (const ruta of [
    "../src/pedidos/pedidos-vista.js",
    "../src/carrito/carrito.js",
    "../src/catalogo/tarjeta-producto.js",
  ]) {
    assert.ok(leer(ruta).includes("asignarImagenConRespaldo("), ruta);
  }
});

test("etiquetarCeldas pone el nombre de la columna en cada celda", () => {
  const celdas = [{ dataset: {} }, { dataset: {} }, { dataset: {} }];
  etiquetarCeldas({ children: celdas }, ["Nombre", "", "Rol"]);
  assert.equal(celdas[0].dataset.etiqueta, "Nombre");
  assert.equal(celdas[1].dataset.etiqueta, undefined, "una etiqueta vacía no se escribe");
  assert.equal(celdas[2].dataset.etiqueta, "Rol");
});

test("etiquetarCeldas tolera más celdas que etiquetas", () => {
  const celdas = [{ dataset: {} }, { dataset: {} }];
  etiquetarCeldas({ children: celdas }, ["Única"]);
  assert.equal(celdas[0].dataset.etiqueta, "Única");
  assert.equal(celdas[1].dataset.etiqueta, undefined);
});

test("la tabla de cuentas es apilable y se etiqueta al renderizar", () => {
  const plantilla = leer("../src/layout/plantillas/administracion.html");
  assert.match(plantilla, /class="[^"]*tabla-apilable[^"]*"[\s\S]*id="tabla-cuentas-admin"/);

  const panel = leer("../src/administracion/panel-administracion.js");
  assert.ok(panel.includes("etiquetarCeldas(fila, ETIQUETAS_COLUMNAS_CUENTAS)"));

  const css = leer("../src/css/paneles.css");
  assert.match(css, /@media \(max-width: 575\.98px\)[\s\S]*\.tabla-apilable/);
  assert.ok(css.includes("content: attr(data-etiqueta)"));
});

test("el selector de cantidad del carrito tiene estilos propios para cada clase que usa", () => {
  const carrito = leer("../src/carrito/carrito.js");
  const css = leer("../src/css/carrito.css");
  for (const clase of ["cart-stepper", "cart-stepper-btn", "cart-stepper-qty"]) {
    assert.ok(carrito.includes(clase), `carrito.js usa .${clase}`);
    assert.match(css, new RegExp(`\\.${clase} \\{`), `falta .${clase} en carrito.css`);
  }
  assert.match(css, /\.cart-stepper-btn \{[^}]*width: 36px;[^}]*height: 36px;/);
});

test("en móvil el avance del pedido es vertical y el WhatsApp mide 44 px", () => {
  const pedidos = leer("../src/css/pedidos.css");
  const bloque = pedidos.slice(pedidos.indexOf("@media (max-width: 575.98px)"));
  assert.match(bloque, /\.order-stepper \{\s*flex-direction: column;/);
  assert.match(bloque, /\.order-stepper-track \{\s*display: none;/);

  const base = leer("../src/css/base.css");
  const movil = base.slice(base.indexOf("@media (max-width: 575.98px)"));
  assert.match(movil, /\.floating-whatsapp-pill \{[^}]*width: 44px;[^}]*height: 44px;/);
});

test("el atributo hidden gana a las utilidades d-flex de Bootstrap (paginaciones ocultas)", () => {
  const base = leer("../src/css/base.css");
  assert.match(base, /\[hidden\]\s*\{\s*display:\s*none\s*!important;?\s*\}/);
  // style.css (que importa base.css) se carga después de Bootstrap, así que la regla gana.
  const main = leer("../src/main.js");
  assert.ok(main.indexOf('import "./style.css"') > main.indexOf("bootstrap.min.css"));
  assert.match(renderizarCatalogoLayout(), /id="paginacion-movimientos" class="d-flex[^"]*"[^>]*hidden/);
});
