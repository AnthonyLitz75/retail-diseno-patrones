/**
 * @file consultas.js
 * Panel del personal (T07): #/consultas monta la bandeja de preguntas del vendedor existente
 * (configurarBandejaVendedor) sobre el mismo HTML que la tienda (vistas-personal.js).
 */

import { renderizarVistaConsultas } from "../../layout/vistas-personal.js";
import { configurarBandejaVendedor } from "../../vendedor/vendedor-vista.js";
import { encabezadoPantalla } from "./titulo-pantalla.js";

/** Ids que usa el módulo, en el orden de sus `elementos` (los mismos que en main.js). */
export const IDS_CONSULTAS = Object.freeze([
  "seccion-preguntas-vendedor",
  "estado-preguntas-vendedor",
  "lista-preguntas-vendedor",
  "actualizar-preguntas-vendedor",
]);

/**
 * @param {HTMLElement} contenedor
 * @param {{ entrada: { etiqueta: string }, servicios: { apiRequest: Function, estado: object, mostrarToast: Function } }} contexto
 */
export function montar(contenedor, { entrada, servicios }) {
  const { apiRequest, estado, mostrarToast } = servicios;
  contenedor.innerHTML = `${encabezadoPantalla(entrada)}${renderizarVistaConsultas()}`;
  contenedor.querySelector("#vista-consultas").hidden = false;
  const [seccionPreguntasVendedor, estadoPreguntasVendedor, listaPreguntasVendedor, btnActualizarPreguntas] =
    IDS_CONSULTAS.map((id) => contenedor.querySelector(`#${id}`));

  const controlador = configurarBandejaVendedor({
    apiRequest,
    obtenerEstado: () => estado,
    elementos: { seccionPreguntasVendedor, estadoPreguntasVendedor, listaPreguntasVendedor, btnActualizarPreguntas },
    acciones: { mostrarToast },
  });

  return {
    async alMostrar(parametros) {
      await controlador.cargarPreguntasVendedor();
      if (parametros?.consulta) {
        controlador.enfocarConsulta(parametros.consulta);
        servicios.reemplazarRuta?.("#/consultas");
      }
    },
  };
}
