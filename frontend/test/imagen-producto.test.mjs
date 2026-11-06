import test from "node:test";
import assert from "node:assert/strict";
import {
  resolverImagenProducto,
  IMAGEN_PLACEHOLDER_DEFECTO,
  REGLAS_FALLBACK_IMAGEN,
} from "../src/catalogo/imagen-producto.js";
import { formatoPrecio } from "../src/utilidades/formato.js";

test("formatoPrecio formatea monedas en Soles peruanos con manejo de nulos y números", () => {
  assert.match(formatoPrecio(120), /120/);
  assert.match(formatoPrecio(0), /0/);
  assert.match(formatoPrecio("45.5"), /45/);
  assert.match(formatoPrecio("invalido"), /0/);
});

test("resolverImagenProducto retorna placeholder ante entradas nulas o vacías", () => {
  assert.equal(resolverImagenProducto(null), IMAGEN_PLACEHOLDER_DEFECTO);
  assert.equal(resolverImagenProducto(undefined), IMAGEN_PLACEHOLDER_DEFECTO);
  assert.equal(
    resolverImagenProducto({ nombre: "Invento desconocido 999", categoria: "otro" }),
    IMAGEN_PLACEHOLDER_DEFECTO,
  );
});

test("resolverImagenProducto respeta imagen oficial canónica cuando coincide SKU o nombre", () => {
  const imgSku = resolverImagenProducto({ sku: "PA-0001", nombre: "Teclado Redragon" });
  assert.equal(imgSku, "/img/productos/teclado-redragon-k617.webp");

  const imgNombre = resolverImagenProducto({ nombre: "Mouse gamer G203 Lightsync" });
  assert.equal(imgNombre, "/img/productos/mouse-logitech-g203.webp");
});

test("resolverImagenProducto respeta URL directa absoluta o relativa al directorio /img/", () => {
  const urlHttp = "https://cdn.example.com/foto.jpg";
  assert.equal(resolverImagenProducto({ imagen: urlHttp }), urlHttp);

  const urlRelativa = "/img/productos/custom.png";
  assert.equal(resolverImagenProducto({ imagen: urlRelativa }), urlRelativa);
});

test("resolverImagenProducto resuelve reglas temáticas declarativas por palabras clave y categorías", () => {
  assert.ok(REGLAS_FALLBACK_IMAGEN.length >= 9);

  // Mouse
  const imgMouse = resolverImagenProducto({ nombre: "Ratón genérico inalámbrico" });
  assert.match(imgMouse, /mouse/i);

  // Teclado
  const imgTeclado = resolverImagenProducto({ nombre: "Teclado gamer 60%" });
  assert.match(imgTeclado, /teclado/i);

  // Tarjeta de video
  const imgGpu = resolverImagenProducto({ nombre: "GPU GeForce Dual", categoria: "tarjeta" });
  assert.equal(imgGpu, "/img/productos/gpu-default.svg");

  // Procesador
  const imgCpu = resolverImagenProducto({ nombre: "Microchip Intel Core i7" });
  assert.equal(imgCpu, "/img/productos/cpu-default.svg");

  // RAM
  const imgRam = resolverImagenProducto({ nombre: "Memoria RAM 3200mhz" });
  assert.equal(imgRam, "/img/productos/ram-default.svg");

  // SSD
  const imgSsd = resolverImagenProducto({ nombre: "Disco SSD NVMe 500gb" });
  assert.equal(imgSsd, "/img/productos/ssd-default.svg");

  // Audio
  const imgAudio = resolverImagenProducto({ nombre: "Audífonos gamer con micro", categoria: "audio" });
  assert.equal(imgAudio, "/img/productos/audio-default.svg");
});
