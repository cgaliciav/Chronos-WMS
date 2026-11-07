/**
 * Efecto de cada tipo de movimiento sobre un InventarioActual (plan 02 §2.3). Funciones PURAS: reciben el estado
 * y devuelven el nuevo, o lanzan AppError. Sin TypeORM ni E/S. Sustituyen al `switch` de `actualizarInventarioActual`
 * conservando sus reglas y mensajes. La validación de "a qué préstamo corresponde" un regreso NO vive aquí: la hace
 * `MovimientoService.resolverRelaciones`.
 */
import { InventarioDisponible } from "../../entity/common/InventarioDisponible";
import { MovimientoTipoId as T } from "../../entity/common/MovimientoTipoId";
import { AppError } from "../../helpers/errorClases";

export interface EstadoInventario {
  cantidad: number; // existencia disponible en el almacén
  cantidadAlmacen: number; // existencia dada de alta (compra/alta)
  disponible: InventarioDisponible;
}

const disponibilidadPorExistencia = (cantidad: number) =>
  cantidad > 0 ? InventarioDisponible.DISPONIBLE : InventarioDisponible.NO_DISPONIBLE;

/** Evita residuos de coma flotante (columnas numeric(15,4)). */
const redondear = (n: number) => Math.round(n * 10000) / 10000;

const salida = (e: EstadoInventario, n: number): EstadoInventario => {
  if (e.cantidad === 0) {
    throw new AppError("NO HAY EXISTENCIA DISPONIBLE DEL ARTÍCULO", 400);
  }
  if (n > e.cantidad) {
    throw new AppError(`NO HAY EXISTENCIA SUFICIENTE DEL ARTÍCULO. EXISTENCIA:${e.cantidad}  SOLICITADO:${n}`, 400);
  }
  const cantidad = redondear(e.cantidad - n);
  return { ...e, cantidad, disponible: cantidad <= 0 ? InventarioDisponible.NO_DISPONIBLE : e.disponible };
};

const regreso = (e: EstadoInventario, n: number): EstadoInventario => {
  if (e.cantidad === e.cantidadAlmacen) {
    throw new AppError("EL ARTÍCULO NO INDICA QUE ESTÉ PRESTADO, POR FAVOR VERIFÍQUELO", 400);
  }
  const cantidad = redondear(e.cantidad + n);
  if (cantidad > e.cantidadAlmacen) {
    throw new AppError("LA CANTIDAD A REGRESAR SOBREPASA EL LÍMITE DE cantidadAlmacen", 400);
  }
  return { ...e, cantidad, disponible: InventarioDisponible.DISPONIBLE };
};

const baja = (e: EstadoInventario): EstadoInventario => ({ ...e, cantidad: 0, cantidadAlmacen: 0, disponible: InventarioDisponible.BAJA });

const alta = (e: EstadoInventario, n: number): EstadoInventario => ({
  cantidad: redondear(e.cantidad + n),
  cantidadAlmacen: redondear(e.cantidadAlmacen + n),
  disponible: InventarioDisponible.DISPONIBLE,
});

const EFECTOS: Record<number, (e: EstadoInventario, n: number) => EstadoInventario> = {
  [T.COMPRA_LEGADO]: alta,
  [T.ALTA_LEGADO]: alta,
  [T.ALTA]: alta,
  // El artículo comprado queda "en el proyecto": no disponible hasta su primera devolución al almacén.
  [T.COMPRA]: (e, n) => ({ cantidad: 0, cantidadAlmacen: redondear(e.cantidadAlmacen + n), disponible: InventarioDisponible.NO_DISPONIBLE }),
  [T.PRESTAMO]: salida,
  [T.RENTA_EXTERNA]: salida,
  [T.TRANSFERENCIA_DESTINO]: salida,
  [T.DEVOLUCION]: regreso,
  [T.TRANSFERENCIA_ORIGEN]: regreso,
  [T.BAJA_LEGADO]: baja,
  [T.BAJA_JUSTIFICADA]: baja,
  [T.BAJA_INJUSTIFICADA]: baja,
  [T.BAJA_EN_INVENTARIO]: baja,
  [T.BAJA_ADMINISTRADOR]: baja,
  // Administrativos: hoy no modifican el inventario (plan 02 §7, revisar con el propietario).
  [T.AJUSTE_INVENTARIO]: (e) => ({ ...e }),
  [T.INVENTARIO]: (e) => ({ ...e }),
  [T.AJUSTE_ADMINISTRADOR]: (e) => ({ ...e }),
};

