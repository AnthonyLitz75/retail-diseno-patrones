// Panel del personal (spec 19, T02): fuente única del menú por rol (spec 12) y su
// equivalencia con las vistas que cada rol ya tiene hoy (decisión P5).
import test from "node:test";
import assert from "node:assert/strict";
import {
  MENU_POR_ROL,
  VISTA_POR_RUTA,
  entradasDeRol,
} from "../../src/panel/menu-por-rol.js";
import { determinarVistasPorRol } from "../../src/utilidades/navegacion.js";

const PERSONAL = ["ADMIN", "VENDEDOR", "ALMACEN", "SOPORTE"];

/** Íconos de la spec 11 (uno por entrada del menú; «Cerrar sesión» no es entrada). */
const ICONOS_SPEC = [
  "inicio", "pedidos", "productos", "inventario", "categorias", "cuentas", "reportes",
  "auditoria", "incidencias", "consultas", "reclamos", "devoluciones", "consulta-pedido",
];

/** Menús de la spec 12: [grupo, [[etiqueta, ruta], ...]]. */
const MENU_ESPERADO = {
  ADMIN: [
    ["Operación", [
      ["Inicio", "#/inicio"],
      ["Pedidos", "#/pedidos"],
      ["Productos", "#/productos"],
      ["Inventario y kardex", "#/inventario"],
      ["Categorías", "#/categorias"],
    ]],
    ["Administración", [
      ["Cuentas y roles", "#/cuentas"],
      ["Reportes", "#/reportes"],
      ["Incidencias", "#/incidencias"],
      ["Auditoría", "#/auditoria"],
    ]],
  ],
  VENDEDOR: [
    ["Ventas", [
      ["Inicio", "#/inicio"],
      ["Productos", "#/productos"],
      ["Pedidos", "#/pedidos"],
      ["Consultas de clientes", "#/consultas"],
      ["Inventario", "#/inventario"],
    ]],
  ],
  ALMACEN: [
    ["Almacén", [
      ["Inicio", "#/inicio"],
      ["Pedidos por atender", "#/pedidos"],
      ["Inventario y kardex", "#/inventario"],
    ]],
  ],
  SOPORTE: [
    ["Atención al cliente", [
      ["Inicio", "#/inicio"],
      ["Reclamos", "#/reclamos"],
      ["Devoluciones", "#/devoluciones"],
      ["Consulta de pedido", "#/consulta-pedido"],
    ]],
  ],
};

/** Equivalencias de la decisión P5. */
const VISTA_ESPERADA = {
  "#/inicio": null,
  "#/pedidos": "pedidos",
  "#/productos": "productos",
  "#/inventario": "inventario",
  "#/consultas": "consultas",
  "#/categorias": "administracion",
  "#/cuentas": "administracion",
  "#/reportes": "administracion",
  "#/incidencias": "administracion",
  "#/auditoria": "administracion",
  "#/reclamos": "soporte",
  "#/devoluciones": "soporte",
  "#/consulta-pedido": "soporte",
};

const todasLasEntradas = (rol) => MENU_POR_ROL[rol].flatMap((grupo) => grupo.entradas);

test("desde T11 la tienda solo da «tienda» al personal (la copia fija es de antes)", () => {
  for (const rol of PERSONAL) assert.deepEqual(determinarVistasPorRol(rol), ["tienda"], rol);
});

test("solo los cuatro roles del personal tienen menú; CLIENTE no", () => {
  assert.deepEqual(Object.keys(MENU_POR_ROL).sort(), [...PERSONAL].sort());
  assert.equal(Object.hasOwn(MENU_POR_ROL, "CLIENTE"), false);
});

test("cada rol tiene exactamente los grupos y entradas de la spec 12, en orden", () => {
  for (const rol of PERSONAL) {
    const real = MENU_POR_ROL[rol].map((g) => [g.grupo, g.entradas.map((e) => [e.etiqueta, e.ruta])]);
    assert.deepEqual(real, MENU_ESPERADO[rol], rol);
  }
});

