/**
 * @file vistas-personal.js
 * HTML de las vistas del personal, compartido por la tienda (catalogo-layout.js) y el panel
 * del personal (panel.html). Los módulos se enlazan por estos ids fijos: no se cambian.
 * Cada vista es un <div class="modulo-vista" hidden>; se muestra quitando el atributo hidden,
 * igual que hace cambiarVista en la tienda.
 */

/** Vista Pedidos (gestión del personal y «Mis compras» del cliente). */
export function renderizarVistaPedidos() {
  return `<div id="vista-pedidos" class="modulo-vista" hidden>
      <section id="seccion-pedidos" class="card shadow-sm mb-4" aria-labelledby="titulo-pedidos">
        <div class="card-body">
          <h2 id="titulo-pedidos" class="h4">Pedidos</h2>
          <p id="estado-pedidos" class="text-secondary" role="status" aria-live="polite"></p>
          <div id="lista-pedidos" class="list-group"></div>
        </div>
      </section>
    </div>`;
}

/** Vista Inventario y kardex. */
export function renderizarVistaInventario() {
  return `<div id="vista-inventario" class="modulo-vista" hidden>
      <section id="seccion-inventario" class="card shadow-sm mb-4" aria-labelledby="titulo-inventario">
        <div class="card-body">
          <h2 id="titulo-inventario" class="h4">Inventario y kardex</h2>
          <section id="seccion-entrada-inventario" aria-labelledby="titulo-entrada-inventario" hidden>
            <h3 id="titulo-entrada-inventario" class="h6 mt-3">Registrar entrada de mercadería</h3>
            <form id="form-entrada-inventario" class="row g-2 align-items-end">
              <div class="col-12 col-md-4">
                <label for="producto-entrada" class="form-label">Producto</label>
                <select id="producto-entrada" class="form-select" required>
                  <option value="">Selecciona un producto</option>
                </select>
              </div>
              <div class="col-6 col-md-2">
                <label for="cantidad-entrada" class="form-label">Cantidad</label>
                <input id="cantidad-entrada" class="form-control" type="number" min="1" step="1" required>
              </div>
              <div class="col-12 col-md-4">
                <label for="motivo-entrada" class="form-label">Motivo</label>
                <input id="motivo-entrada" class="form-control" type="text" maxlength="250" required placeholder="Ej.: Reposición de mercadería">
              </div>
              <div class="col-6 col-md-2 d-grid">
                <button class="btn btn-primary" type="submit">Registrar entrada</button>
              </div>
            </form>
            <p id="estado-entrada-inventario" class="small mt-2 mb-0" role="status" aria-live="polite"></p>
          </section>

          <section class="mt-4" aria-labelledby="titulo-movimientos-inventario">
            <div class="d-flex flex-wrap align-items-end justify-content-between gap-2">
              <h3 id="titulo-movimientos-inventario" class="h6 mb-0">Movimientos de inventario</h3>
              <form id="filtros-movimientos" class="row g-2 align-items-end">
                <div class="col-12 col-sm-4">
                  <label for="filtro-producto-movimientos" class="form-label small">Producto</label>
                  <select id="filtro-producto-movimientos" class="form-select form-select-sm">
                    <option value="">Todos</option>
                  </select>
                </div>
                <div class="col-6 col-sm-3">
                  <label for="movimientos-desde" class="form-label small">Desde</label>
                  <input id="movimientos-desde" class="form-control form-control-sm" type="date">
                </div>
                <div class="col-6 col-sm-3">
                  <label for="movimientos-hasta" class="form-label small">Hasta</label>
                  <input id="movimientos-hasta" class="form-control form-control-sm" type="date">
                </div>
                <div class="col-12 col-sm-2 d-grid">
                  <button class="btn btn-outline-primary btn-sm" type="submit" aria-label="Filtrar movimientos">Ver</button>
                </div>
              </form>
            </div>
            <p id="estado-movimientos" class="small text-secondary mt-2 mb-2" role="status" aria-live="polite"></p>
            <div class="table-responsive">
              <table class="table table-sm align-middle mb-0">
                <thead><tr><th scope="col">Fecha</th><th scope="col">Producto</th><th scope="col">Movimiento</th><th scope="col">Motivo</th><th scope="col">Responsable</th><th scope="col" class="text-end">Cantidad</th></tr></thead>
                <tbody id="lista-movimientos"></tbody>
              </table>
            </div>
            <nav id="paginacion-movimientos" class="d-flex align-items-center justify-content-end gap-2 mt-2" aria-label="Páginas de movimientos" hidden></nav>
          </section>
        </div>
      </section>
    </div>`;
}

