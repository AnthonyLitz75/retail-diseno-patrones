/**
 * @file reglas-clave.js
 * Reglas del registro de cliente (boceto "Crear cuenta"), las mismas que valida el backend
 * en RegistroCliente/ReglasClave: 8 a 72 caracteres, una mayúscula y un número. Se muestran
 * en vivo mientras el cliente escribe su contraseña.
 */

export const REGLAS_CLAVE = Object.freeze([
  { id: "longitud", texto: "Entre 8 y 72 caracteres", cumple: (clave) => clave.length >= 8 && clave.length <= 72 },
  { id: "mayuscula", texto: "Al menos una letra mayúscula", cumple: (clave) => /\p{Lu}/u.test(clave) },
  { id: "numero", texto: "Al menos un número", cumple: (clave) => /\d/.test(clave) },
]);

/** Estado de cada regla para la contraseña escrita. */
export function evaluarClave(clave = "") {
  const texto = String(clave);
  return REGLAS_CLAVE.map(({ id, texto: etiqueta, cumple }) => ({ id, texto: etiqueta, cumple: cumple(texto) }));
}

export function claveCumpleReglas(clave = "") {
  return evaluarClave(clave).every((regla) => regla.cumple);
}

/**
 * Primer problema del formulario, en el orden en que el cliente lo llena; null si todo
 * está bien. Evita enviar al servidor lo que ya se sabe que va a rechazar.
 */
export function validarRegistro({ nombre = "", correo = "", clave = "", confirmar = "", acepta = false } = {}) {
  if (!nombre.trim()) return { campo: "nombre", mensaje: "Escribe tu nombre completo." };
  if (!/^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/.test(correo.trim())) {
    return { campo: "correo", mensaje: "Escribe un correo válido (ejemplo@correo.com)." };
  }
  const pendiente = evaluarClave(clave).find((regla) => !regla.cumple);
  if (pendiente) return { campo: "clave", mensaje: `La contraseña no cumple: ${pendiente.texto.toLowerCase()}.` };
  if (clave !== confirmar) return { campo: "confirmar-clave", mensaje: "Las contraseñas no coinciden." };
  if (!acepta) return { campo: "acepta-terminos", mensaje: "Acepta los términos y la política de privacidad para crear tu cuenta." };
  return null;
}
