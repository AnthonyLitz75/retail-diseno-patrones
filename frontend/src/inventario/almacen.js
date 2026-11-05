export function crearSolicitudEntrada(productoId, cantidad, motivo) {
  return {
    motivo: motivo.trim(),
    productos: [
      {
        productoId: Number(productoId),
        cantidad: Number(cantidad),
      },
    ],
  };
}

export function crearParametrosMovimientos({ productoId, desde, hasta }) {
  const parametros = new URLSearchParams();
  if (productoId) parametros.set("productoId", String(productoId));
  if (desde)
    parametros.set("desde", new Date(`${desde}T00:00:00`).toISOString());
  if (hasta)
    parametros.set("hasta", new Date(`${hasta}T23:59:59.999`).toISOString());
  return parametros;
}
