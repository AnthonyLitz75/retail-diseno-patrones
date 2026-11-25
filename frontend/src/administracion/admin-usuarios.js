/**
 * @file admin-usuarios.js
 * Submódulo de administración de colaboradores, cuentas y asignación de roles.
 * Desde T11 solo lo usa el panel del personal («Cuentas y roles»): filtros por rol con contador,
 * buscador, tabla de cuentas con cambio de rol sin guardar y alta en la columna derecha. La
 * lógica pura y el marcado de cada fila están en cuentas-logica.js.
 */

import {
  listarCuentas,
  registrarPersonal,
  cambiarRol,
  desactivarCuenta,
} from "./administracion.js";
import {
  mostrarConfirmacion,
  mostrarToast,
} from "../utilidades/notificaciones.js";
import {
  contarPorRol,
  estadoCambioRol,
  etiquetaRolCuenta,
  filtrarCuentas,
  ordenarCuentas,
  htmlCambioRol,
  htmlFilaCuenta,
} from "./cuentas-logica.js";

export const ETIQUETAS_COLUMNAS_CUENTAS = ["Cuenta", "Rol", "Estado", "Acciones"];

const COLUMNAS = ETIQUETAS_COLUMNAS_CUENTAS.length;

/**
 * Inicializa la gestión de cuentas y colaboradores en el panel de administración.
 * @param {Object} params
 * @param {HTMLElement} params.seccion
 * @param {Function} params.apiRequest
 * @param {Function} params.mostrarEstado
 * @param {() => ({ idUsuario?: number } | null)} [params.obtenerUsuarioActual] cuenta de la sesión («(tú)» y no desactivarla)
 * @returns {{ cargarCuentas: () => Promise<void> }}
 */
