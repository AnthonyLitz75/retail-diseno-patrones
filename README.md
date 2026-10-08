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
2. Abre esa base en pgAdmin y ejecuta, en este orden:
   - `database/01_tablas_y_reglas.sql`
   - Registra desde la interfaz un cliente con el correo `registro.web@example.com` si quieres que los datos de prueba creen también su carrito.
   - `database/02_datos_prueba.sql`
   - `database/03_usuarios_prueba_empleados.sql` para crear las cuentas de prueba de vendedor y almacén.

Los scripts de datos son idempotentes para los registros de prueba documentados. Usa una base de desarrollo o temporal para probarlos.

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