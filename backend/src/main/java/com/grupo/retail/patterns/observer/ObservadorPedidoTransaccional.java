package com.grupo.retail.patterns.observer;

import java.sql.Connection;
import java.sql.SQLException;

/**
 * Patrón Observer (GoF) - Observador que participa en la transacción del pedido.
 *
 * <p>Recibe la conexión de la transacción en curso: lo que escriba se confirma o se
 * revierte junto con el pedido. Si falla, la transacción completa se revierte.
 * Se separa de {@link ObservadorPedidoPostCommit} por el principio de segregación de
 * interfaces: cada observador implementa solo el momento que le corresponde.</p>
 */
public interface ObservadorPedidoTransaccional {

    void alCambiarEstado(Connection conexion, EventoPedido evento) throws SQLException;
}
