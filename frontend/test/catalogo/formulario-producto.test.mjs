// Formulario "Nuevo producto": lectura, validación (igual que el backend) y vista previa.
import test from "node:test";
import assert from "node:assert/strict";
import {
  CODIGO_PROVISIONAL,
  CONTROLES,
  leerNuevoProducto,
  productoVistaPrevia,
  validarNuevoProducto,
} from "../../src/catalogo/gestion/formulario-producto.js";
import { renderizarCatalogoLayout } from "../../src/layout/catalogo-layout.js";

const valida = {
  sku: " pa-0099 ",
  nombre: "  Teclado mecánico 60% RGB ",
  marca: "Logitech",
  categoria: "Teclados",
  descripcion: "  ",
  imagen: "https://cdn.ejemplo.pe/teclado.webp",
  precio: "399.00",
  precioAnterior: "459",
  stock: "7",
  nuevo: true,
};

test("lee la ficha: recorta textos, código en mayúsculas, vacíos como null y números", () => {
  assert.deepEqual(leerNuevoProducto(valida), {
    sku: "PA-0099",
    nombre: "Teclado mecánico 60% RGB",
    marca: "Logitech",
    categoria: "Teclados",
    descripcion: null,
    imagen: "https://cdn.ejemplo.pe/teclado.webp",
    precio: 399,
    precioAnterior: 459,
    stock: 7,
    nuevo: true,
  });
  const minima = leerNuevoProducto({ nombre: "Mouse", categoria: "Mouse", precio: "49", stock: "0" });
  assert.equal(minima.sku, null, "sin código, lo genera el backend");
  assert.equal(minima.precioAnterior, null);
  assert.equal(minima.nuevo, false);
});

test("una ficha completa y una mínima son válidas", () => {
  assert.deepEqual(validarNuevoProducto(leerNuevoProducto(valida)), []);
  assert.deepEqual(
    validarNuevoProducto(leerNuevoProducto({ nombre: "Mouse", categoria: "Mouse", precio: "49", stock: "0" })),
    [],
  );
});

test("marca los obligatorios que faltan, en el orden del formulario", () => {
  const campos = validarNuevoProducto(leerNuevoProducto({})).map((e) => e.campo);
  assert.deepEqual(campos, ["nombre", "categoria", "precio", "stock"]);
});

test("aplica las mismas reglas que el backend", () => {
  const errorDe = (cambios) => validarNuevoProducto(leerNuevoProducto({ ...valida, ...cambios })).map((e) => e.campo);
  assert.deepEqual(errorDe({ sku: "P A" }), ["sku"]);
  assert.deepEqual(errorDe({ sku: "<b>" }), ["sku"]);
  assert.deepEqual(errorDe({ imagen: "javascript:alert(1)" }), ["imagen"]);
  assert.deepEqual(errorDe({ precio: "0" }), ["precio"]);
  assert.deepEqual(errorDe({ precio: "10.999" }), ["precio"]);
  assert.deepEqual(errorDe({ precioAnterior: "399" }), ["precioAnterior"], "el precio anterior debe ser un descuento");
  assert.deepEqual(errorDe({ stock: "-1" }), ["stock"]);
  assert.deepEqual(errorDe({ stock: "2.5" }), ["stock"]);
  assert.deepEqual(errorDe({ nombre: "x".repeat(121) }), ["nombre"]);
});

test("la vista previa usa lo escrito o textos de ejemplo, y descarta datos inválidos", () => {
  const vacia = productoVistaPrevia(leerNuevoProducto({}));
  assert.equal(vacia.nombre, "Nombre del producto");
  assert.equal(vacia.sku, CODIGO_PROVISIONAL);
  assert.equal(vacia.precio, 0);
  assert.equal(vacia.stock, 0);

  const llena = productoVistaPrevia(leerNuevoProducto(valida));
  assert.equal(llena.sku, "PA-0099");
  assert.equal(llena.precioAnterior, 459);
  assert.equal(llena.nuevo, true);

  const rara = productoVistaPrevia(leerNuevoProducto({ ...valida, precioAnterior: "100", imagen: "javascript:x" }));
  assert.equal(rara.precioAnterior, null, "sin descuento real no se muestra precio tachado");
  assert.equal(rara.imagen, null, "una imagen insegura no llega al <img>");
});

test("la plantilla tiene un control y un mensaje de error por cada campo", () => {
  const html = renderizarCatalogoLayout();
  for (const [campo, id] of Object.entries(CONTROLES)) {
    assert.match(html, new RegExp(`id="${id}"`), `falta el control de ${campo}`);
    if (campo !== "nuevo") {
      assert.match(html, new RegExp(`class="invalid-feedback" data-campo="${campo}"`), `falta el error de ${campo}`);
    }
  }
  assert.match(html, /id="panel-nuevo-producto"[^>]*hidden/, "el formulario empieza cerrado");
  assert.match(html, /id="boton-nuevo-producto"[^>]*aria-expanded="false"[^>]*aria-controls="panel-nuevo-producto"/);
  assert.match(html, /id="vista-previa-producto"[^>]*inert/, "la vista previa no es interactiva");
  assert.match(html, /movimiento de <strong>ENTRADA<\/strong>/);
});
