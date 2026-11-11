import "bootstrap/dist/css/bootstrap.min.css";
import "../style.css";
import "../css/auth.css";
import { apiRequest } from "../api/api.js";
import { destinoTrasLogin } from "../utilidades/errores-globales.js";
import { renderizarLogoSvg } from "../layout/componentes/logo.js";

document.querySelector("#app").innerHTML = `
  <main class="auth-split-layout">
    <!-- Panel Izquierdo: Branding y Propuesta de Valor -->
    <aside class="auth-showcase-panel">
      <div class="auth-showcase-content">
        <a href="/" class="auth-showcase-brand" aria-label="Volver al catálogo de Píxel Andino">
          <span class="auth-brand-logo" aria-hidden="true">
            ${renderizarLogoSvg({ prefijo: 'showcase', width: 44, height: 44 })}
          </span>
          <span class="auth-brand-text">
            <span class="brand-title">PÍXEL <strong>ANDINO</strong></span>
            <span class="brand-subtitle">TECH STORE</span>
          </span>
        </a>

        <div class="auth-showcase-hero">
          <h1 class="auth-showcase-title">Tu portal tecnológico de confianza</h1>
          <p class="auth-showcase-desc">
            Accede a periféricos, accesorios y componentes de alta gama con garantía oficial y envíos a todo el Perú.
          </p>

          <div class="auth-trust-pills">
            <div class="auth-trust-pill">
              <span class="trust-icon" aria-hidden="true">
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
              </span>
              <span>Garantía oficial asegurada</span>
            </div>
            <div class="auth-trust-pill">
              <span class="trust-icon" aria-hidden="true">
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
              </span>
              <span>Envíos rápidos a nivel nacional</span>
            </div>
            <div class="auth-trust-pill">
              <span class="trust-icon" aria-hidden="true">
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
              </span>
              <span>Pagos cifrados e idempotentes</span>
            </div>
          </div>
        </div>

        <div class="auth-showcase-footer">
          <span>&copy; 2026 Píxel Andino S.A.C. Todos los derechos reservados.</span>
        </div>
      </div>
    </aside>

    <!-- Panel Derecho: Formulario de Autenticación -->
    <section class="auth-form-panel">
      <div class="auth-card-wrapper">
        <header class="auth-form-header text-center text-lg-start mb-4">
          <span class="badge auth-badge-welcome mb-2">Bienvenido de nuevo</span>
          <h2 class="auth-form-title">Iniciar sesión</h2>
          <p class="auth-form-subtitle text-secondary">Ingresa tus credenciales para continuar con tus compras o gestión.</p>
        </header>

        <div class="card auth-card shadow-sm">
          <div class="card-body">
            <form id="form-login">
              <div class="mb-3">
                <label for="correo" class="form-label">Correo electrónico</label>
                <div class="auth-input-group">
                  <span class="auth-input-icon" aria-hidden="true">
                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                    </svg>
                  </span>
                  <input id="correo" class="form-control auth-input" type="email" maxlength="180" autocomplete="username" placeholder="ejemplo@correo.com" required>
                </div>
              </div>

              <div class="mb-3">
                <label for="clave" class="form-label">Contraseña</label>
                <div class="auth-input-group">
                  <span class="auth-input-icon" aria-hidden="true">
                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                    </svg>
                  </span>
                  <input id="clave" class="form-control auth-input" type="password" minlength="8" maxlength="72" autocomplete="current-password" placeholder="Tu contraseña" required>
                  <button type="button" class="auth-password-toggle" id="toggle-clave" aria-label="Mostrar u ocultar contraseña">
                    <svg class="icon-eye" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                      <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                    </svg>
                  </button>
                </div>
              </div>

              <button class="btn btn-primary auth-submit-btn w-100" type="submit">
                <span>Iniciar sesión</span>
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
                </svg>
              </button>
            </form>

            <p id="resultado-login" class="mt-3 mb-0" role="status" aria-live="polite"></p>
          </div>
        </div>

        <footer class="auth-form-footer text-center mt-4">
          <p class="mb-2 text-secondary">¿Aún no tienes cuenta? <a href="/register.html" class="fw-semibold text-primary">Crear cuenta</a></p>
          <a class="auth-back-link d-inline-flex align-items-center gap-1 text-decoration-none" href="/">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
            </svg>
            Volver al catálogo
          </a>
        </footer>
      </div>
    </section>
  </main>
`;

const formulario = document.querySelector("#form-login");
const resultado = document.querySelector("#resultado-login");
const correoInput = document.querySelector("#correo");
const claveInput = document.querySelector("#clave");
const toggleClaveBtn = document.querySelector("#toggle-clave");

// Alternar visibilidad de contraseña
toggleClaveBtn?.addEventListener("click", () => {
  const esPassword = claveInput.getAttribute("type") === "password";
  claveInput.setAttribute("type", esPassword ? "text" : "password");
  toggleClaveBtn.setAttribute(
    "aria-label",
    esPassword ? "Ocultar contraseña" : "Mostrar contraseña",
  );
  toggleClaveBtn.classList.toggle("active", esPassword);
  toggleClaveBtn.innerHTML = esPassword
    ? `<svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"/>
      </svg>`
    : `<svg class="icon-eye" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
        <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
      </svg>`;
});

// Si llegó aquí desde una ruta protegida o con la sesión vencida, se le explica por qué.
if (destinoTrasLogin(window.location.search) !== "/") {
  resultado.className = "mt-3 mb-0 text-secondary";
  resultado.textContent = "Inicia sesión para continuar; al terminar volverás a donde estabas.";
}

formulario.addEventListener("submit", async (evento) => {
  evento.preventDefault();

  const correo = correoInput.value.trim();
  const clave = claveInput.value;
  const boton = formulario.querySelector('button[type="submit"]');

  boton.disabled = true;
  resultado.className = "mt-3 mb-0 text-secondary";
  resultado.textContent = "Iniciando sesión...";

  try {
    const respuesta = await apiRequest("/api/auth/login", {
      method: "POST",
      json: { correo, clave },
    });

    const cuerpo = await respuesta.json();
    resultado.className = "mt-3 mb-0 text-success";
    resultado.textContent = `Sesión iniciada. Bienvenida/o, ${cuerpo.nombre} (${cuerpo.rol}). Redirigiendo...`;
    formulario.reset();

    // Redirección suave: vuelve a la ruta de la SPA donde estaba (spec 007, T002) o al catálogo
    setTimeout(() => {
      window.location.href = destinoTrasLogin(window.location.search);
    }, 600);
  } catch (error) {
    resultado.className = "mt-3 mb-0 text-danger";
    resultado.textContent = error.message;
  } finally {
    boton.disabled = false;
  }
});