export function inicializarAdminUsuarios({ seccion, apiRequest, mostrarEstado, obtenerUsuarioActual = () => null }) {
  const tablaCuentas = seccion.querySelector("#tabla-cuentas-admin");
  const estadoCuentas = seccion.querySelector("#estado-cuentas-admin");
  const grupoFiltros = seccion.querySelector("#filtro-rol-cuentas");
  const buscador = seccion.querySelector("#buscar-cuentas-admin");
  const estadoAlta = seccion.querySelector("#estado-alta-personal");

  if (estadoCuentas) {
    estadoCuentas.setAttribute?.("role", "status");
    estadoCuentas.setAttribute?.("aria-live", "polite");
  }
  if (estadoAlta) {
    estadoAlta.setAttribute?.("role", "status");
    estadoAlta.setAttribute?.("aria-live", "polite");
  }

  let usuariosCache = [];
  let promesaCuentasEnCurso = null;
  let rolFiltro = "";
  /** Cuentas mostradas ahora, en el orden de las filas (para localizar la de un `change`). */
  let mostradas = [];
  /** idUsuario → rol elegido y todavía sin guardar (sobrevive a filtrar y buscar). */
  const pendientes = new Map();

  const idActual = () => obtenerUsuarioActual()?.idUsuario;

  function pintarContadores() {
    const conteo = contarPorRol(usuariosCache);
    for (const boton of grupoFiltros?.querySelectorAll("[data-rol]") ?? []) {
      const rol = boton.dataset.rol;
      boton.textContent = `${rol ? etiquetaRolCuenta(rol) : "Todos"} · ${conteo[rol] ?? 0}`;
      boton.setAttribute("aria-pressed", String(rol === rolFiltro));
    }
  }

  function renderizarCuentas() {
    if (!tablaCuentas) return;
    for (const usuario of usuariosCache) {
      // Si el servidor ya tiene el rol que se había elegido, no queda nada pendiente.
      if (pendientes.get(usuario.idUsuario) === usuario.rol) pendientes.delete(usuario.idUsuario);
    }
    pintarContadores();
    mostradas = ordenarCuentas(filtrarCuentas(usuariosCache, { rol: rolFiltro, texto: buscador?.value ?? "" }));
    if (mostradas.length === 0) {
      const hayFiltro = Boolean(rolFiltro) || Boolean(buscador?.value?.trim());
      tablaCuentas.innerHTML = `<tr><td colspan="${COLUMNAS}" class="cuentas-vacio">${hayFiltro ? "No hay cuentas que coincidan con el filtro." : "No hay cuentas registradas."}</td></tr>`;
      return;
    }
    tablaCuentas.innerHTML = mostradas
      .map((usuario) => htmlFilaCuenta(usuario, { idActual: idActual(), rolElegido: pendientes.get(usuario.idUsuario) }))
      .join("");
  }

  async function cargarCuentas() {
    if (promesaCuentasEnCurso) return promesaCuentasEnCurso;
    promesaCuentasEnCurso = (async () => {
      if (estadoCuentas) estadoCuentas.textContent = "Cargando cuentas...";
      try {
        const usuarios = await listarCuentas(apiRequest);
        usuariosCache = usuarios;
        if (estadoCuentas) estadoCuentas.textContent = `Cuentas encontradas: ${usuarios.length}`;
        renderizarCuentas();
      } catch (error) {
        if (estadoCuentas) {
          mostrarEstado(
            estadoCuentas,
            `No se pudieron cargar las cuentas. ${error.message}`,
            "danger",
          );
        }
      } finally {
        promesaCuentasEnCurso = null;
      }
    })();
    return promesaCuentasEnCurso;
  }

  // Filtro por rol (grupo de botones con aria-pressed) y buscador: filtran en el cliente.
  grupoFiltros?.addEventListener("click", (evento) => {
    const boton = evento.target.closest?.("[data-rol]");
    if (!boton) return;
    rolFiltro = boton.dataset.rol;
    renderizarCuentas();
  });
  buscador?.addEventListener("input", renderizarCuentas);

  // Elegir otro rol marca la fila (ámbar, «Antes: …» y «Guardar»); volver al guardado lo quita.
  tablaCuentas?.addEventListener("change", (evento) => {
    const selector = evento.target;
    if (selector?.tagName !== "SELECT") return;
    const fila = selector.closest("tr");
    const usuario = mostradas[[...tablaCuentas.children].indexOf(fila)];
    if (!usuario) return;
    const { cambiado } = estadoCambioRol(usuario, selector.value);
    if (cambiado) pendientes.set(usuario.idUsuario, selector.value);
    else pendientes.delete(usuario.idUsuario);
    fila.classList.toggle("cuenta-modificada", cambiado);
    selector.classList.toggle("cuenta-rol-cambiado", cambiado);
    fila.querySelector(".cuenta-cambio").innerHTML = htmlCambioRol(usuario, selector.value);
  });

  // Delegación de eventos en tabla de cuentas
  tablaCuentas?.addEventListener("click", async (evento) => {
    const boton = evento.target.closest?.("[data-accion]");
    if (!boton || boton.disabled) return;
    const accion = boton.dataset ? boton.dataset.accion : boton.getAttribute("data-accion");
    const usuarioId = Number(boton.dataset ? boton.dataset.usuarioId : boton.getAttribute("data-usuario-id"));
    const usuarioNombre = (boton.dataset ? boton.dataset.usuarioNombre : boton.getAttribute("data-usuario-nombre")) || "usuario";
    if (!usuarioId) return;

    const fila = boton.closest ? boton.closest("tr") : boton.parentElement?.parentElement;

    if (accion === "guardar-rol") {
      const selector = fila?.querySelector?.("select");
      const nuevoRol = selector?.value;
      if (!nuevoRol) return;

      const textoOriginal = boton.textContent;
      boton.disabled = true;
      boton.textContent = "Guardando...";
      try {
        await cambiarRol(apiRequest, usuarioId, nuevoRol);
        pendientes.delete(usuarioId);
        mostrarToast(`Rol de ${usuarioNombre} actualizado a ${etiquetaRolCuenta(nuevoRol)}.`, "exito");
        if (estadoCuentas) {
          mostrarEstado(estadoCuentas, `Rol de ${usuarioNombre} actualizado.`, "success");
        }
        await cargarCuentas();
      } catch (error) {
        mostrarToast(`No se pudo cambiar el rol: ${error.message}`, "error");
        if (estadoCuentas) {
          mostrarEstado(estadoCuentas, `No se pudo cambiar el rol. ${error.message}`, "danger");
        }
      } finally {
        boton.disabled = false;
        boton.textContent = textoOriginal;
      }
    } else if (accion === "desactivar") {
      const confirmado = await mostrarConfirmacion({
        titulo: "Desactivar colaborador",
        mensaje: `¿Estás seguro de desactivar la cuenta de ${usuarioNombre}? El usuario perderá acceso al sistema.`,
        textoBoton: "Sí, desactivar cuenta",
        claseBoton: "btn-danger",
      });
      if (!confirmado) return;

      const textoOriginal = boton.textContent;
      boton.disabled = true;
      boton.textContent = "Desactivando...";
      try {
        await desactivarCuenta(apiRequest, usuarioId);
        pendientes.delete(usuarioId);
        mostrarToast(`Cuenta de ${usuarioNombre} desactivada.`, "exito");
        await cargarCuentas();
      } catch (error) {
        mostrarToast(`No se pudo desactivar la cuenta: ${error.message}`, "error");
        if (estadoCuentas) {
          mostrarEstado(estadoCuentas, `No se pudo desactivar la cuenta. ${error.message}`, "danger");
        }
        boton.disabled = false;
        boton.textContent = textoOriginal;
      }
    }
  });

  // Formulario alta de personal
  seccion.querySelector("#form-personal-admin")?.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    const formulario = evento.currentTarget;
    const boton = formulario.querySelector('button[type="submit"]');
    const datos = {
      nombre: seccion.querySelector("#personal-nombre").value.trim(),
      correo: seccion.querySelector("#personal-correo").value.trim(),
      clave: seccion.querySelector("#personal-clave").value,
      rol: seccion.querySelector("#personal-rol").value,
    };
    if (boton) boton.disabled = true;
    try {
      await registrarPersonal(apiRequest, datos);
      formulario.reset();
      mostrarToast(`Colaborador "${datos.nombre}" registrado exitosamente.`, "exito");
      if (estadoAlta) mostrarEstado(estadoAlta, "Cuenta creada correctamente.", "success");
      await cargarCuentas();
    } catch (error) {
      mostrarToast(`No se pudo crear la cuenta: ${error.message}`, "error");
      if (estadoAlta) {
        mostrarEstado(estadoAlta, `No se pudo crear la cuenta. ${error.message}`, "danger");
      }
    } finally {
      if (boton) boton.disabled = false;
    }
  });

  seccion.querySelector("#recargar-cuentas-admin")?.addEventListener("click", cargarCuentas);

  return {
    cargarCuentas,
  };
}
