// Panel del personal (spec 19, T03): «Cerrar sesión» del panel. Usa el apiRequest real con
// fetch simulado para comprobar también el token CSRF.
import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import { apiRequest, obtenerTokenCsrf, reiniciarTokenCsrf } from "../../src/api/api.js";
import { cerrarSesionPanel, DESTINO_TRAS_CERRAR_SESION } from "../../src/panel/cerrar-sesion.js";

const fetchOriginal = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = fetchOriginal;
  reiniciarTokenCsrf();
});

/** Simula el backend: CSRF siempre responde; el logout responde lo que diga `logout`. */
function simularBackend(logout) {
  const llamadas = [];
  globalThis.fetch = async (url, opciones = {}) => {
    llamadas.push({ url, metodo: opciones.method || "GET" });
    if (url === "/api/auth/csrf") {
      return new Response(JSON.stringify({ token: `t${llamadas.length}`, cabecera: "X-XSRF-TOKEN" }), { status: 200 });
    }
    if (url === "/api/auth/logout") return logout();
    throw new Error(`URL inesperada ${url}`);
  };
  return llamadas;
}

/** Arma el escenario del panel: usuario en sesión, botón y dependencias espiadas. */
function escenario() {
  const estado = { usuarioSesion: { idUsuario: 1, nombre: "Ana", rol: "ADMIN" } };
  const boton = { disabled: false };
  const redirecciones = [];
  const toasts = [];
  const dependencias = {
    apiRequest,
    boton,
    limpiarUsuario: () => { estado.usuarioSesion = null; },
    redirigir: (ruta) => redirecciones.push(ruta),
    mostrarToast: (mensaje, tipo) => toasts.push({ mensaje, tipo }),
  };
  return { estado, boton, redirecciones, toasts, dependencias };
}

/** Cuántas veces se pidió el token CSRF tras el cierre (1 si el token anterior se borró). */
async function pedidosCsrfTrasCerrar(llamadas) {
  const antes = llamadas.filter((l) => l.url === "/api/auth/csrf").length;
  await obtenerTokenCsrf();
  return llamadas.filter((l) => l.url === "/api/auth/csrf").length - antes;
}

test("el destino tras cerrar sesión es el login", () => {
  assert.equal(DESTINO_TRAS_CERRAR_SESION, "/login.html");
});

test("éxito: llama a POST /api/auth/logout, limpia sesión y CSRF y va al login", async () => {
  const llamadas = simularBackend(() => new Response(null, { status: 204 }));
  const { estado, boton, redirecciones, toasts, dependencias } = escenario();

  const resultado = await cerrarSesionPanel(dependencias);

  assert.deepEqual(resultado, { ok: true });
  assert.ok(llamadas.some((l) => l.url === "/api/auth/logout" && l.metodo === "POST"));
  assert.equal(estado.usuarioSesion, null);
  assert.deepEqual(redirecciones, ["/login.html"]);
  assert.deepEqual(toasts, []);
  assert.equal(boton.disabled, true, "el botón queda deshabilitado mientras se sale");
  assert.equal(await pedidosCsrfTrasCerrar(llamadas), 1, "el token CSRF anterior se descartó");
});

for (const status of [401, 403]) {
  test(`${status}: la sesión ya no existe en el servidor; se trata como cierre correcto`, async () => {
    const llamadas = simularBackend(() => new Response(JSON.stringify({ error: "x" }), { status }));
    const { estado, redirecciones, toasts, dependencias } = escenario();

    const resultado = await cerrarSesionPanel(dependencias);

    assert.deepEqual(resultado, { ok: true });
    assert.equal(estado.usuarioSesion, null);
    assert.deepEqual(redirecciones, ["/login.html"]);
    assert.deepEqual(toasts, []);
    assert.equal(await pedidosCsrfTrasCerrar(llamadas), 1);
  });
}

test("error de red: toast de error, el botón vuelve a estar activo y no se sale", async () => {
  simularBackend(() => { throw new TypeError("Failed to fetch"); });
  const { estado, boton, redirecciones, toasts, dependencias } = escenario();

  const resultado = await cerrarSesionPanel(dependencias);

  assert.deepEqual(resultado, { ok: false });
  assert.deepEqual(redirecciones, []);
  assert.equal(estado.usuarioSesion?.nombre, "Ana", "la sesión local se conserva");
  assert.equal(boton.disabled, false);
  assert.equal(toasts.length, 1);
  assert.equal(toasts[0].tipo, "error");
  assert.match(toasts[0].mensaje, /No se pudo cerrar la sesión/);
});

for (const status of [500, 503]) {
  test(`${status}: toast de error, el botón vuelve a estar activo y no se sale`, async () => {
    simularBackend(() => new Response(JSON.stringify({ error: "Fallo interno" }), { status }));
    const { estado, boton, redirecciones, toasts, dependencias } = escenario();

    const resultado = await cerrarSesionPanel(dependencias);

    assert.deepEqual(resultado, { ok: false });
    assert.deepEqual(redirecciones, []);
    assert.notEqual(estado.usuarioSesion, null);
    assert.equal(boton.disabled, false);
    assert.equal(toasts.length, 1);
    assert.equal(toasts[0].tipo, "error");
  });
}

test("funciona sin botón (por ejemplo, si se invoca desde otro sitio)", async () => {
  simularBackend(() => new Response(null, { status: 204 }));
  const { redirecciones, dependencias } = escenario();
  delete dependencias.boton;
  assert.deepEqual(await cerrarSesionPanel(dependencias), { ok: true });
  assert.deepEqual(redirecciones, ["/login.html"]);
});
