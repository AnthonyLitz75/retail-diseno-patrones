import 'bootstrap/dist/css/bootstrap.min.css'
import './style.css'
import mouseImage from './assets/mouse.png'
import tecladoImage from './assets/teclado.png'
import cargadorImage from './assets/cargador.png'
import webcamImage from './assets/webcam.png'
import heroBanner from './assets/banner-retail.png'
import { agregarProductoAlCarrito, cargarCarrito, inicializarCarrito, ocultarCarrito } from './carrito.js'

document.querySelector('#app').innerHTML = `
  <main class="container py-5 storefront">
    <header class="site-header mb-3">
      <a class="site-brand" href="/" aria-label="Retail, inicio">
        <span class="site-brand-mark" aria-hidden="true">R</span>
        <span class="site-brand-copy"><strong>RETAIL</strong><small>Tecnología y accesorios</small></span>
      </a>
      <form id="busqueda-rapida" class="site-search" role="search" aria-label="Buscar productos">
        <input id="busqueda-principal" class="form-control" type="search" placeholder="Buscar productos" aria-label="Buscar productos">
        <button class="btn btn-primary" type="submit" aria-label="Buscar">⌕</button>
      </form>
      <nav class="site-account-nav d-flex flex-wrap align-items-center gap-2" aria-label="Navegación de la tienda">
        <a class="site-nav-link" href="#categorias">Categorías</a>
        <a id="enlace-pedidos-nav" class="site-nav-link" href="#seccion-pedidos" hidden>Mis compras</a>
        <a id="enlace-login" class="site-nav-link" href="/login.html">Iniciar sesión</a>
        <a id="enlace-registro" class="btn btn-outline-primary" href="/register.html">Crear cuenta</a>
        <a id="enlace-carrito-nav" class="btn btn-outline-primary cart-nav-link" href="#seccion-carrito" hidden>Carrito <span id="contador-carrito" class="cart-count">0</span></a>
        <span id="usuario-activo" class="text-secondary" aria-live="polite" hidden></span>
        <button id="cerrar-sesion" class="btn btn-outline-secondary" type="button" hidden>Cerrar sesión</button>
      </nav>
    </header>

    <section class="store-hero mb-4" aria-labelledby="titulo-portada" style="--hero-image: url(\'${heroBanner}\')">
      <div class="store-hero-copy">
        <span class="store-eyebrow">TECNOLOGÍA PARA TU DÍA A DÍA</span>
        <h1 id="titulo-portada">Encuentra lo que necesitas para tu espacio</h1>
        <p>Explora el catálogo, compara precios y revisa la disponibilidad actual de cada producto.</p>
        <a class="btn btn-light store-hero-cta" href="#productos">Explorar productos</a>
      </div>

    </section>

    <section id="categorias" class="category-shelf mb-4" aria-labelledby="titulo-categorias-destacadas">
      <div class="d-flex flex-wrap align-items-end justify-content-between gap-2 mb-3">
        <div>
          <p class="store-section-kicker mb-1">EXPLORA LA TIENDA</p>
          <h2 id="titulo-categorias-destacadas" class="h4 mb-0">Categorías</h2>
        </div>
        <span class="small text-secondary">Opciones disponibles en el catálogo</span>
      </div>
      <div id="categorias-destacadas" class="category-pills" aria-label="Filtrar por categoría"></div>
    </section>
    <section id="seccion-pedidos" class="card shadow-sm mb-4" aria-labelledby="titulo-pedidos" hidden>
      <div class="card-body">
        <h2 id="titulo-pedidos" class="h4">Pedidos</h2>
        <p id="estado-pedidos" class="text-secondary" role="status" aria-live="polite"></p>
        <div id="lista-pedidos" class="list-group"></div>
      </div>
    </section>

    <section id="seccion-carrito" class="card shadow-sm mb-4" aria-labelledby="titulo-carrito" hidden>
      <div class="card-body">
        <div class="d-flex flex-wrap align-items-center justify-content-between gap-2">
          <h2 id="titulo-carrito" class="h4 mb-0">Mi carrito</h2>
          <p id="total-carrito" class="fw-bold mb-0"></p>
        </div>
        <p id="estado-carrito" class="mt-3 mb-2" role="status" aria-live="polite"></p>
        <ul id="productos-carrito" class="list-group"></ul>
        <button id="confirmar-compra" class="btn btn-success mt-3" type="button" disabled>
          Confirmar compra con pago simulado
        </button>
      </div>
    </section>

    <section id="seccion-gestion-productos" class="card shadow-sm mb-4" aria-labelledby="titulo-formulario" hidden>
      <div class="card-body">
        <h2 id="titulo-formulario" class="h4">Agregar producto</h2>

        <form id="form-producto" class="row g-3">
          <div class="col-12 col-md-3">
            <label for="nombre-producto" class="form-label">Nombre</label>
            <input
              id="nombre-producto"
              class="form-control"
              type="text"
              required
              maxlength="120"
            >
          </div>

          <div class="col-12 col-md-3">
            <label for="categoria-producto" class="form-label">Categoría</label>
            <select id="categoria-producto" class="form-select" required>
              <option value="">Selecciona una categoría</option>
            </select>
          </div>

          <div class="col-12 col-md-2">
            <label for="precio-producto" class="form-label">Precio (S/)</label>
            <input
              id="precio-producto"
              class="form-control"
              type="number"
              min="0.01"
              step="0.01"
              required
            >
          </div>

          <div class="col-12 col-md-2">
            <label for="stock-producto" class="form-label">Stock inicial</label>
            <input
              id="stock-producto"
              class="form-control"
              type="number"
              min="0"
              step="1"
              required
            >
          </div>

          <div class="col-12 col-md-2 d-flex align-items-end">
            <button class="btn btn-primary w-100" type="submit">
              Agregar
            </button>
          </div>
        </form>

        <p id="resultado-formulario" class="mt-3 mb-0" role="status"></p>
      </div>
    </section>

    <section class="mb-4" aria-label="Filtros del catálogo">
      <div class="row g-3">
        <div class="col-12 col-md-4">
          <label for="busqueda" class="form-label">Buscar por nombre</label>
          <input id="busqueda" class="form-control" type="search" placeholder="Ejemplo: Mouse inalámbrico">
        </div>
        <div class="col-12 col-md-3">
          <label for="filtro-categoria" class="form-label">Categoría</label>
          <select id="filtro-categoria" class="form-select">
            <option value="">Todas las categorías</option>
          </select>
        </div>
        <div class="col-6 col-md-2">
          <label for="precio-min" class="form-label">Precio mínimo</label>
          <input id="precio-min" class="form-control" type="number" min="0" step="0.01" placeholder="S/">
        </div>
        <div class="col-6 col-md-2">
          <label for="precio-max" class="form-label">Precio máximo</label>
          <input id="precio-max" class="form-control" type="number" min="0" step="0.01" placeholder="S/">
        </div>
        <div class="col-12 col-md-1 d-flex align-items-end">
          <button id="limpiar-filtros" class="btn btn-outline-secondary w-100" type="button" aria-label="Limpiar filtros">Limpiar</button>
        </div>
      </div>
    </section>

    <p id="estado" class="text-secondary" role="status">Cargando productos...</p>
    <section id="productos" class="row g-4" aria-label="Productos"></section>
    <section id="historial" class="mt-5" aria-live="polite"></section>
  </main>
`

