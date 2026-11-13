/**
 * Menú de acciones compacto ("Gestionar ▾") para tarjetas y filas del personal.
 *
 * Revisión UX (punto 7): las tarjetas del vendedor mostraban cuatro botones pequeños
 * (Movimientos, Ajustar stock, Editar precio, Editar ficha) difíciles de leer y pulsar.
 * Este menú los agrupa tras un solo botón de 44 px. Es un componente propio y no un
 * dropdown de Bootstrap para no depender de su API de datos ni de Popper.
 *
 * Accesibilidad: botón con aria-haspopup/aria-expanded/aria-controls, lista con
 * role="menu", Escape cierra y devuelve el foco, flechas recorren las opciones y un
 * clic fuera lo cierra.
 */

let contadorMenus = 0;

/**
 * @param {object} opciones
 * @param {string} [opciones.etiqueta="Gestionar"] - Texto visible del botón
 * @param {string} [opciones.nombreAccesible] - Nombre para lectores (p. ej. "Gestionar Mouse M170")
 * @param {{texto: string, alElegir: Function, peligro?: boolean}[]} opciones.acciones
 * @returns {HTMLElement} Contenedor del menú
 */
export function crearMenuAcciones({ etiqueta = "Gestionar", nombreAccesible, acciones = [] }) {
  contadorMenus += 1;
  const idLista = `menu-acciones-${contadorMenus}`;

  const contenedor = document.createElement("div");
  contenedor.className = "menu-acciones";

  const boton = document.createElement("button");
  boton.type = "button";
  boton.className = "btn btn-outline-dark btn-sm menu-acciones-boton";
  boton.textContent = `${etiqueta} ▾`;
  boton.setAttribute("aria-haspopup", "menu");
  boton.setAttribute("aria-expanded", "false");
  boton.setAttribute("aria-controls", idLista);
  if (nombreAccesible) boton.setAttribute("aria-label", nombreAccesible);

  const lista = document.createElement("ul");
  lista.id = idLista;
  lista.className = "menu-acciones-lista";
  lista.setAttribute("role", "menu");
  lista.hidden = true;

  const items = acciones.map((accion) => {
    const li = document.createElement("li");
    li.setAttribute("role", "none");
    const item = document.createElement("button");
    item.type = "button";
    item.className = accion.peligro
      ? "menu-acciones-item menu-acciones-item-peligro"
      : "menu-acciones-item";
    item.setAttribute("role", "menuitem");
    item.textContent = accion.texto;
    item.addEventListener("click", (evento) => {
      evento.stopPropagation();
      // El foco vuelve al botón "Gestionar": si la acción abre un modal, al cerrarlo el
      // teclado regresa aquí y no a <body> (RNF06).
      cerrar(true);
      accion.alElegir?.();
    });
    li.append(item);
    lista.append(li);
    return item;
  });

  function alClicFuera(evento) {
    if (!contenedor.contains?.(evento.target)) cerrar(false);
  }

  function alTecla(evento) {
    if (evento.key === "Escape") {
      evento.preventDefault?.();
      cerrar(true);
      return;
    }
    if (evento.key !== "ArrowDown" && evento.key !== "ArrowUp") return;
    evento.preventDefault?.();
    const actual = items.indexOf(document.activeElement);
    const paso = evento.key === "ArrowDown" ? 1 : -1;
    const siguiente = (actual + paso + items.length) % items.length;
    items[siguiente]?.focus?.();
  }

  function abrir() {
    lista.hidden = false;
    boton.setAttribute("aria-expanded", "true");
    document.addEventListener("click", alClicFuera);
    document.addEventListener("keydown", alTecla);
    items[0]?.focus?.();
  }

  function cerrar(devolverFoco) {
    if (lista.hidden) return;
    lista.hidden = true;
    boton.setAttribute("aria-expanded", "false");
    document.removeEventListener("click", alClicFuera);
    document.removeEventListener("keydown", alTecla);
    if (devolverFoco) boton.focus?.();
  }

  boton.addEventListener("click", (evento) => {
    evento.stopPropagation();
    if (lista.hidden) abrir();
    else cerrar(false);
  });

  contenedor.append(boton, lista);
  return contenedor;
}
