# PLAN TÉCNICO: Patrón Command en Operaciones de Carrito

## 1. Arquitectura y Estructura de Clases

Paquete objetivo: `com.grupo.retail.patterns.command`

```text
┌──────────────────────────────────────────┐
│             <<interface>>                │
│            ComandoCarrito                │
├──────────────────────────────────────────┤
│ + ejecutar(CarritoDAO, Connection): void │
│ + deshacer(CarritoDAO, Connection): void │
│ + obtenerRevisionEsperada(): long        │
└──────────────────────────────────────────┘
                     ▲
     ┌───────────────┼───────────────┐
     │                               │
┌──────────────────────────┐   ┌──────────────────────────┐
│   AgregarProductoComando │   │ ModificarCantidadComando │
└──────────────────────────┘   └──────────────────────────┘
                             │
               ┌──────────────────────────┐
               │  EliminarProductoComando │
               └──────────────────────────┘
```

### Gestor de Historial por Sesión: `HistorialComandosCarrito`
- Mantenido en la sesión `HttpSession` bajo el atributo `HISTORIAL_CARRITO`.
- Capacidad máxima: 20 comandos (*bounded deque*).
- Método `deshacerUltimo(CarritoDAO dao, Connection con, long revisionActual)`.

---

## 2. Contratos de API REST

### Deshacer Última Operación del Carrito
- **Ruta:** `POST /api/carrito/deshacer`
- **Permiso:** `CLIENTE`
- **Respuesta (200 OK):** Estado actualizado del carrito tras la reversión.
- **Respuesta (409 Conflict):** Carrito modificado en paralelo (revisión desfasada).
- **Respuesta (400 Bad Request):** Historial vacío.
