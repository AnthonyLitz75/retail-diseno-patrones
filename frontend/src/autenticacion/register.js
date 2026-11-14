import 'bootstrap/dist/css/bootstrap.min.css'
import '../style.css'
import '../css/auth.css'
import { apiRequest } from '../api/api.js'
import { renderizarLogoSvg } from '../layout/componentes/logo.js'
import { evaluarClave, REGLAS_CLAVE, validarRegistro } from './reglas-clave.js'
import { html, seguro } from '../utilidades/seguridad.js'

const OJO = html`<svg class="icon-eye" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
  <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
  <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
</svg>`
const OJO_TACHADO = html`<svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
  <path stroke-linecap="round" stroke-linejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"/>
</svg>`

// Boceto "Crear cuenta - propuesta": mismo diseño dividido que el inicio de sesión.
document.querySelector('#app').innerHTML = html`
  <main class="auth-split-layout">
    <aside class="auth-showcase-panel">
      <div class="auth-showcase-content">
        <a href="/" class="auth-showcase-brand" aria-label="Volver al catálogo de Píxel Andino">
          <span class="auth-brand-logo" aria-hidden="true">
            ${seguro(renderizarLogoSvg({ prefijo: 'reg', width: 44, height: 44 }))}
          </span>
          <span class="auth-brand-text">
            <span class="brand-title">PÍXEL <strong>ANDINO</strong></span>
            <span class="brand-subtitle">TECH STORE</span>
          </span>
        </a>

        <div class="auth-showcase-hero">
          <h1 class="auth-showcase-title">Crea tu cuenta y compra con confianza</h1>
          <p class="auth-showcase-desc">Regístrate para guardar tu carrito, seguir tus pedidos y recibir atención cuando la necesites.</p>
          <div class="auth-trust-pills">
            <div class="auth-trust-pill">
              <span class="trust-icon" aria-hidden="true">
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
              </span>
              <span>Guarda tu carrito y retómalo cuando quieras</span>
            </div>
            <div class="auth-trust-pill">
              <span class="trust-icon" aria-hidden="true">
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
              </span>
              <span>Sigue tus pedidos de la compra a la entrega</span>
            </div>
            <div class="auth-trust-pill">
              <span class="trust-icon" aria-hidden="true">
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
              </span>
              <span>Consultas, reclamos y devoluciones en un solo lugar</span>
            </div>
          </div>
        </div>

        <div class="auth-showcase-footer">
          <span>&copy; 2026 Píxel Andino S.A.C. Todos los derechos reservados.</span>
        </div>
      </div>
    </aside>

    <section class="auth-form-panel">
      <div class="auth-card-wrapper">
        <header class="auth-form-header text-center text-lg-start mb-4">
          <span class="badge auth-badge-welcome mb-2">Nuevo cliente</span>
          <h2 class="auth-form-title">Crear cuenta de cliente</h2>
          <p class="auth-form-subtitle text-secondary">Regístrate para guardar tu carrito y realizar compras protegidas.</p>
        </header>

        <div class="card auth-card shadow-sm">
          <div class="card-body">
            <form id="form-registro" novalidate>
              <div class="mb-3">
                <label for="nombre" class="form-label">Nombre completo</label>
                <div class="auth-input-group">
                  <span class="auth-input-icon" aria-hidden="true">
                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                  </span>
                  <input id="nombre" class="form-control auth-input" type="text" maxlength="120" autocomplete="name" placeholder="Tu nombre y apellido" required>
                </div>
              </div>
              <div class="mb-3">
                <label for="correo" class="form-label">Correo electrónico</label>
                <div class="auth-input-group">
                  <span class="auth-input-icon" aria-hidden="true">
                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                  </span>
                  <input id="correo" class="form-control auth-input" type="email" maxlength="180" autocomplete="email" placeholder="ejemplo@correo.com" required>
                </div>
              </div>
              <div class="mb-3">
                <label for="clave" class="form-label">Contraseña</label>
                <div class="auth-input-group">
                  <span class="auth-input-icon" aria-hidden="true">
                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                  </span>
                  <input id="clave" class="form-control auth-input" type="password" minlength="8" maxlength="72" autocomplete="new-password" placeholder="Crea una contraseña" aria-describedby="reglas-clave" required>
                  <button type="button" class="auth-password-toggle" id="toggle-clave" aria-label="Mostrar contraseña">${OJO}</button>
                </div>
                <ul id="reglas-clave" class="auth-reglas-clave" aria-live="polite">
                  ${REGLAS_CLAVE.map((regla) => `<li data-regla="${regla.id}">${regla.texto}</li>`).join('')}
                </ul>
              </div>
              <div class="mb-3">
                <label for="confirmar-clave" class="form-label">Confirmar contraseña</label>
                <div class="auth-input-group">
                  <span class="auth-input-icon" aria-hidden="true">
                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                  </span>
                  <input id="confirmar-clave" class="form-control auth-input" type="password" minlength="8" maxlength="72" autocomplete="new-password" placeholder="Repite tu contraseña" aria-describedby="coincide-clave" required>
                  <button type="button" class="auth-password-toggle" id="toggle-confirmar-clave" aria-label="Mostrar confirmación de contraseña">${OJO}</button>
                </div>
                <p id="coincide-clave" class="small text-secondary mt-1 mb-0" aria-live="polite">Debe coincidir con la contraseña.</p>
              </div>
              <div class="form-check mb-1">
                <input id="acepta-terminos" class="form-check-input" type="checkbox" required>
                <label for="acepta-terminos" class="form-check-label small">Acepto los términos de uso y la política de privacidad.</label>
              </div>
              <details class="auth-terminos small mb-3">
                <summary>Leer términos y privacidad</summary>
                <p class="mb-1">Píxel Andino es una tienda de demostración de un proyecto académico: los pagos son simulados y no se cobra dinero real.</p>
                <p class="mb-1">Usamos tu nombre, correo y dirección solo para gestionar tu cuenta, tus pedidos y tu atención postventa. No los compartimos con terceros.</p>
                <p class="mb-0">Tu contraseña se guarda cifrada. Puedes pedir la baja de tu cuenta a soporte en cualquier momento.</p>
              </details>
              <button class="btn btn-primary auth-submit-btn w-100" type="submit">
                <span>Crear cuenta</span>
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
              </button>
            </form>
            <p id="resultado-registro" class="mt-3 mb-0" role="status" aria-live="polite"></p>
          </div>
        </div>

        <footer class="auth-form-footer text-center mt-4">
          <p class="mb-2 text-secondary">¿Ya tienes cuenta? <a href="/login.html" class="fw-semibold text-primary">Iniciar sesión</a></p>
          <a class="auth-back-link d-inline-flex align-items-center gap-1 text-decoration-none" href="/">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
            Volver al catálogo
          </a>
        </footer>
      </div>
    </section>
  </main>
`

