/**
 * @file admin-usuarios.js
 * Submódulo de administración de colaboradores, cuentas y asignación de roles.
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
import { etiquetarCeldas } from "../utilidades/tabla-apilable.js";
import { crearElemento } from "../utilidades/dom.js";
import { ROLES } from "../utilidades/constantes.js";

export const ETIQUETAS_COLUMNAS_CUENTAS = [
  "Nombre",
  "Correo",
  "Rol",
  "Alta",
  "Estado",
  "Acciones",
];

/**
 * Inicializa la gestión de cuentas y colaboradores en el panel de administración.
 * @param {Object} params
 * @param {HTMLElement} params.seccion
 * @param {Function} params.apiRequest
 * @param {Function} params.mostrarEstado
 * @returns {{ cargarCuentas: () => Promise<void> }}
 */
export function inicializarAdminUsuarios({ seccion, apiRequest, mostrarEstado }) {
  const tablaCuentas = seccion.querySelector("#tabla-cuentas-admin");
  const estadoCuentas = seccion.querySelector("#estado-cuentas-admin");
  const filtroRolCuentas = seccion.querySelector("#filtro-rol-cuentas");
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

  function renderizarCuentas() {
    if (!tablaCuentas) return;
    const rolFiltro = filtroRolCuentas ? filtroRolCuentas.value : "";
    const filtrados = rolFiltro
      ? usuariosCache.filter((u) => u.rol === rolFiltro)
      : usuariosCache;

    if (filtrados.length === 0) {
      const fila = document.createElement("tr");
      const celda = crearElemento(
        "td",
        "text-center text-muted py-3",
        rolFiltro
          ? `No se encontraron cuentas con el rol "${rolFiltro}".`
          : "No hay cuentas registradas.",
      );
      celda.colSpan = 6;
      fila.append(celda);
      tablaCuentas.replaceChildren(fila);
      return;
    }

    const filas = [];
    for (const usuario of filtrados) {
      const fila = document.createElement("tr");
      fila.append(
        crearElemento("td", "", usuario.nombre),
        crearElemento("td", "", usuario.correo),
      );
      const celdaRol = document.createElement("td");
      const selector = document.createElement("select");
      selector.className = "form-select form-select-sm";
      selector.setAttribute("aria-label", `Rol de ${usuario.nombre}`);
      for (const rol of ROLES) {
        const opcion = crearElemento("option", "", rol);
        opcion.value = rol;
        opcion.selected = usuario.rol === rol;
        selector.append(opcion);
      }
      celdaRol.append(selector);
      fila.append(celdaRol);
      fila.append(
        crearElemento(
          "td",
          "small",
          usuario.fechaAlta
            ? new Date(usuario.fechaAlta).toLocaleDateString("es-PE")
            : "—",
        ),
      );
      fila.append(
        crearElemento("td", "", usuario.activo ? "Activa" : "Desactivada"),
      );
      const acciones = document.createElement("td");
      acciones.className = "d-flex gap-1";
      if (usuario.activo) {
        const guardar = crearElemento(
          "button",
          "btn btn-outline-primary btn-sm",
          "Guardar rol",
        );
        guardar.type = "button";
        guardar.setAttribute("data-accion", "guardar-rol");
        guardar.setAttribute("data-usuario-id", String(usuario.idUsuario));
        guardar.setAttribute("data-usuario-nombre", usuario.nombre);
        if (guardar.dataset) {
          guardar.dataset.accion = "guardar-rol";
          guardar.dataset.usuarioId = String(usuario.idUsuario);
          guardar.dataset.usuarioNombre = usuario.nombre;
        }

        const desactivar = crearElemento(
          "button",
          "btn btn-outline-danger btn-sm",
          "Desactivar",
        );
        desactivar.type = "button";
        desactivar.setAttribute("data-accion", "desactivar");
        desactivar.setAttribute("data-usuario-id", String(usuario.idUsuario));
        desactivar.setAttribute("data-usuario-nombre", usuario.nombre);
        if (desactivar.dataset) {
          desactivar.dataset.accion = "desactivar";
          desactivar.dataset.usuarioId = String(usuario.idUsuario);
          desactivar.dataset.usuarioNombre = usuario.nombre;
        }

        acciones.append(guardar, desactivar);
      }
      fila.append(acciones);
      etiquetarCeldas(fila, ETIQUETAS_COLUMNAS_CUENTAS);
      filas.push(fila);
    }
    tablaCuentas.replaceChildren(...filas);
  }

  async function cargarCuentas() {
    if (promesaCuentasEnCurso) return promesaCuentasEnCurso;
    promesaCuentasEnCurso = (async () => {
      if (estadoCuentas) estadoCuentas.textContent = "Cargando cuentas...";
      try {
        const usuarios = await listarCuentas(apiRequest);
        usuariosCache = usuarios;
        const total = usuarios.length;
        if (estadoCuentas) estadoCuentas.textContent = `Cuentas encontradas: ${total}`;
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
        mostrarToast(`Rol de ${usuarioNombre} actualizado a ${nuevoRol}.`, "exito");
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
        mostrarToast(`Cuenta de ${usuarioNombre} desactivada.`, "exito");
        await cargarCuentas();
      } catch (error) {
        mostrarToast(`No se pudo desactivar la cuenta: ${error.message}`, "error");
        if (estadoCuentas) {
          mostrarEstado(estadoCuentas, `No se pudo desactivar la cuenta. ${error.message}`, "danger");
        }
      } finally {
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
  filtroRolCuentas?.addEventListener("change", renderizarCuentas);

  return {
    cargarCuentas,
  };
}