inicializarCarrito()

const estado = document.querySelector('#estado')
const contenedor = document.querySelector('#productos')
const campoBusqueda = document.querySelector('#busqueda')
const filtroCategoria = document.querySelector('#filtro-categoria')
const precioMinimo = document.querySelector('#precio-min')
const precioMaximo = document.querySelector('#precio-max')
const categoriaProducto = document.querySelector('#categoria-producto')
const botonLimpiarFiltros = document.querySelector('#limpiar-filtros')
const formulario = document.querySelector('#form-producto')
const seccionGestionProductos = document.querySelector('#seccion-gestion-productos')
const resultadoFormulario = document.querySelector('#resultado-formulario')
const contenedorHistorial = document.querySelector('#historial')
const seccionPedidos = document.querySelector('#seccion-pedidos')
const tituloPedidos = document.querySelector('#titulo-pedidos')
const estadoPedidos = document.querySelector('#estado-pedidos')
const listaPedidos = document.querySelector('#lista-pedidos')
const enlaceLogin = document.querySelector('#enlace-login')
const enlaceRegistro = document.querySelector('#enlace-registro')
const usuarioActivo = document.querySelector('#usuario-activo')
const botonCerrarSesion = document.querySelector('#cerrar-sesion')
const formularioBusquedaRapida = document.querySelector('#busqueda-rapida')
const campoBusquedaPrincipal = document.querySelector('#busqueda-principal')
const enlacePedidosNav = document.querySelector('#enlace-pedidos-nav')
const enlaceCarritoNav = document.querySelector('#enlace-carrito-nav')

