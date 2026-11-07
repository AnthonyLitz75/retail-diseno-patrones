import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  MAPA_IMAGENES_POR_SKU,
  resolverRutaImagenOficial,
} from "../src/catalogo/imagenes-productos.js";

describe("imagenes-productos - Mapeo de fotos oficiales", () => {
  it("contiene los 32 productos en el mapa por SKU", () => {
    assert.equal(Object.keys(MAPA_IMAGENES_POR_SKU).length, 32);
    for (let i = 1; i <= 32; i++) {
      const sku = `PA-${String(i).padStart(4, "0")}`;
      assert.ok(MAPA_IMAGENES_POR_SKU[sku], `Falta imagen para ${sku}`);
      assert.ok(MAPA_IMAGENES_POR_SKU[sku].startsWith("/img/productos/"));
    }
  });

  it("resuelve ruta a partir de objeto producto con imagen definida", () => {
    const prod = {
      sku: "PA-0001",
      nombre: "Teclado mecánico 60% RGB Fizz K617",
      imagen: "/img/productos/teclado-redragon-k617.webp",
    };
    assert.equal(
      resolverRutaImagenOficial(prod),
      "/img/productos/teclado-redragon-k617.webp",
    );
  });

  it("resuelve ruta a partir de SKU si imagen no viene en el payload", () => {
    const prod = { sku: "PA-0012", nombre: "C920" };
    assert.equal(
      resolverRutaImagenOficial(prod),
      "/img/productos/webcam-logitech-c920.webp",
    );
  });

  it("resuelve ruta a partir de nombre normalizado", () => {
    assert.equal(
      resolverRutaImagenOficial("Mouse gamer DeathAdder Essential"),
      "/img/productos/mouse-razer-deathadder-essential.webp",
    );
  });

  it("retorna null de forma segura ante entradas nulas o desconocidas", () => {
    assert.equal(resolverRutaImagenOficial(null), null);
    assert.equal(resolverRutaImagenOficial(""), null);
    assert.equal(resolverRutaImagenOficial("Producto inexistente 999"), null);
  });
});