/** Vista Productos del personal: tabla y alta de productos (#form-producto, #resultado-formulario). */
export function renderizarVistaProductos() {
  return `<div id="vista-productos" class="modulo-vista" hidden>
    <section id="seccion-gestion-productos" class="card shadow-sm mb-4" aria-labelledby="titulo-formulario">
      <div class="card-body">
        <div class="d-flex flex-wrap align-items-start justify-content-between gap-2">
          <div>
            <h2 id="titulo-formulario" class="h4 mb-1">Productos</h2>
            <p id="resumen-gestion-productos" class="small text-secondary mb-0">Publica, edita, ajusta o reactiva los productos del catálogo.</p>
          </div>
          <button id="boton-nuevo-producto" class="btn btn-primary" type="button"
                  aria-expanded="false" aria-controls="panel-nuevo-producto">+ Nuevo producto</button>
        </div>

        <div id="panel-nuevo-producto" class="nuevo-producto mt-3" hidden>
          <h3 class="h5 mb-1">Nuevo producto</h3>
          <p class="small text-secondary">Completa la ficha para publicarlo en la tienda. Los campos con <span class="text-danger">*</span> son obligatorios.</p>

          <form id="form-producto" class="row g-3" novalidate>
            <div class="col-12 col-lg-8 d-grid gap-3">
              <fieldset class="nuevo-producto-grupo">
                <legend>Información básica</legend>
                <p class="nuevo-producto-ayuda">Datos con los que el cliente identificará el producto.</p>
                <div class="row g-3">
                  <div class="col-12 col-md-6">
                    <label for="sku-producto" class="form-label">Código del producto</label>
                    <input id="sku-producto" class="form-control text-uppercase" type="text" maxlength="30"
                           placeholder="PA-0033" autocomplete="off" aria-describedby="ayuda-sku-producto">
                    <div id="ayuda-sku-producto" class="form-text">Opcional y único. Si lo dejas vacío se genera al guardar.</div>
                    <div class="invalid-feedback" data-campo="sku"></div>
                  </div>
                  <div class="col-12 col-md-6">
                    <label for="marca-producto" class="form-label">Marca</label>
                    <input id="marca-producto" class="form-control" type="text" maxlength="80" placeholder="Ej.: Logitech">
                    <div class="invalid-feedback" data-campo="marca"></div>
                  </div>
                  <div class="col-12">
                    <label for="nombre-producto" class="form-label">Nombre <span class="text-danger">*</span></label>
                    <input id="nombre-producto" class="form-control" type="text" required maxlength="120"
                           placeholder="Ej.: Teclado mecánico 60% RGB">
                    <div class="invalid-feedback" data-campo="nombre"></div>
                  </div>
                  <div class="col-12">
                    <label for="categoria-producto" class="form-label">Categoría <span class="text-danger">*</span></label>
                    <select id="categoria-producto" class="form-select" required aria-describedby="ayuda-categoria-producto">
                      <option value="">Selecciona una categoría</option>
                    </select>
                    <div id="ayuda-categoria-producto" class="form-text">Las categorías desactivadas no aparecen en la lista.</div>
                    <div class="invalid-feedback" data-campo="categoria"></div>
                  </div>
                  <div class="col-12">
                    <label for="descripcion-producto" class="form-label">Descripción</label>
                    <textarea id="descripcion-producto" class="form-control" rows="3" maxlength="1000"
                              placeholder="Describe el producto en 2 o 3 frases."></textarea>
                    <div class="invalid-feedback" data-campo="descripcion"></div>
                  </div>
                </div>
              </fieldset>

              <fieldset class="nuevo-producto-grupo">
                <legend>Imagen</legend>
                <p class="nuevo-producto-ayuda">Fondo blanco y encuadre uniforme para que todas las tarjetas se vean iguales.</p>
                <label for="imagen-producto" class="form-label">Dirección (URL) de la imagen</label>
                <input id="imagen-producto" class="form-control" type="url" maxlength="255"
                       placeholder="https://… o /img/productos/…" aria-describedby="ayuda-imagen-producto">
                <div id="ayuda-imagen-producto" class="form-text">Formatos JPG, PNG o WebP. Sin imagen se usa una ilustración de la categoría.</div>
                <div class="invalid-feedback" data-campo="imagen"></div>
              </fieldset>

              <fieldset class="nuevo-producto-grupo">
                <legend>Precio e inventario</legend>
                <p class="nuevo-producto-ayuda">Importes en soles con dos decimales.</p>
                <div class="row g-3">
                  <div class="col-12 col-md-4">
                    <label for="precio-producto" class="form-label">Precio (S/) <span class="text-danger">*</span></label>
                    <input id="precio-producto" class="form-control" type="number" min="0.01" step="0.01" required inputmode="decimal">
                    <div class="invalid-feedback" data-campo="precio"></div>
                  </div>
                  <div class="col-12 col-md-4">
                    <label for="precio-anterior-producto" class="form-label">Precio anterior (S/)</label>
                    <input id="precio-anterior-producto" class="form-control" type="number" min="0.01" step="0.01"
                           inputmode="decimal" aria-describedby="ayuda-precio-anterior-producto">
                    <div id="ayuda-precio-anterior-producto" class="form-text">Opcional. Si es mayor que el precio, se muestra como descuento.</div>
                    <div class="invalid-feedback" data-campo="precioAnterior"></div>
                  </div>
                  <div class="col-12 col-md-4">
                    <label for="stock-producto" class="form-label">Stock de apertura <span class="text-danger">*</span></label>
                    <input id="stock-producto" class="form-control" type="number" min="0" step="1" required inputmode="numeric">
                    <div class="invalid-feedback" data-campo="stock"></div>
                  </div>
                </div>
                <p class="alert alert-info small mt-3 mb-0">
                  El stock de apertura se registra automáticamente como un movimiento de <strong>ENTRADA</strong> en el kardex.
                  Después, cualquier corrección se hace con «Ajustar stock» indicando el motivo.
                </p>
              </fieldset>
            </div>

            <div class="col-12 col-lg-4 d-grid gap-3 align-content-start">
              <section class="nuevo-producto-grupo" aria-labelledby="titulo-publicacion">
                <h4 id="titulo-publicacion" class="nuevo-producto-titulo">Publicación</h4>
                <div class="form-check mb-3">
                  <input id="nuevo-producto" class="form-check-input" type="checkbox">
                  <label for="nuevo-producto" class="form-check-label">
                    Marcar como Nuevo
                    <span class="d-block small text-secondary">Aparece en el carrusel de nuevos productos.</span>
                  </label>
                </div>
                <p class="small text-secondary">El producto se publica activo: los clientes lo ven en la tienda.</p>
                <div class="d-grid gap-2">
                  <button class="btn btn-primary" type="submit">Publicar producto</button>
                  <button id="cancelar-nuevo-producto" class="btn btn-outline-secondary" type="button">Cancelar</button>
                </div>
              </section>

              <section class="nuevo-producto-grupo" aria-labelledby="titulo-vista-previa">
                <h4 id="titulo-vista-previa" class="nuevo-producto-titulo">Vista previa</h4>
                <p class="nuevo-producto-ayuda">Así se verá la tarjeta en la tienda.</p>
                <div id="vista-previa-producto" class="nuevo-producto-vista-previa" inert aria-hidden="true"></div>
              </section>

              <p class="alert alert-warning small mb-0">
                <strong>Recuerda:</strong> si cambias el precio después de una venta, los pedidos anteriores conservan el precio con el que se compraron.
              </p>
            </div>
          </form>
        </div>

        <p id="resultado-formulario" class="mt-3 mb-0" role="status"></p>
      </div>
    </section>
    </div>`;
}

