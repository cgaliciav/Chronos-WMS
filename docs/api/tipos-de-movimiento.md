# Tipos de movimiento (`movimiento_tipo`)

Los ids están fijados en la base de datos de producción y **hardcodeados** en
`Movimiento.Controller.ts`, `Grupo.Controller.ts` y `Operacion.Controller.ts`.
Fuente: comentarios en `Movimiento.Controller.ts` y `convertMovementType()` en `Grupo.Controller.ts`.

| id | nombre | Efecto sobre `InventarioActual` (función en `Movimiento.Controller.ts`) | Requiere proyecto | Notas |
|---:|---|---|:-:|---|
| 1 | COMPRA* (legado) | `actualizarInventarioActualCompraOld`: `cantidadAlmacen += n`, `cantidad += n`, disponible | sí | Sustituido por 15. Guarda histórico. |
| 2 | ALTA* (legado) | `actualizarInventarioActualAlta` | sí | Sustituido por 14. **No** guarda histórico. |
| 3 | PRÉSTAMO | `actualizarInventarioActualPrestamo`: `cantidad -= n`; si llega a 0 → `no-disponible` | sí | Origen de devoluciones/bajas. |
| 4 | DEVOLUCIÓN | `actualizarInventarioActualDevolucion`: `cantidad += n` (≤ `cantidadAlmacen`) | sí | Valida con `aceptarDevolucionBaja`. |
| 5 | BAJA* (legado) | `actualizarInventarioActualBaja`: todo a 0, `disponible = baja` | sí | Sustituido por 13/16. |
| 6 | AJUSTE INVENTARIO | **sin caso en el `switch`** (no modifica inventario) | — | Reservado. |
| 7 | TRANSFERENCIA ORIGEN | igual que DEVOLUCIÓN (regresa al almacén desde el proyecto origen) | sí | Siempre debe ir acompañado de un 12. |
| 8 | BAJA EN INVENTARIO | `actualizarInventarioActualBajaSinProyecto`: todo a 0, `baja` | no | Se usa al cerrar inventarios. |
| 9 | INVENTARIO | sin caso en el `switch` | — | Tipo del `GrupoDetalle` de un inventario físico. |
| 10 | AJUSTE DE ADMINISTRADOR | sin caso en el `switch` | — | Reservado. |
| 11 | RENTA EXTERNA | `actualizarInventarioActualRentaExterna`: como préstamo | sí (externo) | Guarda histórico **antes** de validar existencia (fuga de históricos si falla). |
| 12 | TRANSFERENCIA DESTINO | igual que PRÉSTAMO (sale hacia el proyecto destino) | sí | Pareja de 7. |
| 13 | BAJA JUSTIFICADA | `actualizarInventarioActualBaja` | sí | Intercambiable con 16 en `Operacion.modificar`. |
| 14 | ALTA | `actualizarInventarioActualAlta` | sí | Crea producto + inventario (`agregarMovimientoCompra`). |
| 15 | COMPRA | `actualizarInventarioActualCompra`: `cantidadAlmacen += n`, `cantidad = 0`, `no-disponible` | sí | Única con `OperacionDetalle` (precios). El artículo nace "no disponible" hasta su primera devolución al almacén. |
| 16 | BAJA INJUSTIFICADA | `actualizarInventarioActualBaja` | sí | |
| 17 | BAJA ADMINISTRADOR | `actualizarInventarioActualBajaSinProyecto` | no | |

## Clasificación propuesta (para el plan de relación de movimientos)

| Clase | Tipos | Semántica |
|---|---|---|
| **Entrada al almacén (alta)** | 1, 2, 14, 15 | Crean/aumentan `cantidadAlmacen`. No tienen origen. |
| **Salida a proyecto (origen de cadena)** | 3, 11, 12 | Disminuyen `cantidad`. Abren un saldo pendiente de regreso. |
| **Regreso / cierre (derivado)** | 4, 7, 13, 16 | Consumen saldo de una salida del mismo proyecto. Deben apuntar a su origen. |
| **Baja sin proyecto** | 8, 17 | Cierran el inventario completo. Opcionalmente apuntan al último movimiento. |
| **Administrativos** | 6, 9, 10 | Sin efecto en inventario hoy. |

Equivalencias del exportador a Supabase (`convertMovementType`): 1/15 → `purchase`, 2/14 → `new`,
3 → `loan`, 4 → `return`, 5/17 → `elimination`, 11 → `rent`, 13 → `rid_allowed`,
16 → `rid_not_allowed`, resto → `other`.
