/**
 * @file cuentas-logica.js
 * Pantalla «Cuentas y roles» del panel: lógica pura (filtros, contadores, cambio de rol sin
 * guardar) y marcado de cada fila. Sin DOM ni red; admin-usuarios.js lo pinta y cablea.
 * Los valores del rol (ADMIN, VENDEDOR…) no cambian: solo se muestran con su nombre legible.
 */

import { html, seguro } from "../utilidades/seguridad.js";
import { ORDEN_ROLES, etiquetaRolLegible, htmlAvatarRol } from "../panel/roles-visual.js";

export { ORDEN_ROLES };
export const etiquetaRolCuenta = etiquetaRolLegible;

export const TITLE_PROPIA_CUENTA = "No puedes desactivar tu propia cuenta";
export const TITLE_CUENTA_DESACTIVADA = "La cuenta ya está desactivada";

/** Minúsculas y sin tildes, para buscar sin distinguir mayúsculas ni acentos. */
export function normalizarTexto(texto) {
  return String(texto ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();
}

/** Filtra por rol («» = todos) y por texto en nombre o correo; ambos filtros se combinan. */
export function filtrarCuentas(cuentas, { rol = "", texto = "" } = {}) {
  const buscado = normalizarTexto(texto);
  return cuentas.filter((c) => (!rol || c.rol === rol)
    && (!buscado || normalizarTexto(c.nombre).includes(buscado) || normalizarTexto(c.correo).includes(buscado)));
}

/** Contador de cada filtro sobre la lista completa: la clave «» es «Todos». */
export function contarPorRol(cuentas) {
  const conteo = { "": cuentas.length };
  for (const rol of ORDEN_ROLES) conteo[rol] = 0;
  for (const c of cuentas) if (c.rol in conteo) conteo[c.rol] += 1;
  return conteo;
}

/** Fecha de alta corta dd/mm/aa; «—» si no hay fecha o no es válida. */
export function altaCorta(fecha) {
  if (fecha == null) return "—";
  const d = new Date(fecha);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

/** ¿Difiere el rol elegido del guardado? `antes` es el nombre legible del rol guardado. */
export function estadoCambioRol(usuario, elegido) {
  return { cambiado: Boolean(elegido) && elegido !== usuario.rol, antes: etiquetaRolCuenta(usuario.rol) };
}

const datosUsuario = (usuario) => html`data-usuario-id="${usuario.idUsuario}" data-usuario-nombre="${usuario.nombre}"`;

/** «Antes: {rol}» y «Guardar» (la acción guardar-rol de siempre); vacío si no hay cambio. */
export function htmlCambioRol(usuario, elegido) {
  if (!estadoCambioRol(usuario, elegido).cambiado) return "";
  return html`<p class="cuenta-antes">Antes: ${etiquetaRolCuenta(usuario.rol)}</p>
  <button type="button" class="cuenta-guardar" data-accion="guardar-rol" ${seguro(datosUsuario(usuario))}>Guardar</button>`;
}

function htmlOpcionesRol(usuario, elegido) {
  const roles = ORDEN_ROLES.includes(usuario.rol) ? ORDEN_ROLES : [...ORDEN_ROLES, usuario.rol];
  return roles.map((rol) => html`<option value="${rol}"${seguro(rol === elegido ? " selected" : "")}>${etiquetaRolCuenta(rol)}</option>`).join("");
}

/**
 * Fila de la tabla: Cuenta (th scope=row), Rol, Estado y Acciones.
 * @param {object} usuario
 * @param {{ idActual?: number, rolElegido?: string }} [opciones] idActual marca «(tú)»; rolElegido es el rol sin guardar
 */
export function htmlFilaCuenta(usuario, { idActual, rolElegido } = {}) {
  const elegido = rolElegido ?? usuario.rol;
  const { cambiado } = estadoCambioRol(usuario, elegido);
  const esTu = idActual != null && Number(idActual) === Number(usuario.idUsuario);
  const tu = esTu ? seguro(html`\n        <span class="cuenta-tu">(tú)</span>`) : "";
  const estado = usuario.activo
    ? '<span class="cuenta-estado cuenta-estado-activa"><span class="cuenta-estado-punto" aria-hidden="true"></span>Activa</span>'
    : '<span class="cuenta-estado cuenta-estado-inactiva"><span class="cuenta-estado-punto" aria-hidden="true"></span>Desactivada</span>';
  const motivo = esTu ? TITLE_PROPIA_CUENTA : (!usuario.activo ? TITLE_CUENTA_DESACTIVADA : "");
  const bloqueado = motivo ? html` disabled title="${motivo}"` : "";
  return html`<tr${seguro(cambiado ? ' class="cuenta-modificada"' : "")}>
  <th scope="row">
    <div class="cuenta-identidad">
      ${seguro(htmlAvatarRol(usuario.nombre, usuario.rol))}
      <div class="cuenta-datos">
        <span class="cuenta-nombre">${usuario.nombre}</span>${tu}
        <span class="cuenta-correo">${usuario.correo}</span>
        <span class="cuenta-alta">Alta ${altaCorta(usuario.fechaAlta)}</span>
      </div>
    </div>
  </th>
  <td>
    <select class="form-select form-select-sm${seguro(cambiado ? " cuenta-rol-cambiado" : "")}" aria-label="Rol de ${usuario.nombre}">${seguro(htmlOpcionesRol(usuario, elegido))}</select>
    <div class="cuenta-cambio" aria-live="polite">${seguro(htmlCambioRol(usuario, elegido))}</div>
  </td>
  <td>${seguro(estado)}</td>
  <td><button type="button" class="cuenta-desactivar" data-accion="desactivar" ${seguro(datosUsuario(usuario))}${seguro(bloqueado)}>Desactivar</button></td>
</tr>`;
}

/**
 * Copia ordenada por rol (Administrador, Vendedor, Almacén, Soporte, Cliente; un rol desconocido
 * va al final) y, dentro de cada rol, por nombre sin distinguir mayúsculas ni tildes.
 */
export function ordenarCuentas(cuentas) {
  const puesto = (rol) => { const i = ORDEN_ROLES.indexOf(rol); return i < 0 ? ORDEN_ROLES.length : i; };
  return [...cuentas].sort((a, b) => puesto(a.rol) - puesto(b.rol)
    || normalizarTexto(a.nombre).localeCompare(normalizarTexto(b.nombre), "es"));
}
