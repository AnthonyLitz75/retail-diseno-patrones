export async function listarPreguntasPendientes(apiRequest) {
  const respuesta = await apiRequest('/api/vendedor/preguntas')
  return respuesta.json()
}

export async function enviarRespuestaPregunta(apiRequest, idConsulta, respuesta) {
  if (!Number.isSafeInteger(Number(idConsulta)) || Number(idConsulta) <= 0) {
    throw new TypeError('El identificador de la pregunta no es válido.')
  }
  const texto = String(respuesta ?? '').trim()
  if (!texto) throw new TypeError('Escribe una respuesta antes de enviarla.')
  if (texto.length > 1000) throw new TypeError('La respuesta no puede superar 1000 caracteres.')
  return apiRequest(`/api/vendedor/preguntas/${Number(idConsulta)}/responder`, {
    method: 'POST',
    json: { respuesta: texto }
  })
}
