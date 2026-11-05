import {
  actualizarCategoria,
  cambiarEstadoCategoria,
  cambiarRol,
  cargarResumenAdmin,
  crearCategoria,
  crearParametrosReporte,
  desactivarCuenta,
  listarCategoriasAdmin,
  listarCuentas,
  registrarPersonal,
  solicitarCsvVentas,
} from "./administracion.js";
import {
  mostrarConfirmacion,
  mostrarToast,
} from "../utilidades/notificaciones.js";

const ROLES_PERSONAL = ["CLIENTE", "ADMIN", "VENDEDOR", "ALMACEN", "SOPORTE"];

function crearElemento(etiqueta, clase, texto = "") {
  const elemento = document.createElement(etiqueta);
  if (clase) elemento.className = clase;
  if (texto) elemento.textContent = texto;
  return elemento;
}

function mostrarEstado(elemento, texto, tipo = "secondary") {
  elemento.className = `small mt-2 mb-0 text-${tipo}`;
  elemento.textContent = texto;
}

export function crearPanelAdministracion(apiRequest, alCambiarCategorias) {
  const seccion = document.createElement("section");
  seccion.id = "seccion-administracion";
  seccion.className = "card shadow-sm mb-4";
  seccion.setAttribute("aria-labelledby", "titulo-administracion");
  seccion.hidden = true;
  seccion.innerHTML = `
    <div class="card-body">
      <h2 id="titulo-administracion" class="h4">Administración</h2>
      <section aria-labelledby="titulo-cuentas-admin" class="mt-4">
        <h3 id="titulo-cuentas-admin" class="h5">Cuentas y personal</h3>
        <form id="form-personal-admin" class="row g-2 align-items-end">
          <div class="col-12 col-md-3"><label class="form-label" for="personal-nombre">Nombre</label><input id="personal-nombre" class="form-control" maxlength="120" required></div>
          <div class="col-12 col-md-3"><label class="form-label" for="personal-correo">Correo</label><input id="personal-correo" class="form-control" type="email" maxlength="180" required></div>
          <div class="col-12 col-md-3"><label class="form-label" for="personal-clave">Contraseña temporal</label><input id="personal-clave" class="form-control" type="password" minlength="8" maxlength="72" autocomplete="new-password" required></div>
          <div class="col-6 col-md-2"><label class="form-label" for="personal-rol">Rol inicial</label><select id="personal-rol" class="form-select" required><option value="">Selecciona</option><option value="CLIENTE">CLIENTE</option><option value="ADMIN">ADMIN</option><option value="VENDEDOR">VENDEDOR</option><option value="ALMACEN">ALMACEN</option><option value="SOPORTE">SOPORTE</option></select></div>
          <div class="col-6 col-md-1 d-grid"><button class="btn btn-primary" type="submit">Crear</button></div>
        </form>
        <p id="estado-alta-personal" role="status" aria-live="polite"></p>
        <div class="d-flex flex-wrap justify-content-between align-items-center mt-3 gap-2">
          <p id="estado-cuentas-admin" class="small text-secondary mb-0" role="status" aria-live="polite"></p>
          <div class="d-flex align-items-center gap-2">
            <label class="form-label form-label-sm mb-0 text-nowrap small text-secondary" for="filtro-rol-cuentas">Filtrar por rol:</label>
            <select id="filtro-rol-cuentas" class="form-select form-select-sm" style="width: auto;">
              <option value="">Todos los roles</option>
              <option value="CLIENTE">CLIENTE</option>
              <option value="ADMIN">ADMIN</option>
              <option value="VENDEDOR">VENDEDOR</option>
              <option value="ALMACEN">ALMACEN</option>
              <option value="SOPORTE">SOPORTE</option>
            </select>
            <button id="recargar-cuentas-admin" class="btn btn-outline-primary btn-sm" type="button">Actualizar cuentas</button>
          </div>
        </div>
        <div class="table-responsive mt-2"><table class="table table-sm align-middle"><thead><tr><th>Nombre</th><th>Correo</th><th>Rol</th><th>Alta</th><th>Estado</th><th>Acciones</th></tr></thead><tbody id="tabla-cuentas-admin"></tbody></table></div>
      </section>
      <hr>
      <section aria-labelledby="titulo-categorias-admin" class="mt-4">
        <h3 id="titulo-categorias-admin" class="h5">Categorías</h3>
        <form id="form-categoria-admin" class="row g-2 align-items-end"><div class="col-12 col-md-9"><label class="form-label" for="nombre-categoria-admin">Nueva categoría</label><input id="nombre-categoria-admin" class="form-control" maxlength="80" required></div><div class="col-12 col-md-3 d-grid"><button class="btn btn-primary" type="submit">Crear categoría</button></div></form>
        <p id="estado-categoria-admin" role="status" aria-live="polite"></p>
        <div id="lista-categorias-admin" class="list-group"></div>
      </section>
      <hr>
      <section aria-labelledby="titulo-reportes-admin" class="mt-4">
        <h3 id="titulo-reportes-admin" class="h5">Reportes</h3>
        <form id="form-reporte-admin" class="row g-2 align-items-end"><div class="col-6 col-md-4"><label class="form-label" for="reporte-desde">Desde</label><input id="reporte-desde" class="form-control" type="date"></div><div class="col-6 col-md-4"><label class="form-label" for="reporte-hasta">Hasta</label><input id="reporte-hasta" class="form-control" type="date"></div><div class="col-6 col-md-2 d-grid"><button class="btn btn-primary" type="submit">Consultar</button></div><div class="col-6 col-md-2 d-grid"><button id="descargar-reporte-admin" class="btn btn-outline-primary" type="button">Descargar CSV</button></div></form>
        <p id="estado-reporte-admin" role="status" aria-live="polite"></p>
        <div id="metricas-admin" class="row g-2" aria-live="polite"></div>
      </section>
    </div>`;

  const tablaCuentas = seccion.querySelector("#tabla-cuentas-admin");
  const estadoCuentas = seccion.querySelector("#estado-cuentas-admin");
  const filtroRolCuentas = seccion.querySelector("#filtro-rol-cuentas");
  const estadoAlta = seccion.querySelector("#estado-alta-personal");
  const estadoCategoria = seccion.querySelector("#estado-categoria-admin");
  const listaCategorias = seccion.querySelector("#lista-categorias-admin");
  const estadoReporte = seccion.querySelector("#estado-reporte-admin");
  const metricas = seccion.querySelector("#metricas-admin");

  let usuariosCache = [];

  function renderizarCuentas() {
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
      for (const rol of ROLES_PERSONAL) {
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
        guardar.addEventListener("click", async () => {
          guardar.disabled = true;
          try {
            await cambiarRol(apiRequest, usuario.idUsuario, selector.value);
            mostrarToast(
              `Rol de ${usuario.nombre} actualizado a ${selector.value}.`,
              "exito",
            );
            mostrarEstado(
              estadoCuentas,
              `Rol de ${usuario.nombre} actualizado.`,
              "success",
            );
            await cargarCuentas();
          } catch (error) {
            mostrarToast(
              `No se pudo cambiar el rol: ${error.message}`,
              "error",
            );
            mostrarEstado(
              estadoCuentas,
              `No se pudo cambiar el rol. ${error.message}`,
              "danger",
            );
            guardar.disabled = false;
          }
        });
        const desactivar = crearElemento(
          "button",
          "btn btn-outline-danger btn-sm",
          "Desactivar",
        );
        desactivar.type = "button";
        desactivar.addEventListener("click", async () => {
          const confirmado = await mostrarConfirmacion({
            titulo: "Desactivar colaborador",
            mensaje: `¿Estás seguro de desactivar la cuenta de ${usuario.nombre}? El usuario perderá acceso al sistema.`,
            textoBoton: "Sí, desactivar cuenta",
            claseBoton: "btn-danger",
          });
          if (!confirmado) return;
          desactivar.disabled = true;
          try {
            await desactivarCuenta(apiRequest, usuario.idUsuario);
            mostrarToast(`Cuenta de ${usuario.nombre} desactivada.`, "exito");
            await cargarCuentas();
          } catch (error) {
            mostrarToast(
              `No se pudo desactivar la cuenta: ${error.message}`,
              "error",
            );
            mostrarEstado(
              estadoCuentas,
              `No se pudo desactivar la cuenta. ${error.message}`,
              "danger",
            );
            desactivar.disabled = false;
          }
        });
        acciones.append(guardar, desactivar);
      }
      fila.append(acciones);
      filas.push(fila);
    }
    tablaCuentas.replaceChildren(...filas);
  }

  let promesaCuentasEnCurso = null;
  async function cargarCuentas() {
    if (promesaCuentasEnCurso) return promesaCuentasEnCurso;
    promesaCuentasEnCurso = (async () => {
      estadoCuentas.textContent = "Cargando cuentas...";
      try {
        const usuarios = await listarCuentas(apiRequest);
        usuariosCache = usuarios;
        const total = usuarios.length;
        estadoCuentas.textContent = `Cuentas encontradas: ${total}`;
        renderizarCuentas();
      } catch (error) {
        mostrarEstado(
          estadoCuentas,
          `No se pudieron cargar las cuentas. ${error.message}`,
          "danger",
        );
      } finally {
        promesaCuentasEnCurso = null;
      }
    })();
    return promesaCuentasEnCurso;
  }

  let promesaCategoriasEnCurso = null;
  async function cargarCategorias() {
    if (promesaCategoriasEnCurso) return promesaCategoriasEnCurso;
    promesaCategoriasEnCurso = (async () => {
      estadoCategoria.textContent = "Cargando categorías...";
      try {
        const categorias = await listarCategoriasAdmin(apiRequest);
        if (categorias.length === 0)
          estadoCategoria.textContent = "No hay categorías registradas.";
        else
          estadoCategoria.textContent = `Categorías registradas: ${categorias.length}`;
        const filas = [];
        for (const categoria of categorias) {
          const fila = crearElemento(
            "div",
            "list-group-item d-flex flex-wrap align-items-center gap-2",
          );
          const formularioEdicion = document.createElement("form");
          formularioEdicion.className = "d-flex flex-grow-1 gap-2";
          const entrada = crearElemento("input", "form-control form-control-sm");
          entrada.value = categoria.nombre;
          entrada.maxLength = 80;
          entrada.required = true;
          entrada.setAttribute(
            "aria-label",
            `Nombre de categoría ${categoria.nombre}`,
          );
          const guardar = crearElemento(
            "button",
            "btn btn-outline-primary btn-sm",
            "Guardar",
          );
          guardar.type = "submit";
          formularioEdicion.append(entrada, guardar);
          formularioEdicion.addEventListener("submit", async (evento) => {
            evento.preventDefault();
            guardar.disabled = true;
            try {
              await actualizarCategoria(
                apiRequest,
                categoria.idCategoria,
                entrada.value.trim(),
              );
              mostrarToast(
                `Categoría renombrada a "${entrada.value.trim()}".`,
                "exito",
              );
              await cargarCategorias();
              await alCambiarCategorias();
            } catch (error) {
              mostrarToast(
                `No se pudo guardar la categoría: ${error.message}`,
                "error",
              );
              mostrarEstado(
                estadoCategoria,
                `No se pudo guardar la categoría. ${error.message}`,
                "danger",
              );
              guardar.disabled = false;
            }
          });
          const estado = crearElemento(
            "span",
            `badge ${categoria.activa ? "text-bg-success" : "text-bg-secondary"}`,
            categoria.activa ? "Activa" : "Inactiva",
          );
          const cambiarEstado = crearElemento(
            "button",
            `btn btn-sm ${categoria.activa ? "btn-outline-danger" : "btn-outline-success"}`,
            categoria.activa ? "Desactivar" : "Activar",
          );
          cambiarEstado.type = "button";
          cambiarEstado.addEventListener("click", async () => {
            cambiarEstado.disabled = true;
            try {
              await cambiarEstadoCategoria(
                apiRequest,
                categoria.idCategoria,
                !categoria.activa,
              );
              mostrarToast(
                `Categoría "${categoria.nombre}" ${categoria.activa ? "desactivada" : "activada"}.`,
                "exito",
              );
              await cargarCategorias();
              await alCambiarCategorias();
            } catch (error) {
              mostrarToast(
                `No se pudo cambiar el estado: ${error.message}`,
                "error",
              );
              mostrarEstado(
                estadoCategoria,
                `No se pudo cambiar el estado. ${error.message}`,
                "danger",
              );
              cambiarEstado.disabled = false;
            }
          });
          fila.append(formularioEdicion, estado, cambiarEstado);
          filas.push(fila);
        }
        listaCategorias.replaceChildren(...filas);
      } catch (error) {
        mostrarEstado(
          estadoCategoria,
          `No se pudieron cargar las categorías. ${error.message}`,
          "danger",
        );
      } finally {
        promesaCategoriasEnCurso = null;
      }
    })();
    return promesaCategoriasEnCurso;
  }

  let promesaReporteEnCurso = null;
  async function consultarReporte(evento) {
    evento?.preventDefault();
    if (promesaReporteEnCurso) return promesaReporteEnCurso;
    promesaReporteEnCurso = (async () => {
      estadoReporte.textContent = "Consultando reporte...";
      try {
        const consulta = crearParametrosReporte(
          seccion.querySelector("#reporte-desde").value,
          seccion.querySelector("#reporte-hasta").value,
        );
        const resumen = await cargarResumenAdmin(apiRequest, consulta);
        const tarjetas = [
          ["Pedidos vendidos", resumen.pedidosVendidos],
          ["Total de ventas", `S/ ${Number(resumen.totalVentas).toFixed(2)}`],
          ["Productos activos", resumen.productosActivos],
          ["Unidades en stock", resumen.unidadesEnStock],
          [
            "Valor del inventario",
            `S/ ${Number(resumen.valorInventario).toFixed(2)}`,
          ],
          [
            "Movimientos",
            Object.entries(resumen.movimientos || {})
              .map(([tipo, cantidad]) => `${tipo}: ${cantidad}`)
              .join(" · ") || "Sin movimientos",
          ],
        ];
        const columnas = [];
        for (const [etiqueta, valor] of tarjetas) {
          const columna = crearElemento("div", "col-12 col-sm-6 col-lg-4");
          const tarjeta = crearElemento("article", "border rounded p-3 h-100");
          tarjeta.append(
            crearElemento("p", "small text-secondary mb-1", etiqueta),
            crearElemento("strong", "", String(valor)),
          );
          columna.append(tarjeta);
          columnas.push(columna);
        }
        metricas.replaceChildren(...columnas);
        mostrarEstado(estadoReporte, "Reporte actualizado.", "success");
      } catch (error) {
        mostrarEstado(
          estadoReporte,
          `No se pudo consultar el reporte. ${error.message}`,
          "danger",
        );
      } finally {
        promesaReporteEnCurso = null;
      }
    })();
    return promesaReporteEnCurso;
  }

  seccion
    .querySelector("#form-personal-admin")
    .addEventListener("submit", async (evento) => {
      evento.preventDefault();
      const formulario = evento.currentTarget;
      const boton = formulario.querySelector('button[type="submit"]');
      const datos = {
        nombre: seccion.querySelector("#personal-nombre").value.trim(),
        correo: seccion.querySelector("#personal-correo").value.trim(),
        clave: seccion.querySelector("#personal-clave").value,
        rol: seccion.querySelector("#personal-rol").value,
      };
      boton.disabled = true;
      try {
        await registrarPersonal(apiRequest, datos);
        formulario.reset();
        mostrarToast(
          `Colaborador "${datos.nombre}" registrado exitosamente.`,
          "exito",
        );
        mostrarEstado(estadoAlta, "Cuenta creada correctamente.", "success");
        await cargarCuentas();
      } catch (error) {
        mostrarToast(`No se pudo crear la cuenta: ${error.message}`, "error");
        mostrarEstado(
          estadoAlta,
          `No se pudo crear la cuenta. ${error.message}`,
          "danger",
        );
      } finally {
        boton.disabled = false;
      }
    });
  seccion
    .querySelector("#recargar-cuentas-admin")
    .addEventListener("click", cargarCuentas);
  filtroRolCuentas?.addEventListener("change", renderizarCuentas);
  seccion
    .querySelector("#form-categoria-admin")
    .addEventListener("submit", async (evento) => {
      evento.preventDefault();
      const formulario = evento.currentTarget;
      const boton = formulario.querySelector('button[type="submit"]');
      boton.disabled = true;
      try {
        const nombreCat = seccion
          .querySelector("#nombre-categoria-admin")
          .value.trim();
        await crearCategoria(apiRequest, nombreCat);
        formulario.reset();
        mostrarToast(`Categoría "${nombreCat}" creada con éxito.`, "exito");
        await cargarCategorias();
        await alCambiarCategorias();
      } catch (error) {
        mostrarToast(
          `No se pudo crear la categoría: ${error.message}`,
          "error",
        );
        mostrarEstado(
          estadoCategoria,
          `No se pudo crear la categoría. ${error.message}`,
          "danger",
        );
      } finally {
        boton.disabled = false;
      }
    });
  seccion
    .querySelector("#form-reporte-admin")
    .addEventListener("submit", consultarReporte);
  seccion
    .querySelector("#descargar-reporte-admin")
    .addEventListener("click", async (evento) => {
      const boton = evento.currentTarget;
      boton.disabled = true;
      try {
        const consulta = crearParametrosReporte(
          seccion.querySelector("#reporte-desde").value,
          seccion.querySelector("#reporte-hasta").value,
        );
        const respuesta = await solicitarCsvVentas(apiRequest, consulta);
        const url = URL.createObjectURL(await respuesta.blob());
        const enlace = document.createElement("a");
        enlace.href = url;
        enlace.download = "ventas.csv";
        enlace.click();
        URL.revokeObjectURL(url);
        mostrarEstado(estadoReporte, "Archivo CSV descargado.", "success");
      } catch (error) {
        mostrarEstado(
          estadoReporte,
          `No se pudo descargar el CSV. ${error.message}`,
          "danger",
        );
      } finally {
        boton.disabled = false;
      }
    });

  return {
    element: seccion,
    async cargar() {
      await Promise.all([
        cargarCuentas(),
        cargarCategorias(),
        consultarReporte(),
      ]);
    },
  };
}
