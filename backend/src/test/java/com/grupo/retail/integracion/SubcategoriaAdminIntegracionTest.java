package com.grupo.retail.integracion;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Integración HTTP + PostgreSQL para creación/edición jerárquica de categorías y subcategorías
 * (patrón Composite en el panel de administración y reflejo en /api/categorias/arbol).
 */
class SubcategoriaAdminIntegracionTest extends BaseCompraIntegracion {

    @Test
    @DisplayName("Administrador crea subcategorías, valida invariantes Composite y las refleja en el árbol público")
    void flujoCompletoSubcategorias() {
        String sufijo = UUID.randomUUID().toString().substring(0, 6);
        String nombreRaiz = "Raiz-" + sufijo;
        String nombreHija = "Sub-" + sufijo;
        ClienteHttp admin = sesionDe(datos.crearEmpleado("ADMIN"));

        ClienteHttp.Respuesta resRaiz = admin.postJson("/api/admin/categorias",
                "{\"nombre\":\"" + nombreRaiz + "\"}");
        assertEquals(201, resRaiz.estado(), resRaiz.toString());
        long raizId = resRaiz.campoNumerico("idCategoria");

        ClienteHttp.Respuesta resHija = admin.postJson("/api/admin/categorias",
                "{\"nombre\":\"" + nombreHija + "\",\"categoriaPadreId\":" + raizId + "}");
        assertEquals(201, resHija.estado(), resHija.toString());
        long hijaId = resHija.campoNumerico("idCategoria");
        assertTrue(resHija.cuerpo().contains("\"categoriaPadreId\":" + raizId), resHija.cuerpo());

        assertEquals(404, admin.postJson("/api/admin/categorias",
                "{\"nombre\":\"Huerfana-" + sufijo + "\",\"categoriaPadreId\":999999}").estado());
        assertEquals(400, admin.postJson("/api/admin/categorias",
                "{\"nombre\":\"TercerNivel-" + sufijo + "\",\"categoriaPadreId\":" + hijaId + "}").estado());
        assertEquals(400, admin.putJson("/api/admin/categorias/" + hijaId,
                "{\"nombre\":\"" + nombreHija + "\",\"categoriaPadreId\":" + hijaId + "}").estado());
        assertEquals(400, admin.putJson("/api/admin/categorias/" + raizId,
                "{\"nombre\":\"" + nombreRaiz + "\",\"categoriaPadreId\":" + hijaId + "}").estado());

        ClienteHttp.Respuesta prod = admin.postJson("/api/productos",
                "{\"nombre\":\"Producto " + sufijo + "\",\"categoria\":\"" + nombreHija
                        + "\",\"precio\":99.00,\"stock\":5}");
        assertEquals(201, prod.estado(), prod.toString());

        String listadoAdmin = admin.get("/api/admin/categorias").cuerpo();
        assertTrue(listadoAdmin.contains("\"nombre\":\"" + nombreHija + "\",\"activa\":true,\"categoriaPadreId\":"
                + raizId + ",\"totalProductos\":1"), listadoAdmin);

        String arbol = new ClienteHttp(puerto).get("/api/categorias/arbol").cuerpo();
        assertTrue(arbol.contains("\"nombre\":\"" + nombreRaiz + "\""), arbol);
        assertTrue(arbol.contains("\"nombre\":\"" + nombreHija + "\""), arbol);

        ClienteHttp.Respuesta movida = admin.putJson("/api/admin/categorias/" + hijaId,
                "{\"nombre\":\"" + nombreHija + "\",\"categoriaPadreId\":null}");
        assertEquals(200, movida.estado(), movida.toString());
        assertTrue(movida.cuerpo().contains("\"categoriaPadreId\":null"), movida.cuerpo());
    }
}
