import test from "node:test";
import assert from "node:assert/strict";
import { generarSkeletonCards } from "../../src/catalogo/componentes/skeleton-loader.js";

test("generarSkeletonCards genera la cantidad especificada de tarjetas", () => {
  const html = generarSkeletonCards(4);
  const matches = (html.match(/class="skeleton-card/g) || []).length;
  assert.equal(matches, 4);
});

test("generarSkeletonCards usa 8 tarjetas por defecto", () => {
  const html = generarSkeletonCards();
  const matches = (html.match(/class="skeleton-card/g) || []).length;
  assert.equal(matches, 8);
});

test("generarSkeletonCards incluye atributos de accesibilidad aria-hidden y clases shimmer", () => {
  const html = generarSkeletonCards(2);
  assert.ok(html.includes('aria-hidden="true"'), "Debe incluir aria-hidden='true' para no saturar lectores de pantalla");
  assert.ok(html.includes("skeleton-shimmer"), "Debe incluir la clase de animación shimmer");
  assert.ok(html.includes("skeleton-visual"), "Debe incluir placeholder para la imagen");
  assert.ok(html.includes("skeleton-price"), "Debe incluir placeholder para el precio");
  assert.ok(html.includes("skeleton-btn"), "Debe incluir placeholder para el botón de compra");
});
