import test from 'node:test'
import assert from 'node:assert/strict'
import { enviarRespuestaPregunta, listarPreguntasPendientes } from '../../src/vendedor/vendedor.js'

test('consulta la bandeja de preguntas pendientes del vendedor', async () => {
  let ruta
  const preguntas = [{ idConsulta: 7, pregunta: '¿Tiene garantía?' }]
  const resultado = await listarPreguntasPendientes(async (url) => {
    ruta = url
    return { json: async () => preguntas }
  })
  assert.equal(ruta, '/api/vendedor/preguntas')
  assert.deepEqual(resultado, preguntas)
})

test('envía respuesta limpia al endpoint de la consulta', async () => {
  let solicitud
  await enviarRespuestaPregunta(async (url, opciones) => {
    solicitud = { url, opciones }
    return { status: 204 }
  }, 7, '  Sí, tiene garantía.  ')
  assert.equal(solicitud.url, '/api/vendedor/preguntas/7/responder')
  assert.equal(solicitud.opciones.method, 'POST')
  assert.deepEqual(solicitud.opciones.json, { respuesta: 'Sí, tiene garantía.' })
})

test('no envía respuestas vacías, demasiado largas o con id inválido', async () => {
  let llamadas = 0
  const request = async () => { llamadas += 1 }
  await assert.rejects(enviarRespuestaPregunta(request, 1, '  '), /Escribe una respuesta/)
  await assert.rejects(enviarRespuestaPregunta(request, 1, 'x'.repeat(1001)), /1000 caracteres/)
  await assert.rejects(enviarRespuestaPregunta(request, 0, 'respuesta'), /identificador/)
  assert.equal(llamadas, 0)
})
