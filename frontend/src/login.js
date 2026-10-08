import 'bootstrap/dist/css/bootstrap.min.css'
import './style.css'

document.querySelector('#app').innerHTML = `
  <main class="container py-5 auth-page">
    <header class="mb-4">
      <p class="text-primary fw-semibold mb-1">RETAIL</p>
      <h1 class="display-6 fw-bold">Iniciar sesión</h1>
      <p class="text-secondary">Ingresa a tu cuenta para continuar con tus compras.</p>
    </header>
    <section class="card shadow-sm auth-card">
      <div class="card-body">
        <form id="form-login">
          <div class="mb-3">
            <label for="correo" class="form-label">Correo electrónico</label>
            <input id="correo" class="form-control" type="email" maxlength="180" autocomplete="email" required>
          </div>
          <div class="mb-3">
            <label for="clave" class="form-label">Contraseña</label>
            <input id="clave" class="form-control" type="password" minlength="8" maxlength="72" autocomplete="current-password" required>
          </div>
          <button class="btn btn-primary" type="submit">Iniciar sesión</button>
        </form>
        <p id="resultado-login" class="mt-3 mb-0" role="status" aria-live="polite"></p>
        <p class="mt-3 mb-0">¿Aún no tienes cuenta? <a href="/register.html">Crear cuenta</a></p>
        <a class="d-inline-block mt-3" href="/">Volver al catálogo</a>
      </div>
    </section>
  </main>
`

const formulario = document.querySelector('#form-login')
const resultado = document.querySelector('#resultado-login')

formulario.addEventListener('submit', async (evento) => {
  evento.preventDefault()

  const correo = document.querySelector('#correo').value.trim()
  const clave = document.querySelector('#clave').value
  const boton = formulario.querySelector('button[type="submit"]')

  boton.disabled = true
  resultado.className = 'mt-3 mb-0 text-secondary'
  resultado.textContent = 'Iniciando sesión...'

  try {
    const respuesta = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'same-origin',
      body: JSON.stringify({ correo, clave })
    })

    const cuerpo = await respuesta.json().catch(() => ({}))

    if (!respuesta.ok) {
      throw new Error(cuerpo.error || 'No se pudo iniciar sesión.')
    }

    resultado.className = 'mt-3 mb-0 text-success'
    resultado.textContent = `Sesión iniciada. Bienvenida/o, ${cuerpo.nombre} (${cuerpo.rol}).`
    formulario.reset()
  } catch (error) {
    resultado.className = 'mt-3 mb-0 text-danger'
    resultado.textContent = error.message
  } finally {
    boton.disabled = false
  }
})
