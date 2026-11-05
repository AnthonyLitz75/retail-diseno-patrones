export async function listarCuentas(apiRequest) {
  return (await apiRequest("/api/admin/usuarios")).json();
}

export async function registrarPersonal(apiRequest, datos) {
  return apiRequest("/api/admin/usuarios", { method: "POST", json: datos });
}

export async function cambiarRol(apiRequest, id, rol) {
  return apiRequest(`/api/admin/usuarios/${id}/rol`, {
    method: "PATCH",
    json: { rol },
  });
}

export async function desactivarCuenta(apiRequest, id) {
  return apiRequest(`/api/admin/usuarios/${id}/desactivar`, { method: "PUT" });
}

export async function listarCategoriasAdmin(apiRequest) {
  return (await apiRequest("/api/admin/categorias")).json();
}

export async function crearCategoria(apiRequest, nombre) {
  return apiRequest("/api/admin/categorias", {
    method: "POST",
    json: { nombre },
  });
}

export async function actualizarCategoria(apiRequest, id, nombre) {
  return apiRequest(`/api/admin/categorias/${id}`, {
    method: "PUT",
    json: { nombre },
  });
}

export async function cambiarEstadoCategoria(apiRequest, id, activa) {
  return apiRequest(`/api/admin/categorias/${id}/estado`, {
    method: "PATCH",
    json: { activa },
  });
}

export function crearParametrosReporte(desde, hasta) {
  if (desde && hasta && desde > hasta) {
    throw new TypeError(
      "La fecha inicial no puede ser posterior a la fecha final.",
    );
  }
  const parametros = new URLSearchParams();
  if (desde) parametros.set("desde", `${desde}T00:00:00-05:00`);
  if (hasta) parametros.set("hasta", `${hasta}T23:59:59.999-05:00`);
  return parametros.toString();
}

export async function cargarResumenAdmin(apiRequest, consulta) {
  return (
    await apiRequest(
      `/api/admin/reportes/resumen${consulta ? `?${consulta}` : ""}`,
    )
  ).json();
}

export function solicitarCsvVentas(apiRequest, consulta) {
  return apiRequest(
    `/api/admin/reportes/ventas.csv${consulta ? `?${consulta}` : ""}`,
  );
}