let productosDisponibles = []
let usuarioSesion = null
let temporizadorBusqueda
let solicitudCatalogo = 0

function mostrarProductos(productos) {
  contenedor.replaceChildren()

  if (productos.length === 0) {
    estado.textContent = productosDisponibles.length === 0
      ? 'No se encontraron productos con los filtros seleccionados.'
      : 'No se encontraron productos con los filtros seleccionados.'
    return
  }

  estado.textContent = `Productos encontrados: ${productos.length}`

  productos.forEach((producto) => {
    const columna = document.createElement('div')
    columna.className = 'col-12 col-md-6 col-lg-4'

    const tarjeta = document.createElement('article')
    tarjeta.className = 'card product-card h-100 shadow-sm'

    const visual = document.createElement('div')
    visual.className = 'product-visual'
    visual.setAttribute('aria-hidden', 'true')
    const nombreNormalizado = producto.nombre.toLowerCase()
    visual.classList.add(nombreNormalizado.includes('mouse') ? 'product-visual-mouse'
      : nombreNormalizado.includes('teclado') ? 'product-visual-keyboard'
        : nombreNormalizado.includes('cargador') ? 'product-visual-charger'
          : nombreNormalizado.includes('webcam') ? 'product-visual-webcam' : 'product-visual-generic')
    const imagenProducto = nombreNormalizado.includes('mouse') ? mouseImage
      : nombreNormalizado.includes('teclado') ? tecladoImage
        : nombreNormalizado.includes('cargador') ? cargadorImage
          : nombreNormalizado.includes('webcam') ? webcamImage : null
    if (imagenProducto) {
      const imagen = document.createElement('img')
      imagen.src = imagenProducto
      imagen.alt = ''
      imagen.loading = 'lazy'
      imagen.decoding = 'async'
      visual.append(imagen)
    } else {
      const iconoProducto = document.createElement('span')
      iconoProducto.textContent = '▣'
      visual.append(iconoProducto)
    }
    const contenido = document.createElement('div')
    contenido.className = 'card-body'

    const nombre = document.createElement('h2')
    nombre.className = 'h5 card-title'
    nombre.textContent = producto.nombre

    const categoria = document.createElement('span')
    categoria.className = 'badge text-bg-light border mb-2'
    categoria.textContent = producto.categoria

    const precio = document.createElement('p')
    precio.className = 'product-price fw-bold mb-2'
    precio.textContent = Number(producto.precio).toLocaleString('es-PE', {
      style: 'currency',
      currency: 'PEN'
    })

    const stock = document.createElement('p')
    stock.className = 'card-text text-secondary mb-0'
    stock.textContent = `Stock disponible: ${producto.stock}`

    let botonAgregarCarrito
    if (usuarioSesion?.rol === 'CLIENTE') {
      botonAgregarCarrito = document.createElement('button')
      botonAgregarCarrito.type = 'button'
      botonAgregarCarrito.className = 'btn btn-primary btn-sm mt-3'
      botonAgregarCarrito.textContent = 'Añadir al carrito'
      botonAgregarCarrito.disabled = producto.stock <= 0
      botonAgregarCarrito.addEventListener('click', () =>
        agregarProductoAlCarrito(producto.id)
      )
    }

    const puedeGestionarInventario = ['ADMIN', 'VENDEDOR', 'ALMACEN'].includes(usuarioSesion?.rol)
    const puedeGestionarCatalogo = ['ADMIN', 'VENDEDOR'].includes(usuarioSesion?.rol)

    let botonHistorial
    if (puedeGestionarInventario) {
      botonHistorial = document.createElement('button')
      botonHistorial.type = 'button'
      botonHistorial.className = 'btn btn-outline-primary btn-sm mt-3'
      botonHistorial.textContent = 'Ver movimientos'
      botonHistorial.addEventListener('click', () => cargarMovimientos(producto))
    }

    let detallesAjuste
    if (puedeGestionarInventario) {
      detallesAjuste = document.createElement('details')
      detallesAjuste.className = 'mt-3'

const resumenAjuste = document.createElement('summary')
resumenAjuste.textContent = 'Ajustar stock'

const formularioStock = document.createElement('form')
formularioStock.className = 'mt-3'

const etiquetaStock = document.createElement('label')
etiquetaStock.htmlFor = `stock-${producto.id}`
etiquetaStock.className = 'form-label'
etiquetaStock.textContent = 'Nuevo stock'

const entradaStock = document.createElement('input')
entradaStock.id = `stock-${producto.id}`
entradaStock.type = 'number'
entradaStock.min = '0'
entradaStock.step = '1'
entradaStock.value = producto.stock
entradaStock.required = true
entradaStock.className = 'form-control mb-2'

const etiquetaMotivo = document.createElement('label')
etiquetaMotivo.htmlFor = `motivo-${producto.id}`
etiquetaMotivo.className = 'form-label'
etiquetaMotivo.textContent = 'Motivo del ajuste'

const campoMotivo = document.createElement('input')
campoMotivo.id = `motivo-${producto.id}`
campoMotivo.type = 'text'
campoMotivo.maxLength = 250
campoMotivo.required = true
campoMotivo.className = 'form-control mb-2'
campoMotivo.placeholder = 'Ejemplo: Reposición de mercadería'

const botonAjuste = document.createElement('button')
botonAjuste.type = 'submit'
botonAjuste.className = 'btn btn-secondary btn-sm'
botonAjuste.textContent = 'Guardar ajuste'

const mensajeAjuste = document.createElement('p')
mensajeAjuste.className = 'mt-2 mb-0'

formularioStock.append(
  etiquetaStock,
  entradaStock,
  etiquetaMotivo,
  campoMotivo,
  botonAjuste,
  mensajeAjuste
)

formularioStock.addEventListener('submit', (evento) =>
  guardarAjusteStock(
    evento,
    producto,
    entradaStock,
    campoMotivo,
    mensajeAjuste
  )
)

      detallesAjuste.append(resumenAjuste, formularioStock)
    }

    let detallesPrecio
    if (puedeGestionarCatalogo) {
      detallesPrecio = document.createElement('details')
      detallesPrecio.className = 'mt-3'

    const resumenPrecio = document.createElement('summary')
    resumenPrecio.textContent = 'Editar precio'

    const formularioPrecio = document.createElement('form')
    formularioPrecio.className = 'mt-3'

    const etiquetaPrecio = document.createElement('label')
    etiquetaPrecio.htmlFor = `precio-${producto.id}`
    etiquetaPrecio.className = 'form-label'
    etiquetaPrecio.textContent = 'Nuevo precio (S/)'

    const entradaPrecio = document.createElement('input')
    entradaPrecio.id = `precio-${producto.id}`
    entradaPrecio.type = 'number'
    entradaPrecio.min = '0.01'
    entradaPrecio.step = '0.01'
    entradaPrecio.value = Number(producto.precio).toFixed(2)
    entradaPrecio.required = true
    entradaPrecio.className = 'form-control mb-2'

    const botonPrecio = document.createElement('button')
    botonPrecio.type = 'submit'
    botonPrecio.className = 'btn btn-secondary btn-sm'
    botonPrecio.textContent = 'Guardar precio'

    formularioPrecio.append(etiquetaPrecio, entradaPrecio, botonPrecio)

    formularioPrecio.addEventListener('submit', (evento) =>
      actualizarPrecioProducto(evento, producto, entradaPrecio)
    )

      detallesPrecio.append(resumenPrecio, formularioPrecio)
    }
contenido.append(
      nombre,
      categoria,
      precio,
      stock,
      ...(botonAgregarCarrito ? [botonAgregarCarrito] : []),
      ...(botonHistorial ? [botonHistorial] : []),
      ...(detallesAjuste ? [detallesAjuste] : []),
      ...(detallesPrecio ? [detallesPrecio] : [])
    )
    tarjeta.append(visual, contenido)
    columna.append(tarjeta)
    contenedor.append(columna)
  })
}

