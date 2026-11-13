/**
 * @file foco-teclado.js
 * Navegación solo con teclado (RNF06). Bootstrap devuelve el foco al cerrar un modal u
 * offcanvas solo si se abrió con data-bs-toggle; aquí casi todos se abren desde código
 * (agregar al carrito, menú "Gestionar"…) y el foco caía en <body>. Este módulo:
 *  - recuerda qué tenía el foco al abrir y lo devuelve al cerrar;
 *  - al abrir un modal, pone el foco en su primer campo en vez de en la ventana;
 *  - activa el enlace "Saltar al contenido" sin cambiar el hash (el router lo leería
 *    como una ruta desconocida).
 */

const SELECTOR_CAMPO = "input:not([type=hidden]):not([disabled]), select:not([disabled]), textarea:not([disabled])";

/** Un elemento al que tiene sentido devolver el foco: sigue en la página y se ve. */
export function puedeRecibirFoco(elemento, documento = globalThis.document) {
  if (!elemento || elemento === documento?.body || typeof elemento.focus !== "function") return false;
  if (elemento.isConnected === false) return false;
  if (elemento.closest?.("[hidden]")) return false;
  return elemento.getClientRects ? elemento.getClientRects().length > 0 : true;
}

/** Primer campo editable visible del contenedor, o null. */
export function primerCampo(contenedor) {
  const campos = contenedor?.querySelectorAll ? [...contenedor.querySelectorAll(SELECTOR_CAMPO)] : [];
  return campos.find((campo) => puedeRecibirFoco(campo)) ?? null;
}

export function configurarFocoTeclado(documento = globalThis.document) {
  if (!documento?.addEventListener) return;
  const origen = new WeakMap();

  const recordar = (evento) => {
    const activo = documento.activeElement;
    if (puedeRecibirFoco(activo, documento) && !evento.target.contains?.(activo)) {
      origen.set(evento.target, activo);
    }
  };
  const devolver = (evento) => {
    const anterior = origen.get(evento.target);
    origen.delete(evento.target);
    const activo = documento.activeElement;
    const focoPerdido = !activo || activo === documento.body || evento.target.contains?.(activo);
    if (!focoPerdido) return;
    // Si quien lo abrió ya no existe (p. ej. el catálogo se redibujó tras la compra), se usa
    // el respaldo que declara el panel: data-foco-respaldo="#selector".
    const respaldo = evento.target.dataset?.focoRespaldo
      ? documento.querySelector?.(evento.target.dataset.focoRespaldo)
      : null;
    const destino = [anterior, respaldo].find((candidato) => puedeRecibirFoco(candidato, documento));
    destino?.focus();
  };

  for (const tipo of ["show.bs.modal", "show.bs.offcanvas"]) documento.addEventListener(tipo, recordar);
  for (const tipo of ["hidden.bs.modal", "hidden.bs.offcanvas"]) documento.addEventListener(tipo, devolver);

  documento.addEventListener("shown.bs.modal", (evento) => {
    if (documento.activeElement === evento.target) primerCampo(evento.target)?.focus();
  });

  documento.addEventListener("click", (evento) => {
    const enlace = evento.target.closest?.("[data-saltar-a]");
    if (!enlace) return;
    evento.preventDefault();
    const destino = documento.getElementById(enlace.dataset.saltarA);
    if (destino) {
      destino.focus();
      destino.scrollIntoView?.({ block: "start" });
    }
  });
}
