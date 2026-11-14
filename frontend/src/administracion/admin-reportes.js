/**
 * @file admin-reportes.js
 * Submódulo de reportes administrativos, métricas de rendimiento y exportación a CSV.
 */

import {
  cargarResumenAdmin,
  crearParametrosReporte,
  REPORTES_CSV,
  solicitarCsv,
  tarjetasResumen,
} from "./administracion.js";
import { crearElemento } from "../utilidades/dom.js";

/**
 * Inicializa el submódulo de reportes en el panel de administración.
 * @param {Object} params
 * @param {HTMLElement} params.seccion
 * @param {Function} params.apiRequest
 * @param {Function} params.mostrarEstado
 * @returns {{ consultarReporte: (evento?: Event) => Promise<void> }}
 */
export function inicializarAdminReportes({ seccion, apiRequest, mostrarEstado }) {
  const estadoReporte = seccion.querySelector("#estado-reporte-admin");
  if (estadoReporte) {
    estadoReporte.setAttribute?.("role", "status");
    estadoReporte.setAttribute?.("aria-live", "polite");
  }
  const metricas = seccion.querySelector("#metricas-admin");
  const ultimosMovimientos = seccion.querySelector("#ultimos-movimientos-admin");
  let promesaReporteEnCurso = null;

  function renderizarUltimosMovimientos(movimientos) {
    if (!ultimosMovimientos) return;
    const lista = Array.isArray(movimientos) ? movimientos : [];
    if (lista.length === 0) {
      const fila = document.createElement("tr");
      const celda = crearElemento("td", "text-muted", "Sin movimientos en el periodo.");
      celda.colSpan = 6;
      fila.append(celda);
      ultimosMovimientos.replaceChildren(fila);
      return;
    }
    ultimosMovimientos.replaceChildren(
      ...lista.map((m) => {
        const fila = document.createElement("tr");
        fila.append(
          crearElemento("td", "", new Date(m.fecha).toLocaleString("es-PE")),
          crearElemento("td", "font-monospace", m.sku || ""),
          crearElemento("td", "", m.tipo),
          crearElemento(
            "td",
            m.cantidad < 0 ? "text-danger" : "text-success",
            String(m.cantidad),
          ),
          crearElemento("td", "", m.motivo || ""),
          crearElemento("td", "", m.responsable || "—"),
        );
        return fila;
      }),
    );
  }

  async function consultarReporte(evento) {
    evento?.preventDefault();
    if (promesaReporteEnCurso) return promesaReporteEnCurso;
    promesaReporteEnCurso = (async () => {
      if (estadoReporte) estadoReporte.textContent = "Consultando reporte...";
      try {
        const desde = seccion.querySelector("#reporte-desde")?.value || "";
        const hasta = seccion.querySelector("#reporte-hasta")?.value || "";
        const consulta = crearParametrosReporte(desde, hasta);
        const resumen = await cargarResumenAdmin(apiRequest, consulta);
        const columnas = [];
        for (const [etiqueta, valor] of tarjetasResumen(resumen)) {
          const columna = crearElemento("div", "col-12 col-sm-6 col-lg-4");
          const tarjeta = crearElemento("article", "border rounded p-3 h-100");
          tarjeta.append(
            crearElemento("p", "small text-secondary mb-1", etiqueta),
            crearElemento("strong", "", String(valor)),
          );
          columna.append(tarjeta);
          columnas.push(columna);
        }
        if (metricas) metricas.replaceChildren(...columnas);
        renderizarUltimosMovimientos(resumen.ultimosMovimientos);
        if (estadoReporte) mostrarEstado(estadoReporte, "Reporte actualizado.", "success");
      } catch (error) {
        if (estadoReporte) {
          mostrarEstado(
            estadoReporte,
            `No se pudo consultar el reporte. ${error.message}`,
            "danger",
          );
        }
      } finally {
        promesaReporteEnCurso = null;
      }
    })();
    return promesaReporteEnCurso;
  }

  seccion.querySelector("#form-reporte-admin")?.addEventListener("submit", consultarReporte);

  seccion.querySelectorAll("[data-reporte-csv]").forEach((botonCsv) => {
    botonCsv.addEventListener("click", async () => {
      const tipo = botonCsv.dataset.reporteCsv;
      botonCsv.disabled = true;
      try {
        const desde = seccion.querySelector("#reporte-desde")?.value || "";
        const hasta = seccion.querySelector("#reporte-hasta")?.value || "";
        const consulta = crearParametrosReporte(desde, hasta);
        const respuesta = await solicitarCsv(apiRequest, tipo, consulta);
        const url = URL.createObjectURL(await respuesta.blob());
        const enlace = document.createElement("a");
        enlace.href = url;
        enlace.download = REPORTES_CSV[tipo].archivo;
        enlace.click();
        URL.revokeObjectURL(url);
        if (estadoReporte) {
          mostrarEstado(
            estadoReporte,
            `Archivo ${REPORTES_CSV[tipo].archivo} descargado.`,
            "success",
          );
        }
      } catch (error) {
        if (estadoReporte) {
          mostrarEstado(
            estadoReporte,
            `No se pudo descargar el CSV. ${error.message}`,
            "danger",
          );
        }
      } finally {
        botonCsv.disabled = false;
      }
    });
  });

  return {
    consultarReporte,
  };
}
