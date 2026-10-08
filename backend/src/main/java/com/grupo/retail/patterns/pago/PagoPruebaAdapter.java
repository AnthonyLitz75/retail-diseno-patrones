package com.grupo.retail.patterns.pago;

import com.grupo.retail.model.ResultadoPago;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

@Component
public class PagoPruebaAdapter implements PuertoPago {

    private final ProveedorPagoSimulado proveedor;

    public PagoPruebaAdapter(ProveedorPagoSimulado proveedor) {
        this.proveedor = proveedor;
    }

    @Override
    public ResultadoPago procesar(BigDecimal monto, String escenario) {
        RespuestaProveedorPago respuesta = proveedor.cobrar(monto, escenario);
        String estado = respuesta.aceptado() ? "APROBADO" : "RECHAZADO";
        return new ResultadoPago(
                respuesta.aceptado(),
                "SIMULADO",
                estado,
                respuesta.referencia(),
                respuesta.descripcion());
    }
}
