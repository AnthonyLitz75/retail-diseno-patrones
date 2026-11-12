package com.grupo.retail.integracion;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Módulo de auditoría con PostgreSQL y HTTP reales: qué se registra, con qué actor, y cómo
 * lo consulta el administrador (guía §2, "consultar auditoría").
 */
class AuditoriaTest extends BaseCompraIntegracion {

    @Test
    @DisplayName("Los inicios de sesión fallidos y correctos quedan registrados con el correo")
    void iniciosDeSesion() {
        DatosIntegracion.Cliente cliente = datos.crearCliente();

        ClienteHttp.Respuesta fallido = new ClienteHttp(puerto).intentarIniciarSesion(cliente.correo(), "ClaveEquivocada1");
        sesionDe(cliente);

        assertEquals(401, fallido.estado(), fallido.toString());
        assertEquals(1, datos.auditoriasDe("INICIO_SESION_FALLIDO", cliente.correo()));
        assertEquals(1, datos.auditoriasDe("INICIO_SESION", cliente.correo()));
    }

    @Test
    @DisplayName("El cambio de rol guarda quién lo hizo y el rol anterior y el nuevo")
    void cambioDeRol() {
        DatosIntegracion.Cliente admin = datos.crearEmpleado("ADMIN");
        DatosIntegracion.Cliente empleado = datos.crearEmpleado("VENDEDOR");

        ClienteHttp.Respuesta cambio = sesionDe(admin)
                .patchJson("/api/admin/usuarios/" + empleado.id() + "/rol", "{\"rol\":\"ALMACEN\"}");

        assertEquals(200, cambio.estado(), cambio.toString());
        assertEquals(admin.correo(), datos.actorAuditoria("ROL_CAMBIADO", "USUARIO", empleado.id()));
        assertEquals(empleado.correo() + ": VENDEDOR → ALMACEN",
                datos.detalleAuditoria("ROL_CAMBIADO", "USUARIO", empleado.id()));
    }

    @Test
    @DisplayName("La compra y la cancelación del pedido quedan con el cliente como actor")
    void pedido() {
        Compra compra = comprar(new BigDecimal("20.00"), 5, 1);

        ClienteHttp.Respuesta cancelacion = sesionDe(compra.cliente()).put("/api/pedidos/" + compra.pedido() + "/cancelar");

        assertEquals(204, cancelacion.estado(), cancelacion.toString());
        String detalle = datos.detalleAuditoria("PEDIDO_ESTADO", "PEDIDO", compra.pedido());
        assertTrue(detalle.startsWith("Pedido #" + compra.pedido() + ": PENDIENTE → CANCELADO"), detalle);
        assertEquals(compra.cliente().correo(), datos.actorAuditoria("PEDIDO_ESTADO", "PEDIDO", compra.pedido()));
    }

    @Test
    @DisplayName("El administrador filtra por acción y usuario, pagina y descarga el CSV")
    void consultaDelAdministrador() {
        DatosIntegracion.Cliente admin = datos.crearEmpleado("ADMIN");
        DatosIntegracion.Cliente empleado = datos.crearEmpleado("SOPORTE");
        ClienteHttp sesion = sesionDe(admin);
        sesion.patchJson("/api/admin/usuarios/" + empleado.id() + "/rol", "{\"rol\":\"VENDEDOR\"}");
        sesion.patchJson("/api/admin/usuarios/" + empleado.id() + "/rol", "{\"rol\":\"ALMACEN\"}");

        ClienteHttp.Respuesta pagina = sesion.get(
                "/api/admin/auditoria?accion=ROL_CAMBIADO&usuario=" + admin.correo() + "&tamano=1&pagina=2");
        ClienteHttp.Respuesta csv = sesion.get("/api/admin/auditoria/exportar.csv?accion=ROL_CAMBIADO&usuario=" + admin.correo());

        assertEquals(200, pagina.estado(), pagina.toString());
        assertEquals(2, pagina.campoNumerico("total"));
        assertEquals(2, pagina.campoNumerico("pagina"));
        // Orden del más reciente al más antiguo: la página 2 de tamaño 1 es el primer cambio.
        assertTrue(pagina.cuerpo().contains("SOPORTE → VENDEDOR"), pagina.cuerpo());
        assertTrue(pagina.cuerpo().contains("\"accionEtiqueta\":\"Rol cambiado\""), pagina.cuerpo());
        assertEquals(200, csv.estado(), csv.toString());
        assertTrue(csv.cuerpo().contains("fecha,usuario,correo,rol,accion,entidad,entidad_id,detalle\r\n"), csv.cuerpo());
        assertTrue(csv.cuerpo().contains("SOPORTE → VENDEDOR"), csv.cuerpo());
        assertEquals(1, datos.auditoriasDe("REPORTE_DESCARGADO", admin.correo()), "la descarga también se audita");
    }

    @Test
    @DisplayName("Filtros inválidos responden 400 y la auditoría es solo para ADMIN")
    void validacionYAcceso() {
        ClienteHttp admin = sesionDe(datos.crearEmpleado("ADMIN"));
        ClienteHttp vendedor = sesionDe(datos.crearEmpleado("VENDEDOR"));

        assertEquals(400, admin.get("/api/admin/auditoria?accion=INVENTADA").estado());
        assertEquals(400, admin.get("/api/admin/auditoria?tamano=500").estado());
        assertEquals(400, admin.get("/api/admin/auditoria?desde=2026-02-10&hasta=2026-01-01").estado());
        assertEquals(403, vendedor.get("/api/admin/auditoria").estado());
    }
}
