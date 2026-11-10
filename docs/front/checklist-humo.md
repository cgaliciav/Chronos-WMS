# Front · Checklist de humo (rutas críticas)

Verificación manual que debe pasarse **al cerrar cada fase** del plan 01
(`docs/planes/01-front-actualizacion-antd.md`) y antes de cada despliegue. Mientras no existan los e2e de
la fase 7, este documento es la red de seguridad. Inventario completo de rutas, roles y endpoints:
[`inventario-rutas.md`](inventario-rutas.md).

## Cómo ejecutarlo

- Usuario de prueba con rol `ADMINISTRADOR` (ve todo) y, para el punto 0.4, uno sin ese rol
  (p. ej. solo `V-CATALOGO-GENERAL`).
- Navegador con la consola de DevTools abierta. **Criterio global de cada ruta:** sin errores rojos en
  consola (`pageerror`, `Uncaught`, `Warning: ... is deprecated` a partir de la fase 4) y sin
  peticiones con estado 4xx/5xx inesperadas en la pestaña Red.
- Contra un API local (`api/`, puerto 4100) con datos de prueba o el `docker-compose.test.yml` del plan 02.
- Anotar fecha, fase, commit y resultado (✅ / ❌ + nota) en la tabla final.

## 0. Transversal (layout, sesión y permisos)

| # | Verificación |
|---|---|
| 0.0 | Un enlace antiguo `/#/catalogo/general` se convierte en `/catalogo/general`; recargar (F5) cualquier página la vuelve a mostrar (no 404). |
| 0.1 | `/` sin sesión redirige a `/auth/login`; con sesión redirige a `/catalogo/general` (o `/catalogo/validaciones` si el usuario tiene `VALIDACIONES`). |
| 0.2 | El menú lateral muestra solo las entradas permitidas por los roles del usuario; colapsar/expandir funciona y el estado se conserva al recargar. |
| 0.3 | Recargar (F5) en una ruta interna mantiene la sesión (`GET /user/current` responde 200) y la misma ruta. |
| 0.4 | Un usuario sin rol entra por URL a una ruta protegida (p. ej. `/compras/nuevo`) → `/auth/401`. Una ruta inexistente → `/auth/404`. |
| 0.5 | Cerrar sesión borra `localStorage.t`, vuelve al login y, tras volver a entrar con otro usuario, el menú refleja **sus** permisos (no los del anterior; hallazgo F4). |

## 1. `/auth/login`

| # | Verificación |
|---|---|
| 1.1 | La página muestra el formulario (correo/usuario y contraseña) sin el layout principal. |
| 1.2 | Credenciales válidas → `POST /auth/login` 200, se guarda `localStorage.t` y se navega a la última ruta visitada (`localStorage.ultimaVisitada`) o al destino inicial. |
| 1.3 | Credenciales inválidas → notificación de error visible; permanece en el login, sin token guardado. |
| 1.4 | Desde la fase 3: el cuerpo del `POST /auth/login` **no** lleva `ip` y no hay petición a `api.ipify.org` (D15). |

## 2. `/catalogo/general`

| # | Verificación |
|---|---|
| 2.1 | Título "Catálogo General"; se cargan los selectores de Áreas, Almacenes y Estado. |
| 2.2 | Buscar un texto conocido llena la tabla (petición `list-antd` 200) con paginación y total correctos. |
| 2.3 | Cambiar de página, ordenar una columna y filtrar vuelve a consultar el API con `sortField/sortOrder/pagination/filters`. |
| 2.4 | Abrir el detalle de un artículo navega a `/articulos/detalle?…` y muestra sus datos e imágenes (miniaturas cargan). |

## 3. `/catalogo/por-codigos`

| # | Verificación |
|---|---|
| 3.1 | Título "Catálogo por Código"; el campo de búsqueda recibe foco y acepta la lectura del escáner (texto + Enter). |
| 3.2 | Varios códigos (separados como lo exige el formulario) devuelven sus artículos; un código inexistente no rompe la tabla. |
| 3.3 | Paginación y detalle de artículo funcionan como en 2.3–2.4. |

