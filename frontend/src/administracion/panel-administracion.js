/**
 * @file panel-administracion.js
 * Coordinador y Fachada del panel de administración general.
 * Orquesta los submódulos cohesivos:
 * - admin-usuarios.js (cuentas y roles)
 * - admin-categorias.js (categorías del catálogo)
 * - admin-reportes.js (métricas y exportación CSV)
 */

import {
  cargarResumenAdmin,
  indicadoresDestacados,
} from "./administracion.js";
import { etiquetarCeldas } from "../utilidades/tabla-apilable.js";
import {
  ETIQUETAS_COLUMNAS_CUENTAS,
  inicializarAdminUsuarios,
} from "./admin-usuarios.js";
import { inicializarAdminCategorias } from "./admin-categorias.js";
import { inicializarAdminReportes } from "./admin-reportes.js";
import { crearPestanasSecciones } from "../utilidades/pestanas-secciones.js";
import plantillaAdministracion from "../layout/plantillas/administracion.html?raw";
import { crearElemento } from "../utilidades/dom.js";

export { ETIQUETAS_COLUMNAS_CUENTAS, etiquetarCeldas };

function mostrarEstado(elemento, texto, tipo = "secondary") {
  elemento.className = `small mt-2 mb-0 text-${tipo}`;
  elemento.textContent = texto;
  elemento.setAttribute?.("role", tipo === "danger" ? "alert" : "status");
  elemento.setAttribute?.("aria-live", "polite");
}

/**
 * Crea y configura el panel de administración integrando sus tres submódulos.
 * @param {Function} apiRequest
 * @param {Function} alCambiarCategorias
 * @returns {{
 *   element: HTMLElement,
 *   agregarSeccion: (seccion: Object) => void,
 *   mostrarSeccion: (id: string) => void,
 *   cargar: () => Promise<void>
 * }}
 */
export function crearPanelAdministracion(apiRequest, alCambiarCategorias) {
  const seccion = document.createElement("section");
  seccion.id = "seccion-administracion";
  seccion.className = "card shadow-sm mb-4";
  seccion.setAttribute("aria-labelledby", "titulo-administracion");
  seccion.hidden = true;
  seccion.innerHTML = plantillaAdministracion;

  // Submódulos especializados por dominio de administración:
  // - Usuarios y roles: la tabla apilable etiqueta celdas con etiquetarCeldas(fila, ETIQUETAS_COLUMNAS_CUENTAS)
  const moduloUsuarios = inicializarAdminUsuarios({
    seccion,
    apiRequest,
    mostrarEstado,
  });

  const moduloCategorias = inicializarAdminCategorias({
    seccion,
    apiRequest,
    alCambiarCategorias,
    mostrarEstado,
  });

  const moduloReportes = inicializarAdminReportes({
    seccion,
    apiRequest,
    mostrarEstado,
  });

  // Revisión UX (punto 8): una sección por vez, con pestañas bajo el título.
  const pestanas = crearPestanasSecciones({
    etiquetaGrupo: "Secciones de administración",
    prefijo: "pestana-admin",
  });

  // Boceto del panel: cuatro indicadores sin rango de fechas sobre las pestañas.
  const indicadores = crearElemento("div", "indicadores-admin");
  indicadores.setAttribute("aria-label", "Indicadores generales de la tienda");
  indicadores.setAttribute("role", "region");
  seccion.querySelector("#titulo-administracion")?.after(indicadores, pestanas.element);

  async function cargarIndicadores() {
    try {
      const resumen = await cargarResumenAdmin(apiRequest, "");
      indicadores.replaceChildren(
        ...indicadoresDestacados(resumen).map(({ etiqueta, valor, nota }) => {
          const tarjeta = crearElemento("article", "indicador-admin");
          tarjeta.append(
            crearElemento("p", "indicador-admin-etiqueta", etiqueta),
            crearElemento("p", "indicador-admin-valor", valor),
            crearElemento("p", "indicador-admin-nota", nota),
          );
          return tarjeta;
        }),
      );
    } catch {
      // Sin indicadores la administración sigue funcionando; el detalle está en Reportes.
      indicadores.replaceChildren();
    }
  }

  for (const [id, etiqueta] of [
    ["cuentas", "Cuentas"],
    ["categorias", "Categorías"],
    ["reportes", "Reportes"],
  ]) {
    const elemento = seccion.querySelector(`#admin-seccion-${id}`);
    if (elemento) pestanas.agregar({ id, etiqueta, elemento });
  }

  return {
    element: seccion,
    /**
     * Suma como pestaña un panel construido fuera (p. ej. incidencias) y lo mueve
     * dentro de la tarjeta de administración.
     */
    agregarSeccion({ id, etiqueta, elemento }) {
      elemento.classList.add("seccion-admin-incrustada");
      seccion.querySelector(".card-body")?.append(elemento);
      pestanas.agregar({ id, etiqueta, elemento });
    },
    mostrarSeccion: (id) => pestanas.mostrar(id),
    async cargar() {
      await Promise.all([
        cargarIndicadores(),
        moduloUsuarios.cargarCuentas(),
        moduloCategorias.cargarCategorias(),
        moduloReportes.consultarReporte(),
      ]);
    },
  };
}
