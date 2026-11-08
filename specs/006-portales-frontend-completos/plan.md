# PLAN TÉCNICO: Portales Frontend Completos

## 1. Organización de Archivos en el Frontend

Estructura modular en `frontend/`:

```text
frontend/
├── index.html                 # Catálogo público, carrito y modales
├── login.html                 # Autenticación de usuarios
├── register.html              # Registro público de clientes
├── src/
│   ├── api/
│   │   └── api.js             # Cliente centralizado con soporte fetch y credenciales same-origin
│   ├── autenticacion/
│   │   ├── auth.js            # Lógica de login, registro y comprobación de sesión
│   │   └── guardas.js         # Redirección en cliente según rol autenticado
│   ├── cliente/
│   │   ├── mis-pedidos.js     # Historial, tracking y solicitud de reclamo/devolución
│   │   └── mi-atencion.js     # Respuestas a consultas, reclamos y devoluciones
│   ├── almacen/
│   │   ├── inventario.js      # Registro de entradas en lote y consulta de Kardex
│   │   └── despachos.js       # Preparación, asignación de tracking y entrega
│   ├── vendedor/
│   │   ├── productos.js       # Alta, edición de precio/stock y activación
│   │   └── preguntas.js       # Cola de consultas de clientes
│   ├── soporte/
│   │   ├── reclamos.js        # Atención, respuesta y escalamiento de quejas
│   │   └── devoluciones.js    # Evaluación y recepción con reposición selectiva
│   └── administracion/
│       ├── usuarios.js        # Personal, asignación de roles y desactivación
│       ├── categorias.js      # Creación y edición de categorías
│       ├── reportes.js        # Gráficos, métricas y descarga de CSVs
│       └── incidencias.js     # Resolución de casos escalados por soporte
└── style.css                  # Estilos visuales complementarios a Bootstrap 5
```

---

## 2. Integración con Vite y Proxy de API
- En `frontend/vite.config.mjs`, se mantiene la configuración multipágina y el proxy que redirige `/api` a `http://localhost:8081`.
- El empaquetado de producción se verifica con `npm run build` sin dependencias externas pesadas.