/** Valida y calcula el estado del inventario tras aplicar `cantidad` de un movimiento de tipo `tipo`. */
export const aplicarEfecto = (tipo: number | string, estado: EstadoInventario, cantidad: number): EstadoInventario => {
  const n = Number(cantidad);
  if (!Number.isFinite(n) || n <= 0) {
    throw new AppError("La cantidad de operación debe ser mayor de 0", 400);
  }
  if (estado.disponible === InventarioDisponible.BAJA) {
    throw new AppError("ARTÍCULO DADO DE BAJA. NO SE PERMITEN OPERACIONES", 400);
  }
  const efecto = EFECTOS[Number(tipo)];
  if (efecto === undefined) {
    throw new AppError(`Tipo de movimiento desconocido: ${tipo}`, 400);
  }
  return efecto({ cantidad: Number(estado.cantidad), cantidadAlmacen: Number(estado.cantidadAlmacen), disponible: estado.disponible }, n);
};

const conflicto = (mensaje: string) => new AppError(mensaje, 409);

const INVERSOS: Record<number, (e: EstadoInventario, n: number) => EstadoInventario> = {
  [T.PRESTAMO]: (e, n) => deshacerSalida(e, n),
  [T.RENTA_EXTERNA]: (e, n) => deshacerSalida(e, n),
  [T.TRANSFERENCIA_DESTINO]: (e, n) => deshacerSalida(e, n),
  [T.DEVOLUCION]: (e, n) => deshacerRegreso(e, n),
  [T.TRANSFERENCIA_ORIGEN]: (e, n) => deshacerRegreso(e, n),
  [T.ALTA]: (e, n) => deshacerAlta(e, n),
  [T.ALTA_LEGADO]: (e, n) => deshacerAlta(e, n),
  [T.AJUSTE_INVENTARIO]: (e) => ({ ...e }),
  [T.INVENTARIO]: (e) => ({ ...e }),
  [T.AJUSTE_ADMINISTRADOR]: (e) => ({ ...e }),
};

const deshacerSalida = (e: EstadoInventario, n: number): EstadoInventario => {
  const cantidad = redondear(e.cantidad + n);
  if (cantidad > e.cantidadAlmacen) {
    throw conflicto("No se puede deshacer: la existencia resultante superaría la cantidad dada de alta");
  }
  return { ...e, cantidad, disponible: InventarioDisponible.DISPONIBLE };
};

const deshacerRegreso = (e: EstadoInventario, n: number): EstadoInventario => {
  if (e.cantidad < n) {
    throw conflicto("No se puede deshacer: lo devuelto ya volvió a salir del almacén; deshaga primero esas salidas");
  }
  const cantidad = redondear(e.cantidad - n);
  return { ...e, cantidad, disponible: disponibilidadPorExistencia(cantidad) };
};

const deshacerAlta = (e: EstadoInventario, n: number): EstadoInventario => {
  if (e.cantidad < n) {
    throw conflicto("No se puede deshacer el alta: parte de la existencia está fuera del almacén");
  }
  const cantidad = redondear(e.cantidad - n);
  return { cantidad, cantidadAlmacen: redondear(e.cantidadAlmacen - n), disponible: disponibilidadPorExistencia(cantidad) };
};

/**
 * Tipos que se deshacen aplicando su efecto inverso, aunque no sean el último movimiento del inventario.
 * Los demás (compras y bajas, que fijan valores absolutos) solo se deshacen restaurando su instantánea.
 */
export const esInvertible = (tipo: number | string) => INVERSOS[Number(tipo)] !== undefined;

/** Estado del inventario tras deshacer un movimiento invertible. Lanza 409 si el resultado sería incoherente. */
export const revertirEfecto = (tipo: number | string, estado: EstadoInventario, cantidad: number): EstadoInventario => {
  const inverso = INVERSOS[Number(tipo)];
  if (inverso === undefined) {
    throw new AppError(`El tipo de movimiento ${tipo} no se deshace por efecto inverso`, 500);
  }
  if (estado.disponible === InventarioDisponible.BAJA) {
    throw conflicto("No se puede deshacer: el artículo está dado de baja; deshaga primero la baja");
  }
  return inverso({ cantidad: Number(estado.cantidad), cantidadAlmacen: Number(estado.cantidadAlmacen), disponible: estado.disponible }, Number(cantidad));
};
