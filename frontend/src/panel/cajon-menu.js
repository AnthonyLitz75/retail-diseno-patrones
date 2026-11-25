/**
 * @file cajon-menu.js
 * Panel del personal (spec 13, T12): menú lateral como cajón por debajo de 992 px.
 * - El botón (44 × 44 px) lleva aria-label, aria-controls y aria-expanded.
 * - Abrir: foco a la primera entrada (cuando el cajón ya es visible, no antes). Cerrar con Escape, al tocar fuera o al elegir una
 *   entrada; el foco vuelve al botón.
 * - Mientras está abierto, Tab y Mayús+Tab solo recorren el botón y las entradas del menú.
 * panel.css muestra el botón y convierte el menú en cajón solo por debajo de 992 px; en
 * escritorio el menú está siempre visible y el botón oculto, así que el cajón no se usa.
 */

const ETIQUETA_BOTON = "Abrir menú";
/** Respaldo si el frame llega antes de que acabe la transición del cajón (0,2 s en panel.css). */
const ESPERA_RESPALDO_MS = 250;

/**
 * @param {{ boton: HTMLButtonElement, menu: HTMLElement, documento?: Document }} opciones
 * @returns {{ abrir: () => void, cerrar: (opciones?: { devolverFoco?: boolean }) => void, estaAbierto: () => boolean }}
 */
export function crearCajonMenu({
  boton,
  menu,
  documento = globalThis.document,
  siguienteFrame = (fn) => (globalThis.requestAnimationFrame ? globalThis.requestAnimationFrame(fn) : globalThis.setTimeout(fn, 16)),
  esperar = (fn, ms) => globalThis.setTimeout(fn, ms),
}) {
  let abierto = false;
  const entradas = () => [...menu.querySelectorAll("a[href]")];
  // El pie del cajón trae también un botón («Cerrar sesión»): entra en el recorrido con Tab.
  const enfocables = () => [boton, ...menu.querySelectorAll("a[href], button")];

  boton.setAttribute("aria-label", ETIQUETA_BOTON);
  boton.setAttribute("aria-controls", menu.id);

  function pintarEstado() {
    boton.setAttribute("aria-expanded", String(abierto));
    menu.dataset.abierto = String(abierto);
  }

  function alTeclear(evento) {
    if (evento.key === "Escape") {
      cerrar();
      return;
    }
    if (evento.key !== "Tab") return;
    // Trampa de foco: el contenido de detrás no recibe el foco mientras el cajón está abierto.
    const lista = enfocables();
    const indice = lista.indexOf(documento.activeElement);
    evento.preventDefault();
    if (indice === -1) {
      (entradas()[0] ?? boton).focus();
      return;
    }
    const siguiente = (indice + (evento.shiftKey ? -1 : 1) + lista.length) % lista.length;
    lista[siguiente].focus();
  }

  function alPulsarFuera(evento) {
    // El clic que abrió (en el botón) y los clics dentro del menú no cuentan como «fuera».
    if (boton.contains(evento.target) || menu.contains(evento.target)) return;
    cerrar({ devolverFoco: false });
  }

  function abrir() {
    if (abierto) return;
    abierto = true;
    pintarEstado();
    documento.addEventListener("keydown", alTeclear);
    documento.addEventListener("click", alPulsarFuera);
    // El menú pasa de visibility:hidden a visible con una transición: en este mismo instante aún
    // está oculto y un navegador real no le da el foco. Se pide en el siguiente frame y, si
    // aún no es visible, se reintenta una vez cuando acaba la transición (0,2 s).
    siguienteFrame(() => {
      if (!abierto || enfocarPrimeraEntrada()) return;
      esperar(() => { if (abierto) enfocarPrimeraEntrada(); }, ESPERA_RESPALDO_MS);
    });
  }

  function enfocarPrimeraEntrada() {
    const destino = entradas()[0] ?? boton;
    destino.focus();
    return documento.activeElement === destino;
  }

  function cerrar({ devolverFoco = true } = {}) {
    if (!abierto) return;
    abierto = false;
    pintarEstado();
    documento.removeEventListener("keydown", alTeclear);
    documento.removeEventListener("click", alPulsarFuera);
    if (devolverFoco) boton.focus();
  }

  boton.addEventListener("click", () => (abierto ? cerrar() : abrir()));
  // Elegir una entrada cierra el cajón (la navegación la hace el propio enlace).
  menu.addEventListener("click", (evento) => {
    if (abierto && evento.target.closest?.("a[href]")) cerrar();
  });

  pintarEstado();
  return { abrir, cerrar, estaAbierto: () => abierto };
}
