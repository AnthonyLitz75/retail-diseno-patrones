/**
 * @file panel-main.js
 * Arranque de panel.html (spec 13): consulta la sesión, decide el acceso y, solo si se
 * permite, pinta el marco (barra superior, menú lateral y área de trabajo). Sin sesión va al
 * login; un CLIENTE o un rol desconocido ve el aviso y vuelve a la tienda.
 * Las pantallas las monta panel-router.js según el hash.
 */

import "bootstrap/dist/css/bootstrap.min.css";
import "../css/variables.css";
import "../css/base.css";
import "../css/notificaciones.css";
// Módulos del personal (inventario de CSS de T05). paneles.css trae reglas sobre .table que
// solo afectan a las tablas heredadas montadas; las tablas nuevas del panel usan .panel-tabla.
// No se edita (lo comparte la tienda): los ajustes van en panel.css, acotados al panel.
import "../css/paneles.css";
import "../css/pedidos.css";
// catalogo.css: sin reglas sobre elementos, :root, .btn ni .card (revisado en T07); aporta
// .menu-acciones (menú «Gestionar») y .product-card (vista previa del producto nuevo).
import "../css/catalogo.css";
import "../css/panel.css";

import { Modal } from "bootstrap";
import { apiRequest, suscribirEventosApi } from "../api/api.js";
import { configurarErroresGlobales } from "../utilidades/errores-globales.js";
import { configurarFocoTeclado } from "../utilidades/foco-teclado.js";
import { crearIndicadorCarga } from "../utilidades/indicador-carga.js";
import { mostrarToast } from "../utilidades/notificaciones.js";
import modalesHtml from "../layout/plantillas/modales.html?raw";
import { configurarModalStock } from "../modales/modal-stock.js";
import { configurarModalPrecio } from "../modales/modal-precio.js";
import { configurarModalEditarProducto } from "../modales/modal-editar-producto.js";
import { ROLES_CATALOGO } from "../utilidades/constantes.js";
import { crearAvisoCambios } from "./cambios-productos.js";
import { planificarArranquePanel } from "./acceso.js";
import { cerrarSesionPanel } from "./cerrar-sesion.js";
import { crearPanelRouter } from "./panel-router.js";
import { rutaDeVista } from "./menu-por-rol.js";
import { ID_BOTON_MENU, renderizarBarraSuperior, renderizarMenuLateral } from "./panel-layout.js";
import { crearCajonMenu } from "./cajon-menu.js";
import { seguro, html } from "../utilidades/seguridad.js";

const raiz = document.querySelector("#panel-app");

/**
 * Estado local de la página, compartido por las pantallas del panel y los módulos montados
 * (que lo leen con obtenerEstado(), igual que en la tienda).
 */
const estadoPanel = {
  usuarioSesion: null,
  productosInventario: [],
};

/** Aviso de que los productos cambiaron (modales, estado o alta); lo escuchan las pantallas. */
const cambiosProductos = crearAvisoCambios();

/**
 * Modales de producto de la tienda, configurados una sola vez (cada configurar* añade un
 * listener al modal; configurarlo dos veces enviaría dos peticiones). Solo ADMIN y VENDEDOR.
 */
function configurarModalesProducto(rol) {
  if (!ROLES_CATALOGO.includes(rol)) return {};
  const alGuardar = () => cambiosProductos.avisar("modal");
  return {
    ...configurarModalStock({ apiRequest, Modal, mostrarToast, onStockActualizado: alGuardar }),
    ...configurarModalPrecio({ apiRequest, Modal, mostrarToast, onPrecioActualizado: alGuardar }),
    ...configurarModalEditarProducto({ apiRequest, Modal, mostrarToast, onProductoActualizado: alGuardar }),
  };
}

function redirigir(ruta) {
  window.location.href = ruta;
}

/** Usuario de GET /api/auth/sesion, o null si no hay sesión o la consulta falla. */
async function consultarSesion() {
  try {
    const respuesta = await apiRequest("/api/auth/sesion", {});
    return await respuesta.json();
  } catch {
    return null;
  }
}

function pintarMarco(usuario) {
  raiz.innerHTML = html`${seguro(renderizarBarraSuperior(usuario))}
<div class="panel-cuerpo">
  ${seguro(renderizarMenuLateral(usuario.rol))}
  <main id="panel-area" class="panel-area" tabindex="-1"></main>
</div>`;
  // Modales compartidos con la tienda (despacho, stock, precio…), una sola vez (decisión T05).
  document.body.insertAdjacentHTML("beforeend", modalesHtml);
  // Menú lateral como cajón por debajo de 992 px (T12).
  crearCajonMenu({
    boton: document.getElementById(ID_BOTON_MENU),
    menu: document.getElementById("panel-menu"),
    documento: document,
  });
  // «Cerrar sesión» está en la barra (id único) y en el pie del cajón: mismo comportamiento.
  for (const botonSalir of document.querySelectorAll("[data-cerrar-sesion]")) {
    botonSalir.addEventListener("click", () => void cerrarSesionPanel({
      apiRequest,
      boton: botonSalir,
      limpiarUsuario: () => {
        estadoPanel.usuarioSesion = null;
      },
      redirigir,
      mostrarToast,
    }));
  }
}

function configurarServiciosGlobales() {
  configurarFocoTeclado();
  crearIndicadorCarga({ suscribir: suscribirEventosApi, raizOcupada: raiz });
  configurarErroresGlobales({
    suscribir: suscribirEventosApi,
    obtenerUsuario: () => estadoPanel.usuarioSesion,
    mostrarToast,
    alSesionExpirada: () => {
      estadoPanel.usuarioSesion = null;
    },
    redirigir,
    // Sin «volver»: el hash del panel no es una ruta de la tienda (decisión T03).
    obtenerHash: () => "",
  });
}

async function arrancar() {
  const usuario = await consultarSesion();
  const plan = planificarArranquePanel(usuario);
  if (!plan.pintar) {
    if (plan.mensaje) mostrarToast(plan.mensaje, "advertencia");
    setTimeout(() => redirigir(plan.redirigir), plan.retrasoMs);
    return;
  }
  estadoPanel.usuarioSesion = usuario;
  pintarMarco(usuario);
  configurarServiciosGlobales();
  await crearPanelRouter({
    rol: usuario.rol,
    ventana: window,
    documento: document,
    menu: document.getElementById("panel-menu"),
    area: document.getElementById("panel-area"),
    mostrarToast,
    servicios: {
      apiRequest,
      mostrarToast,
      estado: estadoPanel,
      Modal,
      // cambiarVista del panel: los módulos piden una vista de la tienda y el panel navega a su ruta.
      cambiarVista: (vista) => {
        const ruta = rutaDeVista(vista, usuario.rol);
        if (ruta) window.location.hash = ruta;
      },
      // Navega a una ruta del panel (crea entrada en el historial, como un enlace).
      navegar: (ruta) => {
        window.location.hash = ruta;
      },
      // Reescribe el hash sin crear entrada en el historial ni volver a navegar.
      reemplazarRuta: (ruta) => {
        window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}${ruta}`);
      },
      modalesProducto: configurarModalesProducto(usuario.rol),
      cambiosProductos,
    },
  }).iniciar();
}

void arrancar();
