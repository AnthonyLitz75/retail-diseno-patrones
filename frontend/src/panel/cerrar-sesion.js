/**
 * @file cerrar-sesion.js
 * Panel del personal (spec 13, «Cerrar sesión»): cierra la sesión en el servidor, limpia el
 * estado local (usuario en sesión y token CSRF) y lleva al login. No toca localStorage ni
 * sessionStorage: la tienda tampoco guarda ahí nada ligado a la sesión (solo el carrito de
 * invitado y los favoritos, que son del dispositivo).
 *
 * Pendiente T11: evaluar que la tienda reutilice esta función para tener un solo logout.
 */

import { reiniciarTokenCsrf as reiniciarTokenCsrfApi } from "../api/api.js";

export const DESTINO_TRAS_CERRAR_SESION = "/login.html";

/** 401/403 al salir: el servidor ya no tiene esa sesión (vencida o revocada); el cierre vale. */
const ESTADOS_SESION_YA_CERRADA = Object.freeze([401, 403]);

const MENSAJE_ERROR = "No se pudo cerrar la sesión. Revisa tu conexión e inténtalo de nuevo.";

/**
 * @param {object} dependencias
 * @param {Function} dependencias.apiRequest
 * @param {() => void} dependencias.limpiarUsuario       borra el usuario en sesión del panel
 * @param {(ruta: string) => void} dependencias.redirigir
 * @param {Function} dependencias.mostrarToast
 * @param {{ disabled: boolean }} [dependencias.boton]   se deshabilita mientras se sale
 * @param {() => void} [dependencias.reiniciarTokenCsrf]
 * @returns {Promise<{ ok: boolean }>}
 */
export async function cerrarSesionPanel({
  apiRequest,
  limpiarUsuario,
  redirigir,
  mostrarToast,
  boton = null,
  reiniciarTokenCsrf = reiniciarTokenCsrfApi,
}) {
  if (boton) boton.disabled = true;
  try {
    await apiRequest("/api/auth/logout", { method: "POST" });
  } catch (error) {
    if (!ESTADOS_SESION_YA_CERRADA.includes(error?.status)) {
      // Red, tiempo agotado, 5xx u otra respuesta inesperada: la sesión puede seguir abierta.
      mostrarToast?.(MENSAJE_ERROR, "error");
      if (boton) boton.disabled = false;
      return { ok: false };
    }
  }
  limpiarUsuario();
  reiniciarTokenCsrf();
  redirigir(DESTINO_TRAS_CERRAR_SESION);
  return { ok: true };
}