campoBusquedaPrincipal.addEventListener('input', () => {
  campoBusqueda.value = campoBusquedaPrincipal.value
  window.clearTimeout(temporizadorBusqueda)
  temporizadorBusqueda = window.setTimeout(cargarProductos, 180)
})

formularioBusquedaRapida.addEventListener('submit', (evento) => {
  evento.preventDefault()
  campoBusqueda.value = campoBusquedaPrincipal.value
  cargarProductos()
  document.querySelector('#productos').scrollIntoView({ behavior: 'smooth', block: 'start' })
})

campoBusqueda.addEventListener('input', () => {
  campoBusquedaPrincipal.value = campoBusqueda.value
  window.clearTimeout(temporizadorBusqueda)
  temporizadorBusqueda = window.setTimeout(cargarProductos, 180)
})

for (const filtro of [filtroCategoria, precioMinimo, precioMaximo]) {
  filtro.addEventListener('change', cargarProductos)
}

filtroCategoria.addEventListener('change', sincronizarCategoriaDestacada)

botonLimpiarFiltros.addEventListener('click', () => {
  campoBusqueda.value = ''
  campoBusquedaPrincipal.value = ''
  filtroCategoria.value = ''
  sincronizarCategoriaDestacada()
  precioMinimo.value = ''
  precioMaximo.value = ''
  cargarProductos()
})