const formulario = document.querySelector('#form-registro')
const resultado = document.querySelector('#resultado-registro')
const claveInput = document.querySelector('#clave')
const confirmarClaveInput = document.querySelector('#confirmar-clave')
const listaReglas = document.querySelector('#reglas-clave')
const textoCoincide = document.querySelector('#coincide-clave')

function configurarTogglePassword(boton, input, nombre) {
  if (!boton || !input) return
  boton.addEventListener('click', () => {
    const mostrar = input.getAttribute('type') === 'password'
    input.setAttribute('type', mostrar ? 'text' : 'password')
    boton.setAttribute('aria-label', `${mostrar ? 'Ocultar' : 'Mostrar'} ${nombre}`)
    boton.classList.toggle('active', mostrar)
    boton.innerHTML = html`${seguro(mostrar ? OJO_TACHADO : OJO)}`
  })
}

configurarTogglePassword(document.querySelector('#toggle-clave'), claveInput, 'contraseña')
configurarTogglePassword(document.querySelector('#toggle-confirmar-clave'), confirmarClaveInput, 'confirmación de contraseña')

// Reglas en vivo: cada una se marca al cumplirse mientras el cliente escribe.
function actualizarReglas() {
  for (const regla of evaluarClave(claveInput.value)) {
    listaReglas.querySelector(`[data-regla="${regla.id}"]`)?.classList.toggle('cumple', regla.cumple)
  }
  const confirmar = confirmarClaveInput.value
  textoCoincide.classList.remove('text-success', 'text-danger', 'text-secondary')
  if (!confirmar) {
    textoCoincide.classList.add('text-secondary')
    textoCoincide.textContent = 'Debe coincidir con la contraseña.'
  } else if (confirmar === claveInput.value) {
    textoCoincide.classList.add('text-success')
    textoCoincide.textContent = 'Las contraseñas coinciden.'
  } else {
    textoCoincide.classList.add('text-danger')
    textoCoincide.textContent = 'Todavía no coinciden.'
  }
}
claveInput.addEventListener('input', actualizarReglas)
confirmarClaveInput.addEventListener('input', actualizarReglas)

function marcarCampo(id) {
  formulario.querySelectorAll('.is-invalid').forEach((campo) => {
    campo.classList.remove('is-invalid')
    campo.removeAttribute('aria-invalid')
  })
  const campo = id ? document.getElementById(id) : null
  if (campo) {
    campo.classList.add('is-invalid')
    campo.setAttribute('aria-invalid', 'true')
    campo.focus()
  }
}

formulario.addEventListener('submit', async (evento) => {
  evento.preventDefault()

  const datos = {
    nombre: document.querySelector('#nombre').value,
    correo: document.querySelector('#correo').value,
    clave: claveInput.value,
    confirmar: confirmarClaveInput.value,
    acepta: document.querySelector('#acepta-terminos').checked
  }
  const problema = validarRegistro(datos)
  if (problema) {
    marcarCampo(problema.campo)
    resultado.className = 'mt-3 mb-0 text-danger'
    resultado.textContent = problema.mensaje
    return
  }
  marcarCampo(null)

  const boton = formulario.querySelector('button[type="submit"]')
  boton.disabled = true
  resultado.className = 'mt-3 mb-0 text-secondary'
  resultado.textContent = 'Creando cuenta...'

  try {
    const respuesta = await apiRequest('/api/auth/registro', {
      method: 'POST',
      json: { nombre: datos.nombre.trim(), correo: datos.correo.trim(), clave: datos.clave }
    })

    const cuerpo = await respuesta.json()
    resultado.className = 'mt-3 mb-0 text-success'
    resultado.textContent = 'Cuenta creada para ' + cuerpo.nombre + '. Redirigiendo a inicio de sesión...'
    formulario.reset()
    actualizarReglas()
    setTimeout(() => {
      window.location.href = '/login.html'
    }, 700)
  } catch (error) {
    resultado.className = 'mt-3 mb-0 text-danger'
    resultado.textContent = error.message
  } finally {
    boton.disabled = false
  }
})
