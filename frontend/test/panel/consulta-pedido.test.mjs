// Panel del personal (spec 19, T08, decisión 8 revisada): formulario «Buscar pedido» propio del
// panel en #/consulta-pedido, con el mismo marcado accesible que la búsqueda del Inicio.
import test from "node:test";
import assert from "node:assert/strict";
import { renderizarBusquedaPedido } from "../../src/panel/inicio/busqueda-pedido.js";
import { renderizarInicioSoporte } from "../../src/panel/inicio/soporte-inicio.js";
import { renderizarCabeceraConsulta, valorCampoConsulta } from "../../src/panel/pantallas/soporte.js";

const idsDe = (html) => [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);

test("la búsqueda del Inicio y la de la consulta comparten marcado, cada una con su prefijo", () => {
  const inicio = renderizarBusquedaPedido("inicio");
  const consulta = renderizarBusquedaPedido("consulta");
  assert.equal(consulta, inicio.replaceAll('"inicio-', '"consulta-'));
  assert.ok(renderizarInicioSoporte().includes(inicio), "el Inicio usa la búsqueda compartida");
});

test("el formulario de la consulta: label, campo, botón y alerta con ids consulta-", () => {
  const html = renderizarBusquedaPedido("consulta");
  assert.match(html, /<form [^>]*id="consulta-form-busqueda"/);
  assert.match(html, /<label [^>]*for="consulta-buscar-pedido"[^>]*>Buscar pedido<\/label>/);
  assert.match(html, /<input [^>]*id="consulta-buscar-pedido"[^>]*placeholder="Número, por ejemplo 3"/);
  assert.match(html, /<button [^>]*type="submit"[^>]*>Buscar<\/button>/);
  assert.match(html, /<p [^>]*id="consulta-error-busqueda"[^>]*role="alert"/);
  assert.doesNotMatch(html, /aria-invalid/, "sin error hasta que se envía");
});

test("la cabecera de #/consulta-pedido: <h1> y el formulario, con ids sin repetir respecto al Inicio", () => {
  const cabecera = renderizarCabeceraConsulta();
  assert.match(cabecera, /<h1[^>]*class="panel-titulo"[^>]*>Consulta de pedido<\/h1>/);
  assert.match(cabecera, /id="consulta-form-busqueda"/);
  const ids = [...idsDe(cabecera), ...idsDe(renderizarInicioSoporte())];
  assert.deepEqual(ids.filter((id, i) => ids.indexOf(id) !== i), []);
});

test("el campo aparece relleno con el pedido válido de la URL; si no, vacío", () => {
  assert.equal(valorCampoConsulta({ pedido: "3" }), "3");
  assert.equal(valorCampoConsulta({ pedido: "03" }), "3");
  for (const p of [{}, { pedido: "abc" }, { pedido: "0" }, { pedido: "" }, null]) assert.equal(valorCampoConsulta(p), "");
});
