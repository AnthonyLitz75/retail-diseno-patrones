package com.grupo.retail.patterns.pago;

import com.grupo.retail.model.ResultadoPago;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

/** Adapter: traduce el proveedor simulado al contrato {@link PuertoPago} del dominio. */
@Component
public class PagoPruebaAdapter implements PuertoPago {

    private final ProveedorPagoSimulado proveedor;

    public PagoPruebaAdapter(ProveedorPagoSimulado proveedor) {
        this.proveedor = proveedor;
    }

    @Override
    public ResultadoPago procesar(BigDecimal monto, String escenario) {
        return traducir(proveedor.cobrar(monto, escenario), "APROBADO");
    }

    @Override
    public ResultadoPago reembolsar(BigDecimal monto, String referenciaCobro, String escenario) {
        return traducir(proveedor.devolver(monto, referenciaCobro, escenario), "REEMBOLSADO");
    }

    private static ResultadoPago traducir(RespuestaProveedorPago respuesta, String estadoAceptado) {
        return new ResultadoPago(
                respuesta.aceptado(),
                "SIMULADO",
                respuesta.aceptado() ? estadoAceptado : "RECHAZADO",
                respuesta.referencia(),
                respuesta.descripcion());
    }
}
