/**
 * @file bandeja-controlador.js
 * Panel del personal (rediseño v6, tanda 2): estado de una bandeja de dos paneles (Reclamos o
 * Devoluciones) sin tocar el DOM. Carga cada estado con ?estado= (así cuenta todas las pestañas),
 * decide la pestaña y el elemento elegidos a partir de ?id= del hash, filtra con el buscador y
 * guarda los contextos de pedido (de ahí salen el nombre del cliente y el estado y total del pedido).
 * Elegir algo no cambia el estado a mano: pide la ruta con `navegar` y el router vuelve a mostrar.
 */

import { listarBandejaDevoluciones, listarBandejaReclamos } from "../../atencion/atencion.js";
import { crearContextosPedido } from "./contextos-pedido.js";
import {
  elegirSeleccion, filtrarElementos, idDeParametros, ordenarPestana, pestanasDe, rutaDeElemento,
} from "./bandeja-logica.js";

/** Como máximo, los contextos de pedido que se piden por pestaña para mostrar nombres. */
const MAX_CONTEXTOS = 30;

/**
 * @param {{ tipo: "reclamos"|"devoluciones", apiRequest: Function, usuarioId: number,
 *   navegar: (ruta: string) => void }} opciones
 */
export function crearBandeja({ tipo, apiRequest, usuarioId, navegar }) {
  const pestanas = pestanasDe(tipo);
  const listar = tipo === "devoluciones" ? listarBandejaDevoluciones : listarBandejaReclamos;
  /** estado → lista ordenada, o null si esa carga falló. */
  let porEstado = {};
  let errores = [];
  let activa = null;
  let idEnUrl = null;
  let texto = "";
  let elegido = null;
  // Misma fuente de nombres que el Inicio de Soporte: el contexto del pedido.
  const { contextos, nombres, cargarUno, cargar: cargarContextosDe } = crearContextosPedido(apiRequest);

  async function cargar() {
    errores = [];
    const resultados = await Promise.allSettled(pestanas.map((p) => listar(apiRequest, p.id)));
    porEstado = {};
    resultados.forEach((r, i) => {
      const estado = pestanas[i].id;
      if (r.status === "fulfilled") porEstado[estado] = ordenarPestana(estado, r.value);
      else {
        porEstado[estado] = null;
        errores.push(estado);
      }
    });
  }

  const sinFallos = () => Object.fromEntries(pestanas.map((p) => [p.id, porEstado[p.id] ?? []]));

  /** Calcula pestaña activa y elemento elegido para los parámetros de la ruta. */
  function mostrar(parametros) {
    idEnUrl = idDeParametros(parametros);
    const seleccion = elegirSeleccion(sinFallos(), pestanas, idEnUrl, activa);
    activa = seleccion.pestana;
    elegido = seleccion.elemento;
  }

  function vista() {
    const lista = porEstado[activa] ?? [];
    return {
      tipo,
      pestanas: pestanas.map((p) => ({
        id: p.id, etiqueta: p.etiqueta, activa: p.id === activa, total: porEstado[p.id] == null ? null : porEstado[p.id].length,
      })),
      activa,
      elementos: filtrarElementos(lista, texto, nombres),
      elegido,
      elegidoId: elegido?.id ?? null,
      idEnUrl,
      conDetalle: idEnUrl != null,
      texto,
      errores: [...errores],
    };
  }

  /** Elegir un elemento cambia el hash (con historial): «Atrás» y recargar funcionan. */
  function elegir(id) {
    navegar(rutaDeElemento(tipo, id));
  }

  /** Cambiar de pestaña elige el primero de esa pestaña y lo pone en la URL. */
  function cambiarPestana(estado) {
    activa = estado;
    const primero = (porEstado[estado] ?? [])[0] ?? null;
    elegido = primero;
    if (primero) elegir(primero.id);
  }

  function volverALaLista() {
    navegar(rutaDeElemento(tipo, null));
  }

  function buscar(valor) {
    texto = String(valor ?? "");
  }

  /** Todos los elementos cargados (de todas las pestañas): para los contadores del menú. */
  function todos() {
    return pestanas.flatMap((p) => porEstado[p.id] ?? []);
  }

  /** Contexto del pedido (cliente, estado, total…); guarda el nombre para la lista y el buscador. */
  const cargarContexto = cargarUno;

  /** Pide los contextos de los pedidos de la pestaña activa (y del elegido) que aún no se conocen. */
  async function cargarContextos() {
    const ids = new Set((porEstado[activa] ?? []).slice(0, MAX_CONTEXTOS).map((e) => e.pedidoId));
    if (elegido) ids.add(elegido.pedidoId);
    await cargarContextosDe([...ids]);
  }

  return {
    tipo, usuarioId, nombres, contextos,
    cargar, mostrar, vista, elegir, cambiarPestana, volverALaLista, buscar, cargarContexto, cargarContextos, todos,
  };
}