formulario.addEventListener('submit', async (evento) => {
  evento.preventDefault()

  const boton = formulario.querySelector('button[type="submit"]')
  boton.disabled = true
  resultadoFormulario.className = 'mt-3 mb-0 text-secondary'
  resultadoFormulario.textContent = 'Guardando producto...'

  const nuevoProducto = {
    nombre: document.querySelector('#nombre-producto').value.trim(),
    categoria: categoriaProducto.value,
    precio: Number(document.querySelector('#precio-producto').value),
    stock: Number(document.querySelector('#stock-producto').value)
  }

  try {
    const respuesta = await fetch('/api/productos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(nuevoProducto)
    })

    if (!respuesta.ok) {
      throw new Error(`El servidor respondió con el código ${respuesta.status}`)
    }

    resultadoFormulario.className = 'mt-3 mb-0 text-success'
    resultadoFormulario.textContent = 'Producto agregado correctamente.'

    formulario.reset()
    campoBusqueda.value = ''
    await cargarProductos()
  } catch (error) {
    resultadoFormulario.className = 'mt-3 mb-0 text-danger'
    resultadoFormulario.textContent =
      `No se pudo agregar el producto. ${error.message}`
  } finally {
    boton.disabled = false
  }
})

async function cargarMovimientos(producto) {
  contenedorHistorial.replaceChildren()

  const titulo = document.createElement('h2')
  titulo.className = 'h4'
  titulo.textContent = `Historial de stock: ${producto.nombre}`

  const mensaje = document.createElement('p')
  mensaje.className = 'text-secondary'
  mensaje.textContent = 'Cargando movimientos...'

  contenedorHistorial.append(titulo, mensaje)

  try {
    const respuesta = await fetch(
      `/api/productos/${producto.id}/movimientos`
    )

    if (!respuesta.ok) {
      throw new Error(`El servidor respondió con el código ${respuesta.status}`)
    }

    const movimientos = await respuesta.json()

    if (movimientos.length === 0) {
      mensaje.textContent = 'Este producto todavía no tiene movimientos.'
      return
    }

    const lista = document.createElement('ul')
    lista.className = 'list-group'

    movimientos.forEach((movimiento) => {
      const elemento = document.createElement('li')
      elemento.className = 'list-group-item'

      const signo = movimiento.cantidadFirmada > 0 ? '+' : ''
      const fecha = new Date(movimiento.fecha).toLocaleString('es-PE')

      elemento.textContent =
        `${movimiento.tipo}: ${signo}${movimiento.cantidadFirmada} unidades — ` +
        `${movimiento.motivo} (${fecha})`

      lista.append(elemento)
    })

    mensaje.remove()
    contenedorHistorial.append(lista)
  } catch (error) {
    mensaje.className = 'alert alert-danger'
    mensaje.textContent = `No se pudo cargar el historial. ${error.message}`
  }
}

function formatoPrecio(valor) {
  return Number(valor).toLocaleString('es-PE', {
    style: 'currency',
    currency: 'PEN'
  })
}

async function cargarPedidos() {
  if (!usuarioSesion) {
    seccionPedidos.hidden = true
    listaPedidos.replaceChildren()
    return
  }

  const esCliente = usuarioSesion.rol === 'CLIENTE'
  const esEmpleado = ['ADMIN', 'VENDEDOR', 'ALMACEN'].includes(usuarioSesion.rol)
  if (!esCliente && !esEmpleado) {
    seccionPedidos.hidden = true
    return
  }

  const esAlmacen = usuarioSesion.rol === 'ALMACEN'
  const ruta = esCliente ? '/api/pedidos/mis-pedidos'
    : esAlmacen ? '/api/pedidos/operativos' : '/api/pedidos/pendientes'
  seccionPedidos.hidden = false
  tituloPedidos.textContent = esCliente ? 'Mis pedidos'
    : esAlmacen ? 'Pedidos de almacén' : 'Pedidos pendientes'
  estadoPedidos.className = 'text-secondary'
  estadoPedidos.textContent = 'Cargando pedidos...'
  listaPedidos.replaceChildren()

  try {
    const respuesta = await fetch(ruta, { credentials: 'same-origin' })
    if (!respuesta.ok) {
      throw new Error(`El servidor respondió con el código ${respuesta.status}`)
    }
    const pedidos = await respuesta.json()
    mostrarPedidos(pedidos, esCliente)
  } catch (error) {
    estadoPedidos.className = 'text-danger'
    estadoPedidos.textContent = `No se pudieron cargar los pedidos. ${error.message}`
  }
}

