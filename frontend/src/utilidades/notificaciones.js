let Toast = null
let Modal = null

if (typeof document !== 'undefined') {
  const bootstrap = await import('bootstrap')
  Toast = bootstrap.Toast
  Modal = bootstrap.Modal
}

let contenedorToasts = null
let resolverConfirmacion = null

export function configurarClaseToast(tipo = 'exito') {
  const mapa = {
    exito: 'text-bg-success',
    error: 'text-bg-danger',
    advertencia: 'text-bg-warning text-dark',
    info: 'text-bg-info text-dark'
  }
  return mapa[tipo] || (tipo.startsWith('text-bg-') ? tipo : 'text-bg-primary')
}

export function configurarIconoToast(tipo = 'exito') {
  const iconos = {
    exito: '✓',
    error: '✕',
    advertencia: '⚠',
    info: 'ℹ'
  }
  return iconos[tipo] || '•'
}

export function normalizarOpcionesConfirmacion(opciones = {}) {
  return {
    titulo: opciones.titulo || 'Confirmación',
    mensaje: opciones.mensaje || '¿Estás seguro de realizar esta acción?',
    textoBoton: opciones.textoBoton || 'Confirmar',
    claseBoton: opciones.claseBoton || 'btn-primary'
  }
}

export function obtenerContenedorToasts() {
  if (typeof document === 'undefined') return null
  if (!contenedorToasts || !document.body.contains(contenedorToasts)) {
    contenedorToasts = document.querySelector('#toast-container')
    if (!contenedorToasts) {
      contenedorToasts = document.createElement('div')
      contenedorToasts.id = 'toast-container'
      contenedorToasts.className = 'toast-container position-fixed top-0 end-0 p-3'
      contenedorToasts.style.zIndex = '1095'
      document.body.append(contenedorToasts)
    }
  }
  return contenedorToasts
}

export function mostrarToast(mensaje, tipo = 'exito', duracion = 3500) {
  if (!mensaje || typeof document === 'undefined') return null

  const contenedor = obtenerContenedorToasts()
  if (!contenedor) return null

  const toastElemento = document.createElement('div')
  const claseColor = configurarClaseToast(tipo)
  const icono = configurarIconoToast(tipo)

  toastElemento.className = `toast align-items-center ${claseColor} border-0 shadow`
  toastElemento.setAttribute('role', 'alert')
  toastElemento.setAttribute('aria-live', 'assertive')
  toastElemento.setAttribute('aria-atomic', 'true')

  const flex = document.createElement('div')
  flex.className = 'd-flex align-items-center'

  const cuerpo = document.createElement('div')
  cuerpo.className = 'toast-body d-flex align-items-center gap-2 py-2 px-3'

  const insignia = document.createElement('span')
  insignia.className = 'fw-bold fs-6'
  insignia.setAttribute('aria-hidden', 'true')
  insignia.textContent = icono

  const texto = document.createElement('span')
  texto.textContent = mensaje

  cuerpo.append(insignia, texto)

  const botonCerrar = document.createElement('button')
  botonCerrar.type = 'button'
  const esOscuro = tipo === 'advertencia' || tipo === 'info'
  botonCerrar.className = `btn-close ${esOscuro ? '' : 'btn-close-white'} me-2 m-auto`
  botonCerrar.setAttribute('data-bs-dismiss', 'toast')
  botonCerrar.setAttribute('aria-label', 'Cerrar notificación')

  flex.append(cuerpo, botonCerrar)
  toastElemento.append(flex)
  contenedor.append(toastElemento)

  const instancia = Toast.getOrCreateInstance(toastElemento, {
    autohide: true,
    delay: duracion
  })
  instancia.show()

  toastElemento.addEventListener('hidden.bs.toast', () => {
    toastElemento.remove()
  })

  return toastElemento
}

export function obtenerModalConfirmacion() {
  if (typeof document === 'undefined') return null
  let modalElemento = document.querySelector('#modal-confirmacion')
  if (!modalElemento) {
    modalElemento = document.createElement('div')
    modalElemento.id = 'modal-confirmacion'
    modalElemento.className = 'modal fade'
    modalElemento.tabIndex = -1
    modalElemento.setAttribute('aria-labelledby', 'modal-confirmacion-titulo')
    modalElemento.setAttribute('aria-hidden', 'true')
    modalElemento.innerHTML = `
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content shadow">
          <div class="modal-header border-bottom">
            <h5 class="modal-title h6 fw-bold" id="modal-confirmacion-titulo">Confirmación</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
          </div>
          <div class="modal-body py-3">
            <p id="modal-confirmacion-mensaje" class="mb-0 text-secondary"></p>
          </div>
          <div class="modal-footer border-top">
            <button type="button" id="modal-confirmacion-cancelar" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">Cancelar</button>
            <button type="button" id="modal-confirmacion-aceptar" class="btn btn-primary btn-sm">Confirmar</button>
          </div>
        </div>
      </div>
    `
    document.body.append(modalElemento)

    modalElemento.addEventListener('hidden.bs.modal', () => {
      if (resolverConfirmacion) {
        resolverConfirmacion(false)
        resolverConfirmacion = null
      }
    })

    const botonAceptar = modalElemento.querySelector('#modal-confirmacion-aceptar')
    botonAceptar.addEventListener('click', () => {
      if (resolverConfirmacion) {
        resolverConfirmacion(true)
        resolverConfirmacion = null
      }
      Modal.getOrCreateInstance(modalElemento).hide()
    })
  }
  return modalElemento
}

export function mostrarConfirmacion(opciones) {
  const conf = normalizarOpcionesConfirmacion(opciones)
  return new Promise((resolve) => {
    resolverConfirmacion = resolve

    const modalElemento = obtenerModalConfirmacion()
    if (!modalElemento) {
      resolve(false)
      return
    }

    const tituloEl = modalElemento.querySelector('#modal-confirmacion-titulo')
    const mensajeEl = modalElemento.querySelector('#modal-confirmacion-mensaje')
    const botonAceptar = modalElemento.querySelector('#modal-confirmacion-aceptar')

    if (tituloEl) tituloEl.textContent = conf.titulo
    if (mensajeEl) mensajeEl.textContent = conf.mensaje
    if (botonAceptar) {
      botonAceptar.textContent = conf.textoBoton
      botonAceptar.className = `btn ${conf.claseBoton} btn-sm`
    }

    const modalInstancia = Modal.getOrCreateInstance(modalElemento)
    modalInstancia.show()
  })
}
