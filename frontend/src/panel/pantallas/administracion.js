/**
 * @file administracion.js
 * Panel del personal (T09, decisión P5): #/categorias, #/cuentas, #/reportes e #/incidencias
 * comparten **una sola** instancia de crearPanelAdministracion (con Incidencias como sección
 * agregada, igual que en la tienda) dentro del HTML compartido #vista-administracion. Cada ruta
 * tiene su <h1>, se lleva el módulo a su contenedor y activa su sección con mostrarSeccion(),
 * que el propio módulo expone. La barra de pestañas interna y, salvo en Reportes, los
 * indicadores internos se ocultan desde panel.css.
 * Con #/cuentas?alta=1 lleva el foco al primer campo del alta y reescribe el hash a #/cuentas.
 *
 * Carga diferida: los módulos de administración se piden con import() una sola vez (se guarda
 * la promesa) y se monta una sola instancia. Si mientras llega el usuario cambió de ruta, se
 * monta pero no se muestra ni se recarga la sección de una ruta que ya no está activa.
 */

import { html, seguro } from "../../utilidades/seguridad.js";
import { renderizarVistaAdministracion } from "../../layout/vistas-personal.js";
import { renderizarCargando } from "../inicio/piezas-inicio.js";

export const RUTA_CUENTAS = "#/cuentas";

export const TITULO_POR_RUTA = Object.freeze({
  "#/categorias": "Categorías",
  "#/cuentas": "Cuentas y roles",
  "#/reportes": "Reportes",
  "#/incidencias": "Incidencias",
});

const SECCION_POR_RUTA = Object.freeze({
  "#/categorias": "categorias",
  "#/cuentas": "cuentas",
  "#/reportes": "reportes",
  "#/incidencias": "incidencias",
});

/** Primer campo del formulario de alta de personal (plantillas/administracion.html). */
const SELECTOR_PRIMER_CAMPO_ALTA = "#form-personal-admin #personal-nombre";

/** Sección del módulo que activa la ruta; null si no es una ruta de administración. */
export function seccionDeRuta(ruta) {
  return SECCION_POR_RUTA[ruta] ?? null;
}

/** ¿La ruta pide abrir el alta de cuentas? */
export function pideAlta(parametros) {
  return parametros?.alta === "1";
}

/**
 * panel-administracion.js trae su plantilla con «?raw» (solo la entiende Vite): se carga con
 * import() para que esta pantalla se pueda importar en Node y el módulo pesado llegue solo
 * cuando hace falta.
 */
async function cargarModulosAdministracion() {
  const [{ crearPanelAdministracion }, { crearPanelIncidencias }] = await Promise.all([
    import("../../administracion/panel-administracion.js"),
    import("../../administracion/incidencias-vista.js"),
  ]);
  return { crearPanelAdministracion, crearPanelIncidencias };
}

/**
 * Pantalla de Administración con su instancia única. Las dependencias se inyectan para poder
 * probar la carga diferida.
 * @param {{ cargarModulos?: Function, documento?: Document }} [dependencias]
 */
export function crearPantallaAdministracion({ cargarModulos = cargarModulosAdministracion, documento = globalThis.document } = {}) {
  /** Promesa única de la instancia (import + montaje), compartida por las cuatro rutas. */
  let promesaInstancia = null;

  function obtenerInstancia({ apiRequest, mostrarToast, cambiosProductos }) {
    promesaInstancia ??= cargarModulos().then(({ crearPanelAdministracion, crearPanelIncidencias }) => {
      const plantilla = documento.createElement("div");
      plantilla.innerHTML = renderizarVistaAdministracion();
      const vista = plantilla.firstElementChild;
      // Mismo mecanismo que la tienda: la vista se muestra quitando el atributo hidden.
      vista.hidden = false;
      // En la tienda, cambiar categorías recargaba el catálogo; en el panel se avisa del cambio.
      const administracion = crearPanelAdministracion(apiRequest, async () => cambiosProductos?.avisar("categorias"));
      administracion.element.hidden = false;
      const incidencias = crearPanelIncidencias(apiRequest, mostrarToast);
      incidencias.element.hidden = false;
      administracion.agregarSeccion({ id: "incidencias", etiqueta: "Incidencias", elemento: incidencias.element });
      vista.append(administracion.element);
      return { vista, administracion, incidencias };
    });
    return promesaInstancia;
  }

  /**
   * @param {HTMLElement} contenedor
   * @param {{ entrada: { ruta: string }, servicios: object, estaVisible?: () => boolean }} contexto
   */
  function montar(contenedor, { entrada, servicios, estaVisible = () => true }) {
    const { ruta } = entrada;
    const seccion = seccionDeRuta(ruta);
    contenedor.innerHTML = html`<h1 class="panel-titulo">${TITULO_POR_RUTA[ruta]}</h1>
<div data-cargando>${seguro(renderizarCargando())}</div>`;

    return {
      async alMostrar(parametros) {
        const { vista, administracion, incidencias } = await obtenerInstancia(servicios);
        // Si el usuario ya está en otra ruta, la instancia queda montada, pero no se muestra
        // ni se recarga la sección de esta ruta.
        if (!estaVisible()) return;
        // Quita «Cargando…» sin rehacer el <h1>, que ya tiene el foco.
        contenedor.querySelector("[data-cargando]")?.remove();
        contenedor.append(vista); // mueve la única instancia a la ruta visible (ids sin duplicar)
        administracion.mostrarSeccion(seccion);
        if (ruta === RUTA_CUENTAS && pideAlta(parametros)) {
          contenedor.querySelector(SELECTOR_PRIMER_CAMPO_ALTA)?.focus();
          // Reemplaza el hash para que recargar no vuelva a pedir el alta.
          servicios.reemplazarRuta?.(RUTA_CUENTAS);
        }
        // El módulo no recarga por sección: Incidencias tiene su propio cargar(); las demás
        // secciones se recargan juntas con cargar() del panel de administración.
        await (seccion === "incidencias" ? incidencias.cargar() : administracion.cargar());
      },
    };
  }

  return { montar };
}

/** Pantalla que usa el router: una sola instancia para las cuatro rutas. */
export const { montar } = crearPantallaAdministracion();
