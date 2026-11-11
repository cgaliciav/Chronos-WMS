# Tipos de movimiento (`movimiento_tipo`)

Los ids están fijados en la base de datos de producción. Desde la fase 3 del plan 02 tienen nombre en
`api/src/entity/common/MovimientoTipoId.ts` (enum `MovimientoTipoId` y clases `TIPOS_*`); quedan números
sueltos en controladores que se sustituyen en la fase 4. El efecto de cada tipo vive en
`api/src/services/reglas/efectosInventario.ts` (función pura, mismas reglas y mensajes que el `switch` anterior).

En la base de producción los ids 1, 2 y 5 se llaman `COMPRA+`, `ALTA+` y `BAJA+` (esta tabla los marca con `*`).

| id | nombre | Efecto sobre `InventarioActual` (nombres del `switch` anterior a la fase 3) | Requiere proyecto | Notas |
|---:|---|---|:-:|---|
| 1 | COMPRA* (legado) | `actualizarInventarioActualCompraOld`: `cantidadAlmacen += n`, `cantidad += n`, disponible | sí | Sustituido por 15. Guarda histórico. |
| 2 | ALTA* (legado) | `actualizarInventarioActualAlta` | sí | Sustituido por 14. **No** guarda histórico. |
| 3 | PRÉSTAMO | `actualizarInventarioActualPrestamo`: `cantidad -= n`; si llega a 0 → `no-disponible` | sí | Origen de devoluciones/bajas. |
| 4 | DEVOLUCIÓN | `actualizarInventarioActualDevolucion`: `cantidad += n` (≤ `cantidadAlmacen`) | sí | Se relaciona con salidas del mismo proyecto (`movimiento_relacion`). |
| 5 | BAJA* (legado) | `actualizarInventarioActualBaja`: todo a 0, `disponible = baja` | sí | Sustituido por 13/16. Ya no se crean listados de tipo 5 (decisión 11); los antiguos admiten líneas 13 y 16. |
| 6 | AJUSTE INVENTARIO | **sin caso en el `switch`** (no modifica inventario) | — | **No es un movimiento (decisión 12): el API lo rechaza.** |
| 7 | TRANSFERENCIA ORIGEN | igual que DEVOLUCIÓN (regresa al almacén desde el proyecto origen) | sí | Siempre debe ir acompañado de un 12. |
| 8 | BAJA EN INVENTARIO | `actualizarInventarioActualBajaSinProyecto`: todo a 0, `baja` | no | Se usa al cerrar inventarios. |
| 9 | INVENTARIO | sin caso en el `switch` | — | **No es un movimiento (decisión 12): el API lo rechaza.** Era el tipo del inventario físico, retirado (decisión 10). |
| 10 | AJUSTE DE ADMINISTRADOR | sin caso en el `switch` | — | **No es un movimiento (decisión 12): el API lo rechaza.** |
| 11 | RENTA EXTERNA | `actualizarInventarioActualRentaExterna`: como préstamo | sí (externo) | |
| 12 | TRANSFERENCIA DESTINO | igual que PRÉSTAMO (sale hacia el proyecto destino) | sí | Pareja de 7. |
| 13 | BAJA JUSTIFICADA | `actualizarInventarioActualBaja` | sí | Intercambiable con 16 en `Operacion.modificar`. |
| 14 | ALTA | `actualizarInventarioActualAlta` | sí | Crea producto + inventario (`agregarMovimientoCompra`). Desde la fase 3 guarda histórico. |
| 15 | COMPRA | `actualizarInventarioActualCompra`: `cantidadAlmacen += n`, `cantidad = 0`, `no-disponible` | sí | Única con `OperacionDetalle` (precios). El artículo nace "no disponible" hasta su primera devolución al almacén, por eso es **origen** de esa devolución. Desde la fase 3 guarda histórico. |
| 16 | BAJA INJUSTIFICADA | `actualizarInventarioActualBaja` | sí | |
| 17 | BAJA ADMINISTRADOR | `actualizarInventarioActualBajaSinProyecto` | no | |

## Clasificación (`MovimientoTipoId.ts`, fase 3)

| Constante | Tipos | Semántica |
|---|---|---|
| `TIPOS_ENTRADA` | 1, 2, 14, 15 | Crean/aumentan `cantidadAlmacen`. Nunca son derivados. Solo se registran desde `PUT /groups/activity-purchase`. |
| `TIPOS_SALIDA` | 3, 11, 12 | Disminuyen `cantidad`. |
| `TIPOS_ORIGEN` | 3, 11, 12, **15** | Abren un saldo pendiente de regreso (la compra también, ver arriba). |
| `TIPOS_REGRESO` | 4, 7, 13, 16, 5 | Consumen saldo de orígenes del mismo inventario y proyecto (`movimiento_relacion`). El 7 es además origen de su 12. |
| `TIPOS_BAJA_LIBRE` | 8, 17 | Cierran el inventario completo y todas sus salidas abiertas (`cierre-inventario`). |
| `TIPOS_NO_MOVIMIENTO` | 6, 9, 10 | No son movimientos (decisión 12): no se registran ni se usan como tipo de listado. Los antiguos se pueden deshacer. |
| `TIPOS_LISTADO_NO_PERMITIDOS` | 5, 6, 9, 10 | Tipos con los que ya no se crean listados. `tiposAdmitidosEnListado(t)` = `[t]`, o `[13, 16]` para los listados antiguos de tipo 5 (decisión 11). |
| `TIPOS_CON_SALDO` | 3, 7, 11, 12, 15 | Filas de la vista `v_movimiento_saldo`. |

Al **deshacer** (`DELETE /groups/activity`): 3, 4, 7, 11, 12, 14, 2 (y 6, 9, 10) se revierten con su efecto inverso aunque
no sean el último movimiento; 1, 15, 5, 8, 13, 16, 17 fijan valores absolutos y solo se deshacen siendo el último,
restaurando la instantánea ligada.
