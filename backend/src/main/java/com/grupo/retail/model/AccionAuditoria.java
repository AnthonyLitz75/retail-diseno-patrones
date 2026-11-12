package com.grupo.retail.model;

/**
 * Acciones que quedan en el registro de auditoría. Los nombres coinciden con la
 * restricción CHECK de {@code registro_auditoria.accion} (migración V4).
 */
public enum AccionAuditoria {
    INICIO_SESION("Inicio de sesión"),
    INICIO_SESION_FALLIDO("Inicio de sesión fallido"),
    INICIO_SESION_BLOQUEADO("Inicio de sesión bloqueado"),
    CUENTA_CREADA("Cuenta creada"),
    ROL_CAMBIADO("Rol cambiado"),
    CUENTA_DESACTIVADA("Cuenta desactivada"),
    PRODUCTO_CREADO("Producto creado"),
    PRODUCTO_EDITADO("Ficha de producto editada"),
    PRECIO_CAMBIADO("Precio cambiado"),
    STOCK_AJUSTADO("Stock ajustado"),
    PRODUCTO_ACTIVADO("Producto activado"),
    PRODUCTO_DESACTIVADO("Producto desactivado"),
    CATEGORIA_CREADA("Categoría creada"),
    CATEGORIA_RENOMBRADA("Categoría renombrada"),
    CATEGORIA_ACTIVADA("Categoría activada"),
    CATEGORIA_DESACTIVADA("Categoría desactivada"),
    REPORTE_DESCARGADO("Reporte descargado"),
    PEDIDO_ESTADO("Cambio de estado (pedido, reclamo o devolución)");

    private final String etiqueta;

    AccionAuditoria(String etiqueta) {
        this.etiqueta = etiqueta;
    }

    /** Texto para mostrar en la interfaz y en el CSV. */
    public String etiqueta() {
        return etiqueta;
    }
}
