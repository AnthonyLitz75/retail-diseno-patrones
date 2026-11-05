package com.grupo.retail;

import com.grupo.retail.dao.PedidoDAO;
import com.grupo.retail.dto.SolicitudConfirmarPedido;
import com.grupo.retail.facade.CheckoutFacade;
import com.grupo.retail.model.DetallePedido;
import com.grupo.retail.model.PedidoConfirmado;
import com.grupo.retail.patterns.pago.PuertoPago;
import com.grupo.retail.model.ResultadoPago;
import com.grupo.retail.patterns.singleton.ProveedorConexiones;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class PedidoConfirmacionTests {

    private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();

    @Test
    void solicitudConfirmarPedidoValidaUUIDYLongitudes() {
        String uuidValido = UUID.randomUUID().toString();
        var valida = new SolicitudConfirmarPedido(
                "PRUEBA_APROBADA", uuidValido, "Juan Pérez", "Av. Javier Prado 1234");
        assertTrue(validator.validate(valida).isEmpty());

        // Clave vacía o nula es permitida para retrocompatibilidad
        var sinClave = new SolicitudConfirmarPedido("PRUEBA_APROBADA", null, null, null);
        assertTrue(validator.validate(sinClave).isEmpty());

        // UUID inválido
        var uuidInvalido = new SolicitudConfirmarPedido("PRUEBA_APROBADA", "invalido-123", null, null);
        assertFalse(validator.validate(uuidInvalido).isEmpty());

        // Destinatario superior a 120 caracteres
        var destinatarioLargo = new SolicitudConfirmarPedido(
                "PRUEBA_APROBADA", uuidValido, "A".repeat(121), "Dirección válida");
        assertFalse(validator.validate(destinatarioLargo).isEmpty());

        // Dirección superior a 250 caracteres
        var direccionLarga = new SolicitudConfirmarPedido(
                "PRUEBA_APROBADA", uuidValido, "Juan Pérez", "D".repeat(251));
        assertFalse(validator.validate(direccionLarga).isEmpty());

        // Método de pago no soportado
        var metodoInvalido = new SolicitudConfirmarPedido("OTRO_METODO", uuidValido, null, null);
        assertFalse(validator.validate(metodoInvalido).isEmpty());
    }

    @Test
    void checkoutFacadePropagaDatosDeIdempotenciaYDestino() {
        PedidoDAO dao = mock(PedidoDAO.class);
        PuertoPago puerto = mock(PuertoPago.class);
        CheckoutFacade facade = new CheckoutFacade(dao, puerto);

        String clave = UUID.randomUUID().toString();
        var pedidoEsperado = new PedidoConfirmado(
                10L, "PENDIENTE", BigDecimal.valueOf(100), OffsetDateTime.now(),
                "SIMULADO", "APROBADO", "REF-123", List.of(), clave, "Juan", "Av. Perú 123");

        when(dao.confirmarCompra(eq(5L), any(), eq(clave), eq("Juan"), eq("Av. Perú 123")))
                .thenReturn(pedidoEsperado);

        PedidoConfirmado resultado = facade.confirmarCompra(
                5L, "PRUEBA_APROBADA", clave, "Juan", "Av. Perú 123");

        assertSame(pedidoEsperado, resultado);
        assertEquals(clave, resultado.claveConfirmacion());
        assertEquals("Juan", resultado.destinatario());
        assertEquals("Av. Perú 123", resultado.direccionEnvio());
    }

    @Test
    void confirmarCompraRetornaPedidoExistenteCuandoClaveYaFueRegistrada() throws Exception {
        ProveedorConexiones proveedor = mock(ProveedorConexiones.class);
        Connection conexion = mock(Connection.class);
        when(proveedor.obtenerConexion()).thenReturn(conexion);

        PreparedStatement psBuscar = mock(PreparedStatement.class);
        ResultSet rsBuscar = mock(ResultSet.class);
        when(conexion.prepareStatement(contains("WHERE p.usuario_id = ? AND p.clave_confirmacion = ?")))
                .thenReturn(psBuscar);
        when(psBuscar.executeQuery()).thenReturn(rsBuscar);

        String clave = UUID.randomUUID().toString();
        when(rsBuscar.next()).thenReturn(true);
        when(rsBuscar.getLong("id_pedido")).thenReturn(99L);
        when(rsBuscar.getString("estado")).thenReturn("PENDIENTE");
        when(rsBuscar.getBigDecimal("total")).thenReturn(BigDecimal.valueOf(150.00));
        when(rsBuscar.getObject(eq("creado_en"), eq(OffsetDateTime.class)))
                .thenReturn(OffsetDateTime.now());
        when(rsBuscar.getString("metodo")).thenReturn("SIMULADO");
        when(rsBuscar.getString("estado_pago")).thenReturn("APROBADO");
        when(rsBuscar.getString("referencia")).thenReturn("REF-99");
        when(rsBuscar.getString("destinatario")).thenReturn("María López");
        when(rsBuscar.getString("direccion_envio")).thenReturn("Jr. Ucayali 456");

        PreparedStatement psDetalles = mock(PreparedStatement.class);
        ResultSet rsDetalles = mock(ResultSet.class);
        when(conexion.prepareStatement(contains("FROM pedido_detalle"))).thenReturn(psDetalles);
        when(psDetalles.executeQuery()).thenReturn(rsDetalles);
        when(rsDetalles.next()).thenReturn(false);

        PedidoDAO dao = new PedidoDAO(proveedor, mock(com.grupo.retail.patterns.factory.FabricaNotificador.class));
        PedidoConfirmado confirmado = dao.confirmarCompra(
                7L, total -> new ResultadoPago(true, "SIMULADO", "APROBADO", "REF-NUEVA", "OK"),
                clave, "María López", "Jr. Ucayali 456");

        assertNotNull(confirmado);
        assertEquals(99L, confirmado.idPedido());
        assertEquals("REF-99", confirmado.referenciaPago());
        assertEquals("María López", confirmado.destinatario());
        assertEquals("Jr. Ucayali 456", confirmado.direccionEnvio());
        verify(conexion).commit();
        // No debe tocar el carrito ni insertar en la base de datos
        verify(conexion, never()).prepareStatement(contains("FROM carrito"));
        verify(conexion, never()).prepareStatement(contains("INSERT INTO pedido "));
    }
}
