// Pestaña "Auditoría" de Administración: consulta, columnas y validación de filtros.
import test from "node:test";
import assert from "node:assert/strict";
import {
  crearConsultaAuditoria,
  describirActor,
  describirEntidad,
  TAMANO_PAGINA_AUDITORIA,
} from "../../src/administracion/auditoria-vista.js";

test("la consulta solo envía los filtros con valor y recorta el usuario", () => {
  assert.equal(crearConsultaAuditoria({}), "");
  assert.equal(
    crearConsultaAuditoria({ desde: "2026-11-01", hasta: "2026-11-12", accion: "ROL_CAMBIADO", usuario: "  ana  ", pagina: 2, tamano: 20 }),
    "desde=2026-11-01&hasta=2026-11-12&accion=ROL_CAMBIADO&usuario=ana&pagina=2&tamano=20",
  );
  assert.equal(crearConsultaAuditoria({ usuario: "   " }), "", "un usuario en blanco no filtra");
});

test("la consulta escapa los caracteres especiales del usuario", () => {
  assert.equal(crearConsultaAuditoria({ usuario: "a&b=c" }), "usuario=a%26b%3Dc");
});

test("rechaza un rango de fechas invertido antes de llamar a la API", () => {
  assert.throws(() => crearConsultaAuditoria({ desde: "2026-11-12", hasta: "2026-11-01" }), /fecha inicial/);
});

test("la columna Usuario muestra nombre (o correo) y rol, o un guion si no hubo sesión", () => {
  assert.equal(describirActor({ usuarioNombre: "Ana", usuarioCorreo: "ana@x.com", rol: "ADMIN" }), "Ana · ADMIN");
  assert.equal(describirActor({ usuarioNombre: null, usuarioCorreo: "intruso@x.com", rol: null }), "intruso@x.com");
  assert.equal(describirActor({}), "—");
});

test("la columna Entidad junta tipo y número", () => {
  assert.equal(describirEntidad({ entidad: "PEDIDO", entidadId: 12 }), "PEDIDO #12");
  assert.equal(describirEntidad({ entidad: "REPORTE", entidadId: null }), "REPORTE");
  assert.equal(describirEntidad({}), "—");
});

test("la página por defecto es de 20 registros, igual que el backend", () => {
  assert.equal(TAMANO_PAGINA_AUDITORIA, 20);
});
