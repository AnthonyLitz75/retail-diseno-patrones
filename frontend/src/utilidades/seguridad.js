/**
 * Módulo de utilidades de seguridad para el frontend de Píxel Andino.
 * Proporciona funciones de escape y sanitización para mitigar riesgos de
 * Cross-Site Scripting (XSS) al trabajar con datos provenientes del servidor o usuario.
 */

/**
 * Mapa de caracteres especiales y sus correspondientes entidades HTML seguras.
 */
const ENTIDADES_HTML = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '/': '&#x2F;'
};

/**
 * Expresión regular para detectar caracteres que requieren escape.
 */
const REGEX_CARACTERES_INSEGUROS = /[&<>"'/]/g;

/**
 * Escapa caracteres especiales de HTML para prevenir inyecciones de código (XSS)
 * al interpolar cadenas dinámicas en plantillas que se renderizan con innerHTML.
 *
 * @param {*} valor - El valor a escapar (texto, número, etc.)
 * @returns {string} Cadena segura con entidades HTML escapadas
 */
export function escaparHtml(valor) {
  if (valor === null || valor === undefined) {
    return '';
  }

  const str = String(valor);
  if (!REGEX_CARACTERES_INSEGUROS.test(str)) {
    return str;
  }

  return str.replace(REGEX_CARACTERES_INSEGUROS, (caracter) => ENTIDADES_HTML[caracter] || caracter);
}

/**
 * Símbolo interno para identificar fragmentos de HTML previamente verificados o seguros.
 */
const SIMBOLO_HTML_SEGURO = Symbol('html_seguro');

/**
 * Envuelve una cadena de HTML confiable para indicar que no requiere escape al interpolarse en plantillas html.
 * @param {*} valor
 * @returns {{ valor: string, toString: () => string }}
 */
export function seguro(valor) {
  const str = String(valor ?? '');
  return {
    [SIMBOLO_HTML_SEGURO]: true,
    valor: str,
    toString() {
      return str;
    }
  };
}

/**
 * Determina si un valor ha sido marcado explícitamente como HTML seguro.
 * @param {*} valor
 * @returns {boolean}
 */
export function esHtmlSeguro(valor) {
  return Boolean(valor && typeof valor === 'object' && valor[SIMBOLO_HTML_SEGURO] === true);
}

/**
 * Función tag para Template Literals que escapa automáticamente todas las variables interpoladas
 * a menos que hayan sido explícitamente marcadas como HTML seguro mediante seguro().
 * Ejemplo de uso:
 *   const htmlSeguro = html`<div>Cliente: ${pedido.clienteNombre}</div>`;
 *
 * @param {TemplateStringsArray} strings - Partes estáticas del template
 * @param {...*} valores - Valores dinámicos interpolados
 * @returns {string} HTML seguro resultante
 */
export function html(strings, ...valores) {
  return strings.reduce((acumulado, parteEstatica, indice) => {
    let valor = '';
    if (indice < valores.length) {
      const v = valores[indice];
      valor = esHtmlSeguro(v) ? v.valor : escaparHtml(v);
    }
    return acumulado + parteEstatica + valor;
  }, '');
}