function mostrarPedidos(pedidos, esCliente) {
  listaPedidos.replaceChildren()
  estadoPedidos.className = 'text-secondary'
  estadoPedidos.textContent = pedidos.length === 0
    ? (esCliente ? 'Todavía no tienes pedidos.'
      : usuarioSesion.rol === 'ALMACEN'
        ? 'No hay pedidos por preparar, despachar o entregar.'
        : 'No hay pedidos pendientes.')
    : `Pedidos encontrados: ${pedidos.length}`

  for (const pedido of pedidos) {
    const tarjeta = document.createElement('article')
    tarjeta.className = 'list-group-item'

    const encabezado = document.createElement('div')
    encabezado.className = 'd-flex flex-wrap justify-content-between gap-2'
    const numero = document.createElement('strong')
    numero.textContent = `Pedido #${pedido.idPedido} · ${pedido.estado}`
    const total = document.createElement('strong')
    total.textContent = `Total: ${formatoPrecio(pedido.total)}`
    encabezado.append(numero, total)

    const informacion = document.createElement('p')
    informacion.className = 'small text-secondary mb-2'
    const fecha = new Date(pedido.creadoEn).toLocaleString('es-PE')
    informacion.textContent = esCliente
      ? `Realizado el ${fecha}`
      : `Cliente: ${pedido.clienteNombre} (${pedido.clienteCorreo}) · ${fecha}`

    const productos = document.createElement('ul')
    productos.className = 'mb-2'
    for (const producto of pedido.productos) {
      const linea = document.createElement('li')
      linea.textContent =
        `${producto.nombreProducto} · ${producto.cantidad} × ` +
        `${formatoPrecio(producto.precioUnitario)} = ${formatoPrecio(producto.subtotal)}`
      productos.append(linea)
    }

    const historial = document.createElement('details')
    const resumenHistorial = document.createElement('summary')
    resumenHistorial.textContent = 'Historial de estados'
    const eventos = document.createElement('ul')
    eventos.className = 'mt-2 mb-0'
    for (const evento of pedido.historial) {
      const linea = document.createElement('li')
      const fechaEvento = new Date(evento.fecha).toLocaleString('es-PE')
      linea.textContent = `${evento.estado} · ${evento.responsable} · ${evento.comentario} (${fechaEvento})`
      eventos.append(linea)
    }
    historial.append(resumenHistorial, eventos)

    tarjeta.append(encabezado, informacion, productos, historial)

    const transicionesAlmacen = {
      PENDIENTE: { accion: 'preparar', etiqueta: 'Marcar en preparación' },
      EN_PREPARACION: { accion: 'despachar', etiqueta: 'Marcar como despachado' },
      DESPACHADO: { accion: 'entregar', etiqueta: 'Registrar entrega' }
    }
    const transicion = transicionesAlmacen[pedido.estado]
    if (!esCliente && ['ADMIN', 'ALMACEN'].includes(usuarioSesion.rol) && transicion) {
      const botonEstado = document.createElement('button')
      botonEstado.type = 'button'
      botonEstado.className = 'btn btn-primary btn-sm mt-3 align-self-start'
      botonEstado.textContent = transicion.etiqueta
      botonEstado.addEventListener('click', () => actualizarEstadoPedido(
        pedido.idPedido, transicion.accion, botonEstado
      ))
      tarjeta.append(botonEstado)
    }

    listaPedidos.append(tarjeta)
  }
}

async function actualizarEstadoPedido(pedidoId, accion, boton) {
  boton.disabled = true
  estadoPedidos.className = 'text-secondary'
  estadoPedidos.textContent = `Actualizando el pedido #${pedidoId}...`
  try {
    const respuesta = await fetch(`/api/pedidos/${pedidoId}/${accion}`, {
      method: 'PUT',
      credentials: 'same-origin'
    })
    if (!respuesta.ok) {
      const cuerpo = await respuesta.json().catch(() => ({}))
      throw new Error(cuerpo.message || cuerpo.error || `Error ${respuesta.status}`)
    }
    await cargarPedidos()
    estadoPedidos.className = 'text-success'
    estadoPedidos.textContent = `Pedido #${pedidoId}: ${accion === 'preparar' ? 'en preparación' : accion === 'despachar' ? 'despachado' : 'entrega registrada'}.`
  } catch (error) {
    estadoPedidos.className = 'text-danger'
    estadoPedidos.textContent = `No se pudo actualizar el pedido. ${error.message}`
    boton.disabled = false
  }
}

