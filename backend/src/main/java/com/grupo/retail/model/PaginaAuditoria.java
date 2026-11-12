package com.grupo.retail.model;

import java.util.List;

/** Una página del registro de auditoría con el total de filas que cumplen los filtros. */
public record PaginaAuditoria(List<RegistroAuditoria> items, long total, int pagina, int tamano) {

    public int totalPaginas() {
        return total == 0 ? 0 : (int) ((total + tamano - 1) / tamano);
    }
}
