/**
 * @file dock-cuenta.js
 * Menú rápido contextual «Mi cuenta» para el botón `#dock-btn-usuario` del dock lateral.
 * - Invitado (sin sesión): conserva el enlace a `/login.html` («Iniciar sesión»).
 * - Con sesión activa: abre una tarjeta compacta con nombre, correo, rol y accesos directos
 *   (Mis compras, Mi atención, Favoritos o Panel del personal) más Cerrar sesión.
 */

import { ROL } from "../utilidades/constantes.js";
import { crearElemento as el } from "../utilidades/dom.js";
import { esPersonal } from "../panel/acceso.js";

/**
 * Configura el comportamiento contextual de `#dock-btn-usuario` y su tarjeta de cuenta.
 * @param {Object} opciones
 * @returns {{ actualizar: (usuario: object|null) => void, cerrar: () => void }}
 */
export function configurarDockCuenta({
  dockBtnUsuario,
  obtenerUsuarioSesion,
  acciones = {},
}) {
  if (!dockBtnUsuario || typeof document === "undefined") {
    return { actualizar() {}, cerrar() {} };
  }

  const {
    irAMisCompras,
    irAMiAtencion,
    irAFavoritos,
    cerrarSesion,
  } = acciones;

  const menu = el("div", "dock-cuenta-menu");
  menu.id = "dock-menu-cuenta";
  menu.hidden = true;
  menu.setAttribute("role", "dialog");
  menu.setAttribute("aria-labelledby", "dock-cuenta-nombre");

  const cabecera = el("div", "dock-cuenta-cabecera");
  const nombreEl = el("p", "dock-cuenta-nombre");
  nombreEl.id = "dock-cuenta-nombre";
  const correoEl = el("p", "dock-cuenta-correo");
  correoEl.id = "dock-cuenta-correo";
  const rolEl = el("span", "dock-cuenta-rol");
  rolEl.id = "dock-cuenta-rol";
  cabecera.append(nombreEl, correoEl, rolEl);

  const listaAcciones = el("div", "dock-cuenta-acciones");
  listaAcciones.id = "dock-cuenta-acciones";

  const pie = el("div", "dock-cuenta-pie");
  const botonSalir = el("button", "dock-cuenta-btn dock-cuenta-salir", "Cerrar sesión");
  botonSalir.type = "button";
  botonSalir.addEventListener("click", () => {
    cerrar();
    void cerrarSesion?.();
  });
  pie.append(botonSalir);

  menu.append(cabecera, listaAcciones, pie);
  dockBtnUsuario.after?.(menu);

  let abierto = false;

  function cerrar({ devolverFoco = false } = {}) {
    if (!abierto && menu.hidden) return;
    abierto = false;
    menu.hidden = true;
    dockBtnUsuario.classList?.remove("esta-activa");
    if (obtenerUsuarioSesion?.()) {
      dockBtnUsuario.setAttribute("aria-expanded", "false");
    }
    if (devolverFoco) {
      dockBtnUsuario.focus?.();
    }
  }

  function abrir() {
    if (!obtenerUsuarioSesion?.()) return;
    abierto = true;
    menu.hidden = false;
    dockBtnUsuario.classList?.add("esta-activa");
    dockBtnUsuario.setAttribute("aria-expanded", "true");
    const primero = listaAcciones.querySelector?.("a, button") ?? botonSalir;
    primero?.focus?.();
  }

  function crearAccionBoton(texto, alPulsar) {
    const boton = el("button", "dock-cuenta-btn", texto);
    boton.type = "button";
    boton.addEventListener("click", () => {
      cerrar();
      alPulsar?.();
    });
    return boton;
  }

  function actualizar(usuario) {
    cerrar();
    if (!usuario) {
      dockBtnUsuario.setAttribute("href", "/login.html");
      dockBtnUsuario.setAttribute("title", "Iniciar sesión");
      dockBtnUsuario.setAttribute("aria-label", "Iniciar sesión");
      dockBtnUsuario.removeAttribute("aria-haspopup");
      dockBtnUsuario.removeAttribute("aria-expanded");
      dockBtnUsuario.removeAttribute("aria-controls");
      listaAcciones.replaceChildren();
      return;
    }

    const nombre = usuario.nombre || "Usuario";
    const destinoBase = usuario.rol === ROL.CLIENTE ? "#/pedidos" : "/panel.html#/inicio";
    dockBtnUsuario.setAttribute("href", destinoBase);
    dockBtnUsuario.setAttribute("title", `Mi cuenta · ${nombre}`);
    dockBtnUsuario.setAttribute("aria-label", `Mi cuenta (${nombre})`);
    dockBtnUsuario.setAttribute("aria-haspopup", "dialog");
    dockBtnUsuario.setAttribute("aria-expanded", "false");
    dockBtnUsuario.setAttribute("aria-controls", "dock-menu-cuenta");

    nombreEl.textContent = nombre;
    correoEl.textContent = usuario.correo || "";
    rolEl.textContent = usuario.rol || "";

    const botones = [];
    if (usuario.rol === ROL.CLIENTE) {
      botones.push(
        crearAccionBoton("Mis compras", irAMisCompras),
        crearAccionBoton("Mi atención", irAMiAtencion),
        crearAccionBoton("Favoritos", irAFavoritos),
      );
    } else if (esPersonal(usuario.rol)) {
      const enlacePanel = el("a", "dock-cuenta-btn", "Ir al panel");
      enlacePanel.setAttribute("href", "/panel.html#/inicio");
      enlacePanel.addEventListener("click", () => cerrar());
      botones.push(enlacePanel);
    }
    listaAcciones.replaceChildren(...botones);
  }

  dockBtnUsuario.addEventListener("click", (evento) => {
    const usuario = obtenerUsuarioSesion?.();
    if (!usuario) return;
    evento.preventDefault();
    evento.stopPropagation?.();
    if (abierto) cerrar();
    else abrir();
  });

  menu.addEventListener("click", (evento) => {
    evento.stopPropagation?.();
  });

  document.addEventListener("click", (evento) => {
    if (!abierto) return;
    if (evento.target !== dockBtnUsuario && !menu.contains?.(evento.target)) {
      cerrar();
    }
  });

  document.addEventListener("keydown", (evento) => {
    if (abierto && evento.key === "Escape") {
      cerrar({ devolverFoco: true });
    }
  });

  return { actualizar, cerrar };
}