async function guardarAjusteStock(
  evento,
  producto,
  entradaStock,
  campoMotivo,
  mensaje
) {
  evento.preventDefault()

  const boton = evento.currentTarget.querySelector('button[type="submit"]')
  const nuevoStock = Number(entradaStock.value)
  const motivo = campoMotivo.value.trim()

  boton.disabled = true
  mensaje.className = 'mt-2 mb-0 text-secondary'
  mensaje.textContent = 'Guardando ajuste...'

  try {
    const respuesta = await fetch(`/api/productos/${producto.id}/stock`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ nuevoStock, motivo })
    })

    if (!respuesta.ok) {
      throw new Error(`El servidor respondió con el código ${respuesta.status}`)
    }

    const productoActualizado = await respuesta.json()

    await cargarProductos()
    await cargarMovimientos(productoActualizado)

    const confirmacion = document.createElement('p')
    confirmacion.className = 'text-success fw-semibold'
    confirmacion.textContent = 'Stock actualizado y movimiento registrado.'
    contenedorHistorial.prepend(confirmacion)
  } catch (error) {
    mensaje.className = 'mt-2 mb-0 text-danger'
    mensaje.textContent = `No se pudo actualizar el stock. ${error.message}`
  } finally {
    boton.disabled = false
  }
}

async function actualizarPrecioProducto(evento, producto, entradaPrecio) {
  evento.preventDefault()

  const boton = evento.currentTarget.querySelector('button[type="submit"]')
  const precio = Number(entradaPrecio.value)

  boton.disabled = true
  resultadoFormulario.className = 'mt-3 mb-0 text-secondary'
  resultadoFormulario.textContent = 'Actualizando precio...'

  try {
    const respuesta = await fetch(`/api/productos/${producto.id}/precio`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ precio })
    })

    if (!respuesta.ok) {
      throw new Error(`El servidor respondió con el código ${respuesta.status}`)
    }

    const productoActualizado = await respuesta.json()

    await cargarProductos()
    resultadoFormulario.className = 'mt-3 mb-0 text-success'
    resultadoFormulario.textContent =
      `Precio de ${productoActualizado.nombre} actualizado correctamente.`
  } catch (error) {
    resultadoFormulario.className = 'mt-3 mb-0 text-danger'
    resultadoFormulario.textContent =
      `No se pudo actualizar el precio. ${error.message}`
  } finally {
    boton.disabled = false
  }
}
function sincronizarCategoriaDestacada() {
  document.querySelectorAll('.category-pill').forEach((boton) => {
    const activo = boton.dataset.category === filtroCategoria.value
    boton.classList.toggle('is-active', activo)
    boton.setAttribute('aria-pressed', String(activo))
  })
}
function mostrarCategoriasDestacadas(categorias) {
  const contenedor = document.querySelector('#categorias-destacadas')
  contenedor.replaceChildren()

  const crearBoton = (nombre, valor) => {
    const boton = document.createElement('button')
    boton.type = 'button'
    boton.className = 'category-pill'
    const icono = document.createElement('span')
    icono.className = 'category-icon'
    icono.setAttribute('aria-hidden', 'true')
    icono.textContent = !valor ? '✦'
      : valor.toLowerCase().includes('perif') ? '⌨'
        : valor.toLowerCase().includes('acces') ? '⌁' : '▣'
    const etiqueta = document.createElement('span')
    etiqueta.textContent = nombre
    boton.append(icono, etiqueta)

    boton.dataset.category = valor
    const activo = filtroCategoria.value === valor
    boton.classList.toggle('is-active', activo)
    boton.setAttribute('aria-pressed', String(activo))
    boton.addEventListener('click', () => {
      filtroCategoria.value = valor
      contenedor.querySelectorAll('.category-pill').forEach((elemento) => {
        const seleccionado = elemento === boton
        elemento.classList.toggle('is-active', seleccionado)
        elemento.setAttribute('aria-pressed', String(seleccionado))
      })
      cargarProductos()
    })
    return boton
  }

  contenedor.append(crearBoton('Todas', ''))
  for (const categoria of categorias) {
    contenedor.append(crearBoton(categoria.nombre, categoria.nombre))
  }
}
async function cargarCategorias() {
  const respuesta = await fetch('/api/categorias')
  if (!respuesta.ok) {
    throw new Error('No se pudieron consultar las categorías')
  }

  const categorias = await respuesta.json()
  mostrarCategoriasDestacadas(categorias)
  for (const categoria of categorias) {
    const opcionFiltro = document.createElement('option')
    opcionFiltro.value = categoria.nombre
    opcionFiltro.textContent = categoria.nombre
    filtroCategoria.append(opcionFiltro)

    const opcionProducto = document.createElement('option')
    opcionProducto.value = categoria.nombre
    opcionProducto.textContent = categoria.nombre
    categoriaProducto.append(opcionProducto)
  }
}

