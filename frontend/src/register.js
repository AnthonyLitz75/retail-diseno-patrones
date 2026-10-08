import 'bootstrap/dist/css/bootstrap.min.css'
import './style.css'

document.querySelector('#app').innerHTML = [
  '<main class="container py-5 auth-page">',
  '  <header class="mb-4">',
  '    <p class="text-primary fw-semibold mb-1">PÍXEL ANDINO</p>',
  '    <h1 class="display-6 fw-bold">Crear cuenta de cliente</h1>',
  '    <p class="text-secondary">Regístrate para guardar tu carrito y realizar compras.</p>',
  '  </header>',
  '  <section class="card shadow-sm auth-card">',
  '    <div class="card-body">',
  '      <form id="form-registro">',
  '        <div class="mb-3">',
  '          <label for="nombre" class="form-label">Nombre completo</label>',
  '          <input id="nombre" class="form-control" type="text" maxlength="120" autocomplete="name" required>',
  '        </div>',
  '        <div class="mb-3">',
  '          <label for="correo" class="form-label">Correo electrónico</label>',
  '          <input id="correo" class="form-control" type="email" maxlength="180" autocomplete="email" required>',
  '        </div>',
  '        <div class="mb-3">',
  '          <label for="clave" class="form-label">Contraseña</label>',
  '          <input id="clave" class="form-control" type="password" minlength="8" maxlength="72" autocomplete="new-password" required>',
  '          <div class="form-text">Usa entre 8 y 72 caracteres.</div>',
  '        </div>',
  '        <div class="mb-3">',
  '          <label for="confirmar-clave" class="form-label">Confirmar contraseña</label>',
  '          <input id="confirmar-clave" class="form-control" type="password" minlength="8" maxlength="72" autocomplete="new-password" required>',
  '        </div>',
  '        <button class="btn btn-primary" type="submit">Crear cuenta</button>',
  '      </form>',
  '      <p id="resultado-registro" class="mt-3 mb-0" role="status" aria-live="polite"></p>',
  '      <a class="d-inline-block mt-3" href="/">Volver al catálogo</a>',
  '    </div>',
  '  </section>',
  '</main>'
].join('\n')

const formulario = document.querySelector('#form-registro')
const resultado = document.querySelector('#resultado-registro')

formulario.addEventListener('submit', async (evento) => {
  evento.preventDefault()

  const nombre = document.querySelector('#nombre').value.trim()
  const correo = document.querySelector('#correo').value.trim()
  const clave = document.querySelector('#clave').value
  const confirmarClave = document.querySelector('#confirmar-clave').value

  if (clave !== confirmarClave) {
    resultado.className = 'mt-3 mb-0 text-danger'
    resultado.textContent = 'Las contraseñas no coinciden.'
    return
  }

  const boton = formulario.querySelector('button[type="submit"]')
  boton.disabled = true
  resultado.className = 'mt-3 mb-0 text-secondary'
  resultado.textContent = 'Creando cuenta...'

  try {
    const respuesta = await fetch('/api/auth/registro', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ nombre, correo, clave })
    })

    const cuerpo = await respuesta.json().catch(() => ({}))

    if (!respuesta.ok) {
      throw new Error(cuerpo.error || 'No se pudo crear la cuenta.')
    }

    resultado.className = 'mt-3 mb-0 text-success'
    resultado.textContent = 'Cuenta creada para ' + cuerpo.nombre + '.'
    formulario.reset()
  } catch (error) {
    resultado.className = 'mt-3 mb-0 text-danger'
    resultado.textContent = error.message
  } finally {
    boton.disabled = false
  }
})
