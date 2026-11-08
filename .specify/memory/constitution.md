# Constitución del Proyecto: Píxel Andino Tech Store (Retail E-Commerce)
<!-- Contrato supremo de ingeniería, arquitectura y calidad para Spec-Driven Development (SDD) -->

## Principios Fundamentales

### I. Persistencia Estricta con JDBC Puro (NO ORM)
Toda interacción con la base de datos PostgreSQL debe realizarse mediante JDBC puro a través de `javax.sql.DataSource`.
- **Prohibición Absoluta:** Queda terminantemente prohibido incorporar Hibernate, JPA, Spring Data JPA, MyBatis o cualquier otro ORM.
- **Seguridad en Consultas:** Todas las sentencias SQL deben emplear `PreparedStatement` con parámetros posicionales (`?`) para evitar inyección SQL. Los identificadores dinámicos (columnas de orden o filtros) deben validarse contra una lista blanca fija.
- **Gestión de Recursos:** Toda instancia de `Connection`, `PreparedStatement` y `ResultSet` debe ser cerrada mediante bloques `try-with-resources`.
- **Transaccionalidad Atómica y Bloqueo Pesimista:** Las operaciones críticas (checkout, cancelaciones, kardex, cambios de estado y devoluciones) deben gestionar transacciones manuales explícitas (`setAutoCommit(false)`, `commit()`, `rollback()`) y aplicar bloqueo pesimista ordenado (`SELECT ... FOR UPDATE` ascendente por ID) para prevenir condiciones de carrera y *deadlocks*. Las lecturas simples no deben usar transacciones manuales.

### II. Monolito Modular Desacoplado y Fronteras Claras
La arquitectura del sistema es un monolito modular con estricta separación de responsabilidades:
- **Backend:** Java 25 y Spring Boot 4.1.2 organizado en `com.grupo.retail` (`controller`, `service`, `dao`, `model`, `dto`, `facade`, `patterns.*`, `exception`, `config`).
- **Inyección de Dependencias:** Únicamente inyección por constructor. Prohibido `@Autowired` en atributos privados.
- **Modelos Inmutables:** Las entidades y valores del dominio se modelan como `record` de Java cuando corresponda, separando los modelos públicos de las credenciales internas (`CredencialesUsuario`).
- **Frontend Sin Frameworks Complejos:** HTML5, CSS3, Vanilla JavaScript modular (ES Modules nativos), Vite 8.3.3 y Bootstrap 5.3.8. Prohibido introducir React, Vue, Angular, Svelte o TypeScript sin aprobación explícita.
- **Contratos API Primero (Contract-First):** Ningún endpoint se consume en el frontend sin estar definido y validado en la especificación y en el controlador con DTOs de Bean Validation (`@Valid`, `@NotBlank`, `@Positive`). Rutas REST siempre en español (`/api/...`).

### III. Patrones de Diseño Obligatorios y Justificados (GoF & GRASP)
El proyecto es evaluado bajo el estándar del curso de Diseño de Patrones de Software. Cada patrón debe justificar una necesidad de negocio real y ser verificable mediante pruebas automatizadas:
- **Creacionales:**
  - *Singleton:* `ProveedorConexiones` (gestor del pool DataSource, entrega conexiones prestadas, jamás retiene una conexión compartida).
  - *Factory Method:* `FabricaNotificador` y subclases para emisión desacoplada de notificaciones in-app y consola.
- **Estructurales:**
  - *Facade:* `CheckoutFacade` para orquestar la transacción de compra multi-paso.
  - *Adapter:* `PagoPruebaAdapter` para traducir pasarelas de pago simuladas al dominio.
  - *Composite:* Jerarquía de categorías y subcategorías multinivel.
- **Comportamiento:**
  - *State:* `EstadoPedido` y clases de estado (`EstadoPendiente`, `EstadoEnPreparacion`, `EstadoDespachado`, `EstadoEntregado`, `EstadoCancelado`) para transiciones sin condicionales anidados.
  - *Observer:* `EventoPedido` y `ObservadorPedido` para desacoplar alertas y auditoría.
  - *Command:* `ComandoCarrito` con comandos `ejecutar` y `deshacer` para revertir modificaciones antes de la confirmación.
