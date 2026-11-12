/**
 * @file auditoria-vista.js
 * Pestaña "Auditoría" de Administración: el administrador consulta quién hizo qué y cuándo
 * (guía §2, "consultar auditoría"), filtra por fechas, acción y usuario, pagina y descarga
 * el CSV. Todo el texto entra por textContent: un detalle con HTML se muestra tal cual.
 */

import { crearElemento as el } from "../utilidades/dom.js";
import { etiquetarCeldas } from "../utilidades/tabla-apilable.js";
import { crearControlesPaginacionKardex } from "../inventario/inventario-vista.js";

export const TAMANO_PAGINA_AUDITORIA = 20;
const COLUMNAS = ["Fecha", "Usuario", "Acción", "Entidad", "Detalle"];
const FORMATO_FECHA = { dateStyle: "short", timeStyle: "short" };

/**
 * Parámetros de consulta de la auditoría (los vacíos no se envían).
 * @param {{desde?: string, hasta?: string, accion?: string, usuario?: string, pagina?: number, tamano?: number}} filtros
 * @returns {string}
 */
export function crearConsultaAuditoria(filtros = {}) {
  const { desde, hasta, accion, usuario, pagina, tamano } = filtros;
  if (desde && hasta && desde > hasta) {
    throw new TypeError(
      "La fecha inicial no puede ser posterior a la fecha final.",
    );
  }
  const parametros = new URLSearchParams();
  if (desde) parametros.set("desde", desde);
  if (hasta) parametros.set("hasta", hasta);
  if (accion) parametros.set("accion", accion);
  if (usuario && usuario.trim()) parametros.set("usuario", usuario.trim());
  if (pagina) parametros.set("pagina", String(pagina));
  if (tamano) parametros.set("tamano", String(tamano));
  return parametros.toString();
}

/** Texto de la columna Usuario: nombre (o correo) y rol; "—" si no hubo sesión. */
export function describirActor(registro) {
  const quien = registro.usuarioNombre || registro.usuarioCorreo;
  if (!quien) return "—";
  return registro.rol ? `${quien} · ${registro.rol}` : quien;
}

/** Texto de la columna Entidad: tipo y número ("PEDIDO #12"). */
export function describirEntidad(registro) {
  if (!registro.entidad) return "—";
  return registro.entidadId == null
    ? registro.entidad
    : `${registro.entidad} #${registro.entidadId}`;
}

/** Fila <tr> de un registro de auditoría. */
export function crearFilaAuditoria(registro) {
  const fila = document.createElement("tr");
  const fecha = new Date(registro.fecha);
  const correo =
    registro.usuarioNombre && registro.usuarioCorreo
      ? registro.usuarioCorreo
      : "";
  // Un solo bloque: en móvil la celda apilada es flex y cada hijo sería una columna aparte.
  const actor = el("div");
  actor.append(el("span", "d-block", describirActor(registro)));
  if (correo) actor.append(el("span", "d-block small text-secondary", correo));
  const celdaUsuario = el("td");
  celdaUsuario.append(actor);
  fila.append(
    el(
      "td",
      "text-nowrap small",
      Number.isNaN(fecha.getTime())
        ? String(registro.fecha ?? "")
        : fecha.toLocaleString("es-PE", FORMATO_FECHA),
    ),
    celdaUsuario,
    el("td", "fw-semibold", registro.accionEtiqueta || registro.accion),
    el("td", "text-nowrap small", describirEntidad(registro)),
    el("td", "small", registro.detalle),
  );
  etiquetarCeldas(fila, COLUMNAS);
  return fila;
}