/** Vista Administración: contenedor vacío que rellena crearPanelAdministracion. */
export function renderizarVistaAdministracion() {
  return `<div id="vista-administracion" class="modulo-vista" hidden></div>`;
}

/** Vista Consultas de clientes (vendedor). */
export function renderizarVistaConsultas() {
  return `<div id="vista-consultas" class="modulo-vista" hidden>
      <section id="seccion-preguntas-vendedor" class="card shadow-sm mb-4" aria-labelledby="titulo-preguntas-vendedor">
        <div class="card-body">
          <div class="d-flex flex-wrap align-items-center justify-content-between gap-2">
            <h2 id="titulo-preguntas-vendedor" class="h4 mb-0">Preguntas de clientes</h2>
            <button id="actualizar-preguntas-vendedor" class="btn btn-outline-primary btn-sm" type="button">Actualizar</button>
          </div>
          <p id="estado-preguntas-vendedor" class="text-secondary mt-3 mb-2" role="status" aria-live="polite"></p>
          <div id="lista-preguntas-vendedor" class="list-group"></div>
        </div>
      </section>
    </div>`;
}

/** Vista Soporte (spec 006): contenedor vacío que rellena configurarPortalSoporte. */
export function renderizarVistaSoporte() {
  return `<div id="vista-soporte" class="modulo-vista" hidden></div>`;
}