- **GRASP:** Controller, Information Expert, Creator, High Cohesion, Low Coupling y Pure Fabrication.
- **Regla Anti-Inflación:** No inventar patrones cosméticos o innecesarios solo para inflar el conteo.

### IV. Seguridad, Autenticación y Autorización por Roles
- **Sesión de Servidor:** Autenticación obligatoria mediante `HttpSession` nativa de Jakarta Servlet y cookies `JSESSIONID` con atributos `HttpOnly` y `SameSite=Lax` (y `Secure` sobre HTTPS).
- **Criptografía Segura:** Contraseñas hasheadas exclusivamente con `BCryptPasswordEncoder`. Prohibido almacenar, transmitir o registrar claves en texto plano.
- **Aislamiento de Credenciales:** Prohibido exponer `clave_hash` o credenciales en respuestas JSON o DTOs públicos.
- **Control de Acceso Basado en Roles (RBAC):** Cinco roles estrictos: `CLIENTE`, `ADMIN`, `VENDEDOR`, `ALMACEN` y `SOPORTE`. Cada endpoint protegido debe verificar rol y cuenta activa mediante `SesionAutenticada`.
- **Control de Propiedad:** Los clientes solo pueden consultar, cancelar, preguntar o reclamar sobre sus propios recursos mediante el `clienteId` de la sesión (nunca confiando en IDs enviados en la URL o cuerpo).
- **Salvaguaradas de Administración:** Prohibida la auto-desactivación, la auto-democión y la desactivación del último administrador activo del sistema.

### V. Calidad, TDD y Cero Regresiones (Non-Negotiable)
- **Metodología TDD:** Toda nueva funcionalidad o corrección debe contar con pruebas unitarias o de integración automatizadas antes de darse por completada.
- **Verificación Continua:** Tras cada cambio, debe compilarse y validarse la suite completa mediante `./mvnw.cmd test` (backend) y `npm run build` (frontend).
- **Honestidad en Resultados:** Queda estrictamente prohibido afirmar que una prueba pasó o que un flujo funciona sin evidencia ejecutable directa en el entorno.

---

## Modelo de Datos y Reglas de Persistencia

1. **Esquema Canónico:** Conservar estrictamente los nombres canónicos de tablas (`usuario`, `categoria`, `producto`, `movimiento_inventario`, `carrito`, `carrito_detalle`, `pedido`, `pedido_detalle`, `pago`, `pedido_historial_estado`, `consulta_producto`, `envio`, `notificacion`, `reclamo`, `devolucion`, `detalle_devolucion`).
2. **Migraciones Aditivas:** Todo cambio al esquema debe documentarse en scripts SQL versionados e idempotentes (`database/0X_*.sql`) sin alterar destructivamente los datos existentes.
3. **Protección de Datos:** Prohibido ejecutar `DROP TABLE`, `TRUNCATE` o borrados masivos descontrolados en entornos de prueba o producción.

---

## Gobernanza y Flujo de Trabajo SDD

1. **Supremacía Constitucional:** Esta constitución rige todas las decisiones técnicas, agentes y colaboradores. Ninguna sugerencia o solicitud de implementación puede violar estos principios sin una enmienda formal.
2. **Flujo Spec Kit:**
   - `spec.md`: Define el QUÉ y el POR QUÉ con historias de usuario priorizadas (P1, P2...) y criterios Gherkin (`Given-When-Then`).
   - `plan.md`: Define el CÓMO técnico, arquitectura de capas, contratos JSON y justificación de patrones de diseño.
   - `tasks.md`: Desglosa tareas atómicas en orden: Foundational $\rightarrow$ Backend TDD $\rightarrow$ Frontend $\rightarrow$ Verificación.
3. **Auditoría de Convergencia:** Al finalizar cada hito, se ejecuta `/speckit-converge` para asegurar que el código fuente coincide exactamente con la especificación y la constitución.

**Versión**: 1.0.0 | **Ratificada**: 2026-11-07 | **Última Enmienda**: 2026-11-07