async function cargarProductos() {
  const solicitudActual = ++solicitudCatalogo
  const min = precioMinimo.value === '' ? null : Number(precioMinimo.value)
  const max = precioMaximo.value === '' ? null : Number(precioMaximo.value)

  if (min !== null && max !== null && min > max) {
    estado.className = 'text-danger'
    estado.textContent = 'El precio mínimo no puede superar al precio máximo.'
    contenedor.replaceChildren()
    return
  }

  const parametros = new URLSearchParams()
  if (campoBusqueda.value.trim()) parametros.set('nombre', campoBusqueda.value.trim())
  if (filtroCategoria.value) parametros.set('categoria', filtroCategoria.value)
  if (min !== null) parametros.set('precioMin', String(min))
  if (max !== null) parametros.set('precioMax', String(max))

  const consulta = parametros.size > 0 ? `?${parametros.toString()}` : ''
  estado.className = 'text-secondary catalog-status'
  estado.textContent = 'Actualizando catálogo…'

  try {
    const respuesta = await fetch(`/api/productos${consulta}`)
    if (!respuesta.ok) throw new Error('No se pudo consultar el catálogo')

    const productos = await respuesta.json()
    if (solicitudActual !== solicitudCatalogo) return

    productosDisponibles = productos
    mostrarProductos(productosDisponibles)
  } catch {
    if (solicitudActual !== solicitudCatalogo) return
    estado.className = 'alert alert-danger'
    estado.textContent = 'No se pudo cargar el catálogo. Comprueba que el backend esté activo.'
  }
}
function mostrarSesionActiva(usuario) {
  usuarioSesion = usuario
  enlaceLogin.hidden = true
  enlaceRegistro.hidden = true
  usuarioActivo.hidden = false
  usuarioActivo.textContent = `Sesión: ${usuario.nombre} (${usuario.rol})`
  botonCerrarSesion.hidden = false
  enlacePedidosNav.hidden = false
  enlaceCarritoNav.hidden = usuario.rol !== 'CLIENTE'
  seccionGestionProductos.hidden = !['ADMIN', 'VENDEDOR'].includes(usuario.rol)
  mostrarProductos(productosDisponibles)
  cargarPedidos()
  if (usuario.rol === 'CLIENTE') {
    cargarCarrito()
  } else {
    ocultarCarrito()
  }
}

function mostrarSesionCerrada() {
  usuarioSesion = null
  ocultarCarrito()
  seccionGestionProductos.hidden = true
  seccionPedidos.hidden = true
  listaPedidos.replaceChildren()
  enlaceLogin.hidden = false
  enlaceRegistro.hidden = false
  usuarioActivo.hidden = true
  usuarioActivo.textContent = ''
  botonCerrarSesion.hidden = true
  enlacePedidosNav.hidden = true
  enlaceCarritoNav.hidden = true
  mostrarProductos(productosDisponibles)
}

document.addEventListener('retail:pedido-confirmado', cargarPedidos)

async function consultarSesion() {
  try {
    const respuesta = await fetch('/api/auth/sesion', {
      credentials: 'same-origin'
    })

    if (!respuesta.ok) {
      mostrarSesionCerrada()
      return
    }

    const usuario = await respuesta.json()
    mostrarSesionActiva(usuario)
  } catch {
    mostrarSesionCerrada()
  }
}

botonCerrarSesion.addEventListener('click', async () => {
  botonCerrarSesion.disabled = true

  try {
    const respuesta = await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'same-origin'
    })

    if (!respuesta.ok) {
      throw new Error('No se pudo cerrar la sesión.')
    }

    mostrarSesionCerrada()
  } catch (error) {
    usuarioActivo.textContent = error.message
  } finally {
    botonCerrarSesion.disabled = false
  }
})

consultarSesion()
cargarCategorias().then(cargarProductos).catch(() => {
  estado.className = 'alert alert-danger'
  estado.textContent = 'No se pudieron cargar las categorías. Comprueba que el backend esté activo.'
})
