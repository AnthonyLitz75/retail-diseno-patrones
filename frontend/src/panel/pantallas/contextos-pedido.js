/**
 * @file contextos-pedido.js
 * Panel del personal: caché de los contextos de pedido de Soporte (GET /api/soporte/pedidos/{id}).
 * Los DTO de reclamo y de devolución no traen el nombre del cliente; sale de aquí, del contexto del
 * pedido. La usan las bandejas (lista y detalle) y el Inicio de Soporte, así que ambos muestran el
 * mismo nombre y cada pedido se pide una sola vez.
 */

import { consultarContextoPedido } from "../../atencion/atencion.js";

/** @param {Function} apiRequest */
export function crearContextosPedido(apiRequest) {
  /** pedidoId → contexto (o null si la petición falló). */
  const contextos = new Map();
  /** pedidoId → nombre del cliente. */
  const nombres = new Map();
  const enCurso = new Map();

  /** Contexto de un pedido; un fallo devuelve null y no se guarda (se reintenta la próxima vez). */
  function cargarUno(pedidoId) {
    if (contextos.has(pedidoId)) return Promise.resolve(contextos.get(pedidoId));
    if (!enCurso.has(pedidoId)) {
      enCurso.set(pedidoId, consultarContextoPedido(apiRequest, pedidoId)
        .then((contexto) => {
          contextos.set(pedidoId, contexto);
          if (contexto?.pedido?.clienteNombre) nombres.set(pedidoId, contexto.pedido.clienteNombre);
          return contexto;
        })
        .catch(() => null)
        .finally(() => enCurso.delete(pedidoId)));
    }
    return enCurso.get(pedidoId);
  }

  /** Pide los contextos que aún no se conocen (sin repetir pedidos). */
  async function cargar(pedidoIds) {
    await Promise.all([...new Set(pedidoIds)].map(cargarUno));
  }

  return { contextos, nombres, cargarUno, cargar };
}