## 4. `/prestamos/nuevo`

| # | Verificación |
|---|---|
| 4.1 | Título "Nuevo listado de préstamo"; los selectores (proyecto, usuario/solicitante, etc.) cargan sus opciones. |
| 4.2 | Enviar con campos obligatorios vacíos muestra validación y **no** llama al API. |
| 4.3 | Enviar completo → petición de alta del grupo 200 y navegación a `/prestamos/operacion?uid=<id>`. |
| 4.4 | Si el API responde error (p. ej. 400/500), se muestra la notificación y **no** se navega (desde la fase 3, con el interceptor corregido; hallazgo F1). |

## 5. `/prestamos/operacion?uid=<id>`

| # | Verificación |
|---|---|
| 5.1 | Muestra cabecera del grupo (título, estatus, proyecto) y la tabla de movimientos del grupo. |
| 5.2 | Buscar/escanear una clave en el formulario y agregarla → el movimiento aparece en la tabla y el inventario del artículo cambia. |
| 5.3 | Quitar un movimiento lo elimina de la tabla con notificación de éxito. |
| 5.4 | Los modales de Comentarios, Archivos e Imágenes abren, cargan y cierran sin errores. |
| 5.5 | Inhabilitar/Habilitar el grupo cambia el botón y el estatus. |

## 6. `/devoluciones/nuevo`

| # | Verificación |
|---|---|
| 6.1 | Título "Nuevo listado de devolución"; los selectores cargan. |
| 6.2 | Validación de obligatorios sin llamar al API. |
| 6.3 | Envío correcto → navega a `/devoluciones/operacion?uid=<id>`; ahí agregar un artículo prestado lo devuelve (aparece en la tabla). |
| 6.4 | Error del API → notificación, sin navegación. |

## 7. `/compras/nuevo`

| # | Verificación |
|---|---|
| 7.1 | Título "Nuevo listado de compras"; selectores (proveedor, proyecto, bodega…) cargan. |
| 7.2 | Campos de fecha (factura) abren el `DatePicker` y guardan la fecha correcta (sin desfase de día; vigilar en la fase 4, moment → dayjs). |
| 7.3 | Envío correcto → navega a `/compras/operacion?uid=<id>`. |
| 7.4 | Error del API → notificación, sin navegación. |

## 8. `/compras/operacion?uid=<id>`

| # | Verificación |
|---|---|
| 8.1 | Cabecera del grupo y tabla de movimientos cargan. |
| 8.2 | El asistente de alta de artículo (`formaAC`: pasos con "Siguiente"/"Terminar") permite capturar un artículo nuevo con precios, claves y características y lo agrega a la tabla. |
| 8.3 | Subir un archivo (factura) con `Upload` envía la cabecera `auth` y el archivo aparece en el modal de Archivos. |
| 8.4 | Editar el grupo (`/compras/editar`) y volver conserva los cambios. |

## 9. `/bajas/nuevo`

| # | Verificación |
|---|---|
| 9.1 | Título "Nuevo listado de bajas"; selectores cargan. |
| 9.2 | Envío correcto → navega a `/bajas/operacion?uid=<id>`; agregar un artículo lo da de baja (desaparece del catálogo general, aparece en `/catalogo/bajas`). |
| 9.3 | Registrar en la nota del resultado qué `movimiento_tipo` envía el front (hallazgo F6: hoy 5, legado). |

## 10. `/movimientos/detalle?…`

| # | Verificación |
|---|---|
| 10.1 | Título "Detalle movimientos"; muestra los datos del movimiento y del artículo. |
| 10.2 | Pestañas "Historial", "Comentarios Movimiento" y "Archivos Movimiento" cambian y cargan su contenido. |
| 10.3 | Agregar un comentario lo muestra en la lista sin recargar. |

## Registro de ejecuciones

| Fecha | Fase / commit | Ejecutó | Resultado | Notas |
|---|---|---|---|---|
| | | | | |
