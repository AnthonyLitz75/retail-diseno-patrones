import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { renderizarLogoSvg } from '../../src/layout/componentes/logo.js';
import { renderizarHeader } from '../../src/layout/header.js';
import { renderizarHero } from '../../src/layout/hero.js';
import { renderizarFooter } from '../../src/layout/footer.js';
import { renderizarCatalogoLayout } from '../../src/layout/catalogo-layout.js';

test('renderizarLogoSvg genera SVG oficial con identificadores parametrizados', () => {
  const svgNav = renderizarLogoSvg({ prefijo: 'nav', width: 40, height: 40 });
  assert.ok(svgNav.includes('id="nav-squircle-bg"'));
  assert.ok(svgNav.includes('id="nav-p-grad"'));
  assert.ok(svgNav.includes('width="40"'));

  const svgFooter = renderizarLogoSvg({ prefijo: 'footer', width: 50, height: 50 });
  assert.ok(svgFooter.includes('id="footer-squircle-bg"'));
  assert.ok(svgFooter.includes('id="footer-p-grad"'));
  assert.ok(svgFooter.includes('width="50"'));
  assert.notEqual(svgNav, svgFooter);
});

test('renderizarHeader genera la barra de 2 niveles y elementos clave de navegación', () => {
  const html = renderizarHeader();
  assert.ok(html.includes('id="busqueda-rapida"'));
  assert.ok(html.includes('id="busqueda-principal"'));
  assert.ok(html.includes('id="enlace-login"'));
  assert.ok(html.includes('id="enlace-carrito-nav"'));
  assert.ok(html.includes('id="btn-toggle-categorias-menu"'));
  assert.ok(html.includes('id="menu-categorias-dropdown"'));
});

test('renderizarHero genera el Bento grid, carrusel principal y barra de confianza', () => {
  const html = renderizarHero();
  assert.ok(html.includes('id="carouselHeroMain"'));
  assert.ok(html.includes('id="btn-hero-ofertas"'));
  assert.ok(html.includes('store-trust-bar'));
  assert.ok(html.includes('hero-badge-student'));
});

test('renderizarCatalogoLayout genera las vistas modulares y cajón del carrito', () => {
  const html = renderizarCatalogoLayout({ heroHtml: '<div id="hero-test"></div>' });
  assert.ok(html.includes('id="navegacion-modulos"'));
  assert.ok(html.includes('id="vista-tienda"'));
  assert.ok(html.includes('id="vista-pedidos"'));
  assert.ok(html.includes('id="vista-inventario"'));
  assert.ok(html.includes('id="vista-administracion"'));
  assert.ok(html.includes('id="seccion-carrito"'));
  assert.ok(html.includes('id="hero-test"'));
});

test('renderizarFooter contiene información oficial, medios de pago y libro de reclamaciones', () => {
  const html = renderizarFooter();
  assert.ok(html.includes('id="seccion-sede"'));
  assert.ok(html.includes('id="seccion-medios-pago"'));
  assert.ok(html.includes('href="#modal-libro-reclamaciones"'));
  assert.ok(html.includes('Píxel Andino S.A.C.'));
});

test('modales.html contiene los 5 modales funcionales del sistema en HTML puro', () => {
  const html = readFileSync(new URL('../../src/layout/plantillas/modales.html', import.meta.url), 'utf-8');
  assert.ok(html.includes('id="modal-libro-reclamaciones"'));
  assert.ok(html.includes('id="modal-garantia"'));
  assert.ok(html.includes('id="modal-ajuste-stock"'));
  assert.ok(html.includes('id="modal-editar-precio"'));
  assert.ok(html.includes('id="modal-preguntas-producto"'));
});

test('docks.html contiene accesos laterales flotantes y WhatsApp en HTML puro', () => {
  const html = readFileSync(new URL('../../src/layout/plantillas/docks.html', import.meta.url), 'utf-8');
  assert.ok(html.includes('floating-social-dock'));
  assert.ok(html.includes('id="dock-btn-carrito"'));
  assert.ok(html.includes('id="dock-btn-usuario"'));
  assert.ok(html.includes('id="dock-btn-favoritos"'));
  assert.ok(html.includes('id="dock-btn-top"'));
  assert.ok(html.includes('floating-whatsapp-pill'));
});