test("cada entrada tiene id, etiqueta, icono y ruta; el id es la ruta sin «#/»", () => {
  for (const rol of PERSONAL) {
    for (const entrada of todasLasEntradas(rol)) {
      assert.deepEqual(Object.keys(entrada).sort(), ["etiqueta", "icono", "id", "ruta"], `${rol} ${entrada.ruta}`);
      assert.equal(entrada.ruta, `#/${entrada.id}`, `${rol} ${entrada.id}`);
    }
  }
});

test("cada icono pertenece a la lista de la spec 11", () => {
  for (const rol of PERSONAL) {
    for (const entrada of todasLasEntradas(rol)) {
      assert.ok(ICONOS_SPEC.includes(entrada.icono), `${rol} ${entrada.ruta}: «${entrada.icono}»`);
    }
  }
});

test("la tabla ruta → vista actual es la de la decisión P5", () => {
  assert.deepEqual({ ...VISTA_POR_RUTA }, VISTA_ESPERADA);
});

/**
 * Vistas que la tienda daba a cada rol del personal antes de T11 (determinarVistasPorRol de
 * entonces). Desde T11 el personal solo tiene la tienda; esta copia fija conserva la
 * comprobación de T02: el panel no da más acceso del que el personal tenía.
 */
const VISTAS_PERSONAL_ANTES_T11 = Object.freeze({
  ADMIN: ["administracion", "productos", "tienda", "pedidos", "inventario"],
  ALMACEN: ["pedidos", "inventario", "tienda"],
  VENDEDOR: ["tienda", "productos", "consultas", "pedidos", "inventario"],
  SOPORTE: ["soporte", "tienda"],
});

test("ninguna entrada da más acceso que antes de T11: su vista estaba permitida para el rol", () => {
  for (const rol of PERSONAL) {
    const permitidas = VISTAS_PERSONAL_ANTES_T11[rol];
    for (const { ruta } of todasLasEntradas(rol)) {
      assert.ok(Object.hasOwn(VISTA_POR_RUTA, ruta), `${rol}: ${ruta} sin equivalencia`);
      const vista = VISTA_POR_RUTA[ruta];
      if (ruta === "#/inicio") continue;
      assert.ok(permitidas.includes(vista), `${rol}: ${ruta} → ${vista} no está en ${permitidas}`);
    }
  }
});

test("#/inicio es la única ruta exenta y solo la tienen los cuatro roles del personal", () => {
  const exentas = Object.entries(VISTA_POR_RUTA).filter(([, vista]) => vista === null).map(([ruta]) => ruta);
  assert.deepEqual(exentas, ["#/inicio"]);
  for (const rol of PERSONAL) {
    assert.equal(todasLasEntradas(rol)[0].ruta, "#/inicio", rol);
  }
  for (const rol of ["CLIENTE", null, undefined, "", "SUPERADMIN"]) {
    assert.deepEqual(entradasDeRol(rol), [], String(rol));
  }
});

test("entradasDeRol devuelve la lista plana del rol en el orden del menú", () => {
  for (const rol of PERSONAL) {
    assert.deepEqual(entradasDeRol(rol), todasLasEntradas(rol), rol);
  }
});

test("el menú es inmutable", () => {
  assert.ok(Object.isFrozen(MENU_POR_ROL));
  assert.ok(Object.isFrozen(VISTA_POR_RUTA));
  for (const rol of PERSONAL) {
    assert.ok(Object.isFrozen(MENU_POR_ROL[rol]), rol);
    for (const grupo of MENU_POR_ROL[rol]) {
      assert.ok(Object.isFrozen(grupo) && Object.isFrozen(grupo.entradas), `${rol} ${grupo.grupo}`);
      grupo.entradas.forEach((e) => assert.ok(Object.isFrozen(e), `${rol} ${e.ruta}`));
    }
  }
});