export function crearPanelAuditoria(apiRequest) {
  const seccion = el("section");
  seccion.id = "admin-seccion-auditoria";
  seccion.setAttribute("aria-labelledby", "titulo-auditoria-admin");

  const titulo = el("h3", "h5", "Auditoría");
  titulo.id = "titulo-auditoria-admin";
  const descripcion = el(
    "p",
    "small text-secondary",
    "Inicios de sesión, cambios de cuentas y roles, catálogo, categorías, reportes descargados y cambios de estado de pedidos, reclamos y devoluciones.",
  );

  const formulario = el("form", "row g-2 align-items-end");
  formulario.noValidate = true;
  const campo = (id, etiqueta, control, columnas) => {
    const contenedor = el("div", columnas);
    const label = el("label", "form-label small", etiqueta);
    label.htmlFor = id;
    control.id = id;
    contenedor.append(label, control);
    return contenedor;
  };
  const desde = el("input", "form-control form-control-sm");
  desde.type = "date";
  const hasta = el("input", "form-control form-control-sm");
  hasta.type = "date";
  const accion = el("select", "form-select form-select-sm");
  accion.append(new Option("Todas las acciones", ""));
  const usuario = el("input", "form-control form-control-sm");
  usuario.type = "search";
  usuario.placeholder = "Nombre o correo";
  const buscar = el("button", "btn btn-primary btn-sm", "Buscar");
  buscar.type = "submit";
  const descargar = el(
    "button",
    "btn btn-outline-primary btn-sm",
    "Descargar CSV",
  );
  descargar.type = "button";
  const acciones = el("div", "col-12 col-md-auto d-flex gap-2");
  acciones.append(buscar, descargar);
  formulario.append(
    campo("auditoria-desde", "Desde", desde, "col-6 col-md-2"),
    campo("auditoria-hasta", "Hasta", hasta, "col-6 col-md-2"),
    campo("auditoria-accion", "Acción", accion, "col-12 col-md-3"),
    campo("auditoria-usuario", "Usuario", usuario, "col-12 col-md-3"),
    acciones,
  );

  const estado = el("p", "small text-secondary mt-2 mb-2");
  estado.setAttribute("role", "status");
  estado.setAttribute("aria-live", "polite");

  const tabla = el("table", "table table-sm align-middle tabla-apilable mb-0");
  const cabecera = el("thead");
  const filaCabecera = el("tr");
  COLUMNAS.forEach((nombre) => {
    const th = el("th", "", nombre);
    th.scope = "col";
    filaCabecera.append(th);
  });
  cabecera.append(filaCabecera);
  const cuerpo = el("tbody");
  tabla.append(cabecera, cuerpo);
  const envoltura = el("div", "table-responsive");
  envoltura.append(tabla);

  const paginacion = el(
    "nav",
    "d-flex align-items-center justify-content-end gap-2 mt-2",
  );
  paginacion.setAttribute("aria-label", "Páginas de auditoría");
  paginacion.hidden = true;

  seccion.append(
    titulo,
    descripcion,
    formulario,
    estado,
    envoltura,
    paginacion,
  );

  let accionesCargadas = false;

  const filtros = () => ({
    desde: desde.value,
    hasta: hasta.value,
    accion: accion.value,
    usuario: usuario.value,
  });

  function mostrarEstado(texto, tipo = "secondary") {
    estado.className = `small mt-2 mb-2 text-${tipo}`;
    estado.textContent = texto;
  }

  async function cargarAcciones() {
    if (accionesCargadas) return;
    const lista = await (
      await apiRequest("/api/admin/auditoria/acciones")
    ).json();
    lista.forEach(({ codigo, etiqueta }) =>
      accion.append(new Option(etiqueta, codigo)),
    );
    accionesCargadas = true;
  }

  async function cargarPagina(pagina = 1) {
    let consulta;
    try {
      consulta = crearConsultaAuditoria({
        ...filtros(),
        pagina,
        tamano: TAMANO_PAGINA_AUDITORIA,
      });
    } catch (error) {
      mostrarEstado(error.message, "danger");
      return;
    }
    mostrarEstado("Consultando auditoría…");
    try {
      const datos = await (
        await apiRequest(`/api/admin/auditoria?${consulta}`)
      ).json();
      cuerpo.replaceChildren(...datos.items.map(crearFilaAuditoria));
      if (datos.total === 0) {
        mostrarEstado("No hay registros para esos filtros.");
      } else {
        const inicio = (datos.pagina - 1) * datos.tamano + 1;
        const fin = inicio + datos.items.length - 1;
        mostrarEstado(
          datos.total === 1
            ? "1 registro"
            : `${datos.total} registros · mostrando ${inicio}–${fin}`,
        );
      }
      const totalPaginas = Math.ceil(datos.total / datos.tamano);
      paginacion.hidden = totalPaginas <= 1;
      paginacion.replaceChildren(
        ...crearControlesPaginacionKardex(
          {
            paginaActual: datos.pagina,
            totalPaginas,
            tieneAnterior: datos.pagina > 1,
            tieneSiguiente: datos.pagina < totalPaginas,
          },
          cargarPagina,
        ),
      );
    } catch (error) {
      cuerpo.replaceChildren();
      paginacion.hidden = true;
      mostrarEstado(
        `No se pudo consultar la auditoría. ${error.message}`,
        "danger",
      );
    }
  }

  formulario.addEventListener("submit", (evento) => {
    evento.preventDefault();
    void cargarPagina(1);
  });

  descargar.addEventListener("click", async () => {
    descargar.disabled = true;
    try {
      const consulta = crearConsultaAuditoria(filtros());
      const respuesta = await apiRequest(
        `/api/admin/auditoria/exportar.csv${consulta ? `?${consulta}` : ""}`,
      );
      const url = URL.createObjectURL(await respuesta.blob());
      const enlace = document.createElement("a");
      enlace.href = url;
      enlace.download = "auditoria.csv";
      enlace.click();
      URL.revokeObjectURL(url);
      mostrarEstado("Archivo auditoria.csv descargado.", "success");
    } catch (error) {
      mostrarEstado(`No se pudo descargar el CSV. ${error.message}`, "danger");
    } finally {
      descargar.disabled = false;
    }
  });

  return {
    element: seccion,
    async cargar() {
      try {
        await cargarAcciones();
      } catch {
        // Sin la lista de acciones el filtro queda en "Todas"; la consulta sigue funcionando.
      }
      await cargarPagina(1);
    },
  };
}
