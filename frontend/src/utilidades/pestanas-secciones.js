/**
 * Pestañas que muestran una sección a la vez dentro de un panel largo.
 *
 * Revisión UX (punto 8): Administración apilaba cuentas, categorías, reportes e
 * incidencias en una página de más de tres pantallas. Con estas pestañas se ve una
 * sección por vez. La sección oculta usa la clase `seccion-oculta` y no el atributo
 * `hidden`, para no chocar con el código que ya muestra u oculta paneles por rol.
 *
 * Accesibilidad: patrón "tabs" de WAI-ARIA (role tablist/tab/tabpanel, aria-selected,
 * tabindex itinerante, flechas izquierda/derecha, Inicio y Fin).
 */

/**
 * @param {object} opciones
 * @param {string} opciones.etiquetaGrupo - Nombre accesible de la barra de pestañas
 * @param {string} [opciones.prefijo="pestana"] - Prefijo para los id de las pestañas
 */
export function crearPestanasSecciones({ etiquetaGrupo, prefijo = "pestana" }) {
  const barra = document.createElement("div");
  barra.className = "nav nav-underline flex-nowrap pestanas-secciones";
  barra.setAttribute("role", "tablist");
  barra.setAttribute("aria-label", etiquetaGrupo);

  const secciones = [];
  let actual = null;

  function mostrar(id) {
    const destino = secciones.find((s) => s.id === id);
    if (!destino) return;
    actual = id;
    for (const seccion of secciones) {
      const activa = seccion.id === id;
      seccion.boton.setAttribute("aria-selected", String(activa));
      seccion.boton.tabIndex = activa ? 0 : -1;
      seccion.boton.classList.toggle("active", activa);
      seccion.elemento.classList.toggle("seccion-oculta", !activa);
    }
  }

  function agregar({ id, etiqueta, elemento }) {
    const boton = document.createElement("button");
    boton.type = "button";
    boton.id = `${prefijo}-${id}`;
    boton.className = "nav-link";
    boton.textContent = etiqueta;
    boton.setAttribute("role", "tab");
    if (elemento.id) boton.setAttribute("aria-controls", elemento.id);
    elemento.setAttribute("role", "tabpanel");
    boton.addEventListener("click", () => mostrar(id));
    barra.append(boton);
    secciones.push({ id, boton, elemento });
    if (secciones.length === 1) mostrar(id);
    else mostrar(actual);
  }

  barra.addEventListener("keydown", (evento) => {
    const indice = secciones.findIndex((s) => s.id === actual);
    if (indice < 0) return;
    let destino = null;
    if (evento.key === "ArrowRight") destino = (indice + 1) % secciones.length;
    else if (evento.key === "ArrowLeft") destino = (indice - 1 + secciones.length) % secciones.length;
    else if (evento.key === "Home") destino = 0;
    else if (evento.key === "End") destino = secciones.length - 1;
    if (destino === null) return;
    evento.preventDefault?.();
    mostrar(secciones[destino].id);
    secciones[destino].boton.focus?.();
  });

  return { element: barra, agregar, mostrar, activa: () => actual };
}
