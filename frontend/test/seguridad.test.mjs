import test from 'node:test';
import assert from 'node:assert/strict';
import { escaparHtml, html, seguro } from '../src/utilidades/seguridad.js';

test('escaparHtml maneja valores nulos, indefinidos y vacíos de forma segura', () => {
  assert.equal(escaparHtml(null), '');
  assert.equal(escaparHtml(undefined), '');
  assert.equal(escaparHtml(''), '');
});

test('escaparHtml preserva cadenas de texto limpias y números sin alteración', () => {
  assert.equal(escaparHtml('Hola Mundo'), 'Hola Mundo');
  assert.equal(escaparHtml(12345), '12345');
  assert.equal(escaparHtml(0), '0');
  assert.equal(escaparHtml('Producto Genial 2026'), 'Producto Genial 2026');
});

test('escaparHtml convierte etiquetas HTML y caracteres peligrosos en entidades seguras', () => {
  assert.equal(
    escaparHtml('<script>alert("XSS")</script>'),
    '&lt;script&gt;alert(&quot;XSS&quot;)&lt;&#x2F;script&gt;'
  );
  assert.equal(
    escaparHtml('<img src=x onerror=alert(1)>'),
    '&lt;img src=x onerror=alert(1)&gt;'
  );
  assert.equal(
    escaparHtml("Juan 'El Rápido' & Cía."),
    'Juan &#39;El Rápido&#39; &amp; Cía.'
  );
});

test('html tag template escapa variables interpoladas y conserva el HTML estático', () => {
  const nombreInseguro = '<script>evil()</script>';
  const correoInseguro = 'admin"onfocus="alert(1)';
  const idPedido = 42;

  const resultado = html`
    <div class="card">
      <h6>Pedido #${idPedido}</h6>
      <span>Cliente: ${nombreInseguro}</span>
      <span>Correo: ${correoInseguro}</span>
    </div>
  `.trim();

  assert.ok(resultado.includes('<h6>Pedido #42</h6>'));
  assert.ok(resultado.includes('&lt;script&gt;evil()&lt;&#x2F;script&gt;'));
  assert.ok(resultado.includes('admin&quot;onfocus=&quot;alert(1)'));
  assert.ok(!resultado.includes('<script>evil()</script>'));
});

test('seguro permite componer fragmentos HTML confiables sin doble escape', () => {
  const datoPeligroso = '<script>bad()</script>';
  const insigniaSegura = seguro(html`<span class="badge">${datoPeligroso}</span>`);
  const contenedor = html`<div>${insigniaSegura}</div>`;

  assert.equal(typeof contenedor, 'string');
  assert.ok(contenedor.includes('<span class="badge">&lt;script&gt;bad()&lt;&#x2F;script&gt;</span>'));
  assert.doesNotMatch(contenedor, /<script>bad\(\)<\/script>/);
});
