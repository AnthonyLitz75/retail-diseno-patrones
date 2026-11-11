package com.grupo.retail.integracion;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Spec 007, T006 (US6, US7; RF05, RF06, SC-002) con PostgreSQL y HTTP reales. Cada prueba
 * fecha sus datos en un año propio (2001, 2002) para no mezclarse con los pedidos que crean
 * las demás clases en el mismo contenedor.
 */
class ReportesTest extends BaseCompraIntegracion {

    private static final String BOM = String.valueOf((char) 0xFEFF);

    private ClienteHttp admin() {
        return sesionDe(datos.crearEmpleado("ADMIN"));
    }

    /** Filas de datos del CSV (sin BOM ni cabecera). */
    private static List<String> filas(ClienteHttp.Respuesta csv, String cabecera) {
        assertEquals(200, csv.estado(), csv.toString());
        assertTrue(csv.cuerpo().startsWith(BOM + cabecera + "\r\n"), csv.cuerpo());
        String cuerpo = csv.cuerpo().substring(BOM.length() + cabecera.length() + 2);
        return cuerpo.isEmpty() ? List.of() : Arrays.asList(cuerpo.split("\r\n"));
    }

    @Test
    @DisplayName("SC-002: las ventas del CSV suman lo mismo que el panel; rango inclusivo y sin cancelados")
    void ventasCuadranConElPanel() {
        Compra inicioDelRango = comprar(new BigDecimal("10.00"), 10, 2);
        Compra finDelRango = comprar(new BigDecimal("15.50"), 10, 1);
        Compra cancelado = comprar(new BigDecimal("99.00"), 10, 1);
        Compra fueraDelRango = comprar(new BigDecimal("7.00"), 10, 1);
        datos.fecharPedido(inicioDelRango.pedido(), "2001-03-01T00:00:00-05:00");
        datos.fecharPedido(finDelRango.pedido(), "2001-03-31T23:59:00-05:00");
        datos.forzarEstadoPedido(finDelRango.pedido(), "ENTREGADO");
        datos.fecharPedido(cancelado.pedido(), "2001-03-15T12:00:00-05:00");
        datos.forzarEstadoPedido(cancelado.pedido(), "CANCELADO");
        datos.fecharPedido(fueraDelRango.pedido(), "2001-04-01T00:00:00-05:00");
        ClienteHttp admin = admin();
        String rango = "?desde=2001-03-01&hasta=2001-03-31";

        List<String> ventas = filas(admin.get("/api/admin/reportes/ventas.csv" + rango),
                "pedido_id,fecha,cliente,estado,total");
        ClienteHttp.Respuesta resumen = admin.get("/api/admin/reportes/resumen" + rango);

        assertEquals(2, ventas.size(), ventas.toString());
        assertTrue(ventas.get(0).startsWith(inicioDelRango.pedido() + ","), ventas.toString());
        assertTrue(ventas.get(1).startsWith(finDelRango.pedido() + ","), ventas.toString());
        BigDecimal sumaCsv = ventas.stream()
                .map(f -> new BigDecimal(f.substring(f.lastIndexOf(',') + 1)))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        assertEquals(new BigDecimal("35.50"), sumaCsv);
        assertEquals(200, resumen.estado(), resumen.toString());
        assertTrue(resumen.cuerpo().contains("\"ventasNetas\":35.50"), resumen.cuerpo());
        assertEquals(2, resumen.campoNumerico("pedidosVendidos"));
        assertTrue(resumen.cuerpo().contains("\"CANCELADO\":1"), resumen.cuerpo());
        assertTrue(resumen.cuerpo().contains("\"PENDIENTE\":1"), resumen.cuerpo());
        assertTrue(resumen.cuerpo().contains("\"ENTREGADO\":1"), resumen.cuerpo());
    }

    @Test
    @DisplayName("US7: movimientos e inventario en CSV, con fórmulas neutralizadas y comillas escapadas")
    void movimientosEInventario() {
        Compra compra = comprar(new BigDecimal("12.00"), 5, 2);
        String sku = datos.skuDe(compra.producto());
        datos.fecharMovimientos(compra.producto(), "2002-06-10T10:00:00-05:00");
        datos.ejecutar("UPDATE producto SET nombre = ?, categoria = 'Mouse' WHERE id = ?",
                "=SUMA(A1), \"x\"", compra.producto());
        ClienteHttp admin = admin();

        List<String> movimientos = filas(
                admin.get("/api/admin/reportes/movimientos.csv?desde=2002-06-10&hasta=2002-06-10"),
                "fecha,sku,tipo,cantidad,motivo,responsable");
        List<String> inventario = filas(admin.get("/api/admin/reportes/inventario.csv"),
                "sku,nombre,categoria,stock,activo");
        ClienteHttp.Respuesta resumen = admin.get("/api/admin/reportes/resumen?desde=2002-06-10&hasta=2002-06-10");

        assertEquals(1, movimientos.size(), movimientos.toString());
        assertTrue(movimientos.get(0).contains(",\"" + sku + "\",\"SALIDA\",-2,"), movimientos.get(0));
        assertTrue(inventario.contains("\"" + sku + "\",\"'=SUMA(A1), \"\"x\"\"\",\"Mouse\",3,true"),
                "El nombre peligroso se neutraliza y sus comillas se duplican");
        assertTrue(resumen.cuerpo().contains("\"ultimosMovimientos\":[{"), resumen.cuerpo());
        assertTrue(resumen.cuerpo().contains("\"sku\":\"" + sku + "\""), resumen.cuerpo());
    }

    @Test
    @DisplayName("US6: el panel cuenta los reclamos escalados abiertos")
    void escaladosEnElPanel() {
        Compra compra = comprar(new BigDecimal("5.00"), 5, 1);
        datos.ejecutar("INSERT INTO reclamo (pedido_id, cliente_id, motivo, descripcion, estado) "
                + "VALUES (?, ?, 'Escalado de prueba', 'x', 'ESCALADO')", compra.pedido(), compra.cliente().id());

        ClienteHttp.Respuesta resumen = admin().get("/api/admin/reportes/resumen");

        assertEquals(200, resumen.estado(), resumen.toString());
        assertTrue(resumen.campoNumerico("escalados") >= 1, resumen.cuerpo());
    }

    @Test
    @DisplayName("Fechas: rango invertido o formato inválido 400; también se aceptan fechas ISO con zona")
    void validacionDeFechas() {
        ClienteHttp admin = admin();
        for (String ruta : List.of("resumen", "ventas.csv", "movimientos.csv")) {
            String base = "/api/admin/reportes/" + ruta;
            assertEquals(400, admin.get(base + "?desde=2001-03-02&hasta=2001-03-01").estado(), ruta);
            assertEquals(400, admin.get(base + "?desde=ayer").estado(), ruta);
            assertEquals(200, admin.get(base + "?desde=2001-03-01T00:00:00-05:00").estado(), ruta);
        }
    }
}
