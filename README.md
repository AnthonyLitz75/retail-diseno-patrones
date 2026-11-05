# Píxel Andino — Tecnología que conecta contigo

Tienda tecnológica desarrollada como proyecto académico con Java, Spring Boot, JDBC, PostgreSQL y una interfaz web con HTML, CSS, JavaScript y Bootstrap.

**Píxel Andino: tecnología que conecta contigo.**

## Funcionalidades

- Catálogo con búsqueda y filtros por categoría y rango de precio.
- Registro e inicio de sesión de clientes.
- Carrito persistido en PostgreSQL y checkout con pago simulado.
- Historial de pedidos y cambios de estado.
- Operaciones de vendedor y almacén para productos, inventario y pedidos.

## Tecnologías

- Java 25 y Spring Boot 4.1.1.
- PostgreSQL y JDBC.
- HTML, CSS, JavaScript, Bootstrap 5.3.8 y Vite 8.3.3.

## Patrones implementados

- **State:** estados y transiciones de pedidos en `backend/src/main/java/com/grupo/retail/patterns/state`.
- **Adapter:** integración del proveedor de pago simulado en `backend/src/main/java/com/grupo/retail/patterns/pago`.
- **Facade:** coordinación del checkout en `backend/src/main/java/com/grupo/retail/facade/CheckoutFacade.java`.

## Requisitos

- JDK 25.
- Node.js y npm.
- PostgreSQL.

La aplicación espera la base de datos `retail_diseno_patrones` en `localhost:5432`. Configura `DB_USER` y `DB_PASSWORD` en el entorno antes de iniciar el backend. No guardes contraseñas reales en este repositorio.

En PowerShell, para la sesión actual:

```powershell
$env:DB_USER = "postgres"
$env:DB_PASSWORD = "<tu-contrasena-local>"
```

## Preparar la base de datos

1. Crea la base `retail_diseno_patrones` en PostgreSQL.
2. En una base nueva, ejecuta `database/00_esquema_base.sql`. Para una base existente, conserva el flujo de actualización y ejecuta `database/01_tablas_y_reglas.sql`.
3. Ejecuta `database/02_datos_prueba.sql` para cargar las cuentas de los cinco roles, productos y el carrito inicial del cliente.
4. `database/03_usuarios_prueba_empleados.sql` queda como consulta de verificación de vendedor y almacén; ya no crea ni modifica cuentas.
5. Si estás actualizando una base que todavía no admite cancelaciones, ejecuta también `database/04_cancelacion_pedido.sql` antes de usar esa función.

Cuentas temporales de demostración (todas usan la misma clave `PixelAndino2026!`):

| Rol | Correo | Observación |
| --- | --- | --- |
| CLIENTE | `registro.web@example.com` | Incluye un carrito con Mouse inalámbrico. |
| ADMIN | `admin.prueba@example.com` | Administración según las funciones implementadas. |
| VENDEDOR | `vendedor.prueba@example.com` | Operaciones de catálogo disponibles. |
| ALMACEN | `almacen.prueba@example.com` | Operaciones de inventario y pedidos disponibles. |
| SOPORTE | `soporte.prueba@example.com` | La cuenta está sembrada; sus funciones aún no están implementadas. |

El script guarda las claves como hash BCrypt, es repetible para estas cuentas y productos de prueba, y nunca consulta ni imprime los hashes. Usa una base local de desarrollo; no ejecutes semillas de prueba sobre datos reales.
## Ejecutar el backend

Desde `backend/`, con PostgreSQL activo y las variables de entorno configuradas:

```powershell
.\mvnw.cmd spring-boot:run
```

El backend escucha en `http://localhost:8081`.

## Ejecutar el frontend

En otra terminal, desde `frontend/`:

```powershell
npm install
npm run dev
```

Abre la dirección local que indique Vite. El proxy de desarrollo reenvía `/api` al backend.

## Validaciones

Backend, desde `backend/`:

```powershell
.\mvnw.cmd clean test
```

Frontend, desde `frontend/`:

```powershell
npm run build
```