/**
 * Efecto de cada tipo de movimiento sobre un InventarioActual (plan 02 §2.3, plan 04 bloque A). Funciones PURAS:
 * reciben el estado y devuelven el nuevo, o lanzan AppError. Sin TypeORM ni E/S. La validación de "a qué préstamo
 * corresponde" un regreso NO vive aquí: la hace `MovimientoService.resolverRelaciones`.
 *
 * Los productos CONSUMIBLES (expendables, decisión 18) tienen efectos propios: lo que sale se da por consumido
 * (baja también `cantidadAlmacen`) y lo que regresa vuelve a sumar a ambas existencias.
 */
import { InventarioDisponible } from "../../entity/common/InventarioDisponible";
import { esTipo, MovimientoTipoId as T, TIPOS_BAJA, TIPOS_BAJA_LIBRE, TIPOS_NO_MOVIMIENTO } from "../../entity/common/MovimientoTipoId";
import { AppError } from "../../helpers/errorClases";

export interface EstadoInventario {
  cantidad: number; // existencia disponible en el almacén
  cantidadAlmacen: number; // existencia dada de alta (compra/alta)
  disponible: InventarioDisponible;
}

export interface OpcionesEfecto {
  /** El producto es CONSUMIBLE (expendable). */
  consumible?: boolean;
}

type Efecto = (e: EstadoInventario, n: number) => EstadoInventario;

const disponibilidadPorExistencia = (cantidad: number) =>
  cantidad > 0 ? InventarioDisponible.DISPONIBLE : InventarioDisponible.NO_DISPONIBLE;

/** Evita residuos de coma flotante (columnas numeric(15,4)). */
const redondear = (n: number) => Math.round(n * 10000) / 10000;

const exigirExistencia = (e: EstadoInventario, n: number) => {
  if (e.cantidad === 0) {
    throw new AppError("NO HAY EXISTENCIA DISPONIBLE DEL ARTÍCULO", 400);
  }
  if (n > e.cantidad) {
    throw new AppError(`NO HAY EXISTENCIA SUFICIENTE DEL ARTÍCULO. EXISTENCIA:${e.cantidad}  SOLICITADO:${n}`, 400);
  }
};

const salida: Efecto = (e, n) => {
  exigirExistencia(e, n);
  const cantidad = redondear(e.cantidad - n);
  return { ...e, cantidad, disponible: cantidad <= 0 ? InventarioDisponible.NO_DISPONIBLE : e.disponible };
};

const regreso: Efecto = (e, n) => {
  if (e.cantidad === e.cantidadAlmacen) {
    throw new AppError("EL ARTÍCULO NO INDICA QUE ESTÉ PRESTADO, POR FAVOR VERIFÍQUELO", 400);
  }
  const cantidad = redondear(e.cantidad + n);
  if (cantidad > e.cantidadAlmacen) {
    throw new AppError("LA CANTIDAD A REGRESAR SOBREPASA EL LÍMITE DE cantidadAlmacen", 400);
  }
  return { ...e, cantidad, disponible: InventarioDisponible.DISPONIBLE };
};

/**
 * Baja por cantidad (decisión 19): descuenta `n` unidades de `cantidadAlmacen`. Las bajas con proyecto toman primero
 * las unidades que están fuera del almacén; las bajas sin proyecto, primero las del almacén. El artículo queda dado de
 * baja solo cuando no le quedan unidades. Un artículo sin existencias (0/0) se da de baja con cualquier cantidad.
 */
const baja =
  (primeroAlmacen: boolean): Efecto =>
  (e, n) => {
    if (e.cantidadAlmacen === 0) return { cantidad: 0, cantidadAlmacen: 0, disponible: InventarioDisponible.BAJA };
    if (n > e.cantidadAlmacen) {
      throw new AppError(`LA CANTIDAD A DAR DE BAJA (${n}) EXCEDE LA EXISTENCIA DEL ARTÍCULO (${e.cantidadAlmacen})`, 400);
    }
    const fuera = Math.max(0, redondear(e.cantidadAlmacen - e.cantidad));
    const deAlmacen = primeroAlmacen ? Math.min(n, e.cantidad) : Math.max(0, redondear(n - fuera));
    const cantidad = redondear(e.cantidad - deAlmacen);
    const cantidadAlmacen = redondear(e.cantidadAlmacen - n);
    if (cantidadAlmacen <= 0) return { cantidad: 0, cantidadAlmacen: 0, disponible: InventarioDisponible.BAJA };
    return { cantidad, cantidadAlmacen, disponible: cantidad <= 0 ? InventarioDisponible.NO_DISPONIBLE : e.disponible };
  };

const bajaProyecto = baja(false);
const bajaLibre = baja(true);

const alta: Efecto = (e, n) => ({
  cantidad: redondear(e.cantidad + n),
  cantidadAlmacen: redondear(e.cantidadAlmacen + n),
  disponible: InventarioDisponible.DISPONIBLE,
});

const compra: Efecto = (e, n) => ({ cantidad: 0, cantidadAlmacen: redondear(e.cantidadAlmacen + n), disponible: InventarioDisponible.NO_DISPONIBLE });

const EFECTOS: Record<number, Efecto> = {
  [T.COMPRA_LEGADO]: alta,
  [T.ALTA_LEGADO]: alta,
  [T.ALTA]: alta,
  // El artículo comprado queda "en el proyecto": no disponible hasta su primera devolución al almacén.
  [T.COMPRA]: (e, n) => compra(e, n),
  // El producto creado por transformación queda a cargo de la producción, igual que una compra (decisión 20).
  [T.ALTA_POR_TRANSFORMACION]: (e, n) => compra(e, n),
  // Las unidades transformadas dejan de existir: baja por cantidad de lo que tiene la producción.
  [T.TRANSFORMACION]: bajaProyecto,
  [T.PRESTAMO]: salida,
  [T.RENTA_EXTERNA]: salida,
  [T.TRANSFERENCIA_DESTINO]: salida,
  [T.DEVOLUCION]: regreso,
  [T.TRANSFERENCIA_ORIGEN]: regreso,
  [T.BAJA_LEGADO]: bajaProyecto,
  [T.BAJA_JUSTIFICADA]: bajaProyecto,
  [T.BAJA_INJUSTIFICADA]: bajaProyecto,
  [T.BAJA_EN_INVENTARIO]: bajaLibre,
  [T.BAJA_ADMINISTRADOR]: bajaLibre,
  // 6, 9 y 10 no son movimientos (decisión 12): aplicarEfecto los rechaza.
};

/** Lo que sale de un consumible se da por consumido: baja la existencia disponible y la total. */
const consumo: Efecto = (e, n) => {
  exigirExistencia(e, n);
  const cantidad = redondear(e.cantidad - n);
  return { cantidad, cantidadAlmacen: Math.max(0, redondear(e.cantidadAlmacen - n)), disponible: cantidad <= 0 ? InventarioDisponible.NO_DISPONIBLE : e.disponible };
};

/** Baja de un consumible: solo hay unidades en el almacén (lo prestado ya se consumió). */
const bajaConsumible: Efecto = (e, n) => {
  if (e.cantidadAlmacen === 0) return { cantidad: 0, cantidadAlmacen: 0, disponible: InventarioDisponible.BAJA };
  if (n > e.cantidad) {
    throw new AppError(`LA CANTIDAD A DAR DE BAJA (${n}) EXCEDE LA EXISTENCIA DEL ARTÍCULO (${e.cantidad})`, 400);
  }
  return bajaLibre(e, n);
};

const noSeTransfiere: Efecto = () => {
  throw new AppError("LOS EXPENDABLES NO SE TRANSFIEREN ENTRE PROYECTOS: SE CONSUMEN AL PRESTARSE", 400);
};

const compraConsumible = (e: EstadoInventario): EstadoInventario => ({ ...e, disponible: e.cantidad > 0 ? e.disponible : InventarioDisponible.NO_DISPONIBLE });

const EFECTOS_CONSUMIBLE: Record<number, Efecto> = {
  [T.COMPRA_LEGADO]: alta,
  [T.ALTA_LEGADO]: alta,
  [T.ALTA]: alta,
  // La compra queda a nombre de la producción, ya consumida: no suma existencias. Lo que se devuelva sí suma.
  [T.COMPRA]: (e) => compraConsumible(e),
  [T.ALTA_POR_TRANSFORMACION]: (e) => compraConsumible(e),
  // Lo que la producción transforma de un consumible ya se dio por consumido al salir: no hay existencias que descontar.
  [T.TRANSFORMACION]: (e) => ({ ...e }),
  [T.PRESTAMO]: consumo,
  [T.RENTA_EXTERNA]: consumo,
  [T.DEVOLUCION]: alta,
  [T.TRANSFERENCIA_ORIGEN]: noSeTransfiere,
  [T.TRANSFERENCIA_DESTINO]: noSeTransfiere,
  [T.BAJA_LEGADO]: bajaConsumible,
  [T.BAJA_JUSTIFICADA]: bajaConsumible,
  [T.BAJA_INJUSTIFICADA]: bajaConsumible,
  [T.BAJA_EN_INVENTARIO]: bajaConsumible,
  [T.BAJA_ADMINISTRADOR]: bajaConsumible,
};

/** Valida y calcula el estado del inventario tras aplicar `cantidad` de un movimiento de tipo `tipo`. */
export const aplicarEfecto = (tipo: number | string, estado: EstadoInventario, cantidad: number, opciones: OpcionesEfecto = {}): EstadoInventario => {
  const n = Number(cantidad);
  if (!Number.isFinite(n) || n <= 0) {
    throw new AppError("La cantidad de operación debe ser mayor de 0", 400);
  }
  if (esTipo(TIPOS_NO_MOVIMIENTO, tipo)) {
    throw new AppError(`El tipo ${tipo} (inventario o ajuste) no es un movimiento de almacén y no se registra como operación`, 400);
  }
  if (estado.disponible === InventarioDisponible.BAJA) {
    throw new AppError("ARTÍCULO DADO DE BAJA. NO SE PERMITEN OPERACIONES", 400);
  }
  const efecto = (opciones.consumible ? EFECTOS_CONSUMIBLE : EFECTOS)[Number(tipo)];
  if (efecto === undefined) {
    throw new AppError(`Tipo de movimiento desconocido: ${tipo}`, 400);
  }
  return efecto({ cantidad: Number(estado.cantidad), cantidadAlmacen: Number(estado.cantidadAlmacen), disponible: estado.disponible }, n);
};

/**
 * Unidades de una baja sin proyecto que salen de lo que está FUERA del almacén (el resto sale del almacén).
 * `planificarRelaciones` las reparte entre las salidas abiertas.
 */
export const unidadesFueraDeBajaLibre = (tipo: number | string, estado: Pick<EstadoInventario, "cantidad">, cantidad: number): number =>
  esTipo(TIPOS_BAJA_LIBRE, tipo) ? Math.max(0, redondear(Number(cantidad) - Math.min(Number(cantidad), Number(estado.cantidad)))) : 0;

const conflicto = (mensaje: string) => new AppError(mensaje, 409);

const INVERSOS: Record<number, Efecto> = {
  [T.PRESTAMO]: (e, n) => deshacerSalida(e, n),
  [T.RENTA_EXTERNA]: (e, n) => deshacerSalida(e, n),
  [T.TRANSFERENCIA_DESTINO]: (e, n) => deshacerSalida(e, n),
  [T.DEVOLUCION]: (e, n) => deshacerRegreso(e, n),
  [T.TRANSFERENCIA_ORIGEN]: (e, n) => deshacerRegreso(e, n),
  [T.ALTA]: (e, n) => deshacerAlta(e, n),
  [T.ALTA_LEGADO]: (e, n) => deshacerAlta(e, n),
  // Movimientos antiguos de inventario/ajuste (ya no se registran): se pueden deshacer sin tocar el inventario.
  [T.AJUSTE_INVENTARIO]: (e) => ({ ...e }),
  [T.INVENTARIO]: (e) => ({ ...e }),
  [T.AJUSTE_ADMINISTRADOR]: (e) => ({ ...e }),
};

const deshacerSalida: Efecto = (e, n) => {
  const cantidad = redondear(e.cantidad + n);
  if (cantidad > e.cantidadAlmacen) {
    throw conflicto("No se puede deshacer: la existencia resultante superaría la cantidad dada de alta");
  }
  return { ...e, cantidad, disponible: InventarioDisponible.DISPONIBLE };
};

const deshacerRegreso: Efecto = (e, n) => {
  if (e.cantidad < n) {
    throw conflicto("No se puede deshacer: lo devuelto ya volvió a salir del almacén; deshaga primero esas salidas");
  }
  const cantidad = redondear(e.cantidad - n);
  return { ...e, cantidad, disponible: disponibilidadPorExistencia(cantidad) };
};

const deshacerAlta: Efecto = (e, n) => {
  if (e.cantidad < n) {
    throw conflicto("No se puede deshacer el alta: parte de la existencia está fuera del almacén");
  }
  const cantidad = redondear(e.cantidad - n);
  return { cantidad, cantidadAlmacen: redondear(e.cantidadAlmacen - n), disponible: disponibilidadPorExistencia(cantidad) };
};

/**
 * Tipos que se deshacen aplicando su efecto inverso, aunque no sean el último movimiento del inventario.
 * Las compras fijan valores absolutos y solo se deshacen restaurando su instantánea; las bajas y los movimientos de
 * consumibles se deshacen con los deltas que guardaron (`revertirDeltas`).
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

/** Cambio con signo que un movimiento aplicó a las existencias (se guarda en el movimiento para poder deshacerlo). */
export interface DeltasInventario {
  cantidad: number;
  cantidadAlmacen: number;
}

export const deltasEntre = (antes: EstadoInventario, despues: EstadoInventario): DeltasInventario => ({
  cantidad: redondear(Number(despues.cantidad) - Number(antes.cantidad)),
  cantidadAlmacen: redondear(Number(despues.cantidadAlmacen) - Number(antes.cantidadAlmacen)),
});

/** ¿Se deshace con sus deltas? Bajas por cantidad y movimientos de consumibles que los guardaron (plan 04). */
export const seDeshaceConDeltas = (tipo: number | string, consumible: boolean, deltas: DeltasInventario | null) =>
  deltas !== null && (consumible || esTipo(TIPOS_BAJA, tipo));

/**
 * Estado del inventario tras deshacer un movimiento restando los deltas que aplicó. `tipo` es el del movimiento que se
 * deshace: solo una baja puede sacar al artículo del estado `baja`.
 */
export const revertirDeltas = (tipo: number | string, estado: EstadoInventario, deltas: DeltasInventario): EstadoInventario => {
  if (estado.disponible === InventarioDisponible.BAJA && !esTipo(TIPOS_BAJA, tipo)) {
    throw conflicto("No se puede deshacer: el artículo está dado de baja; deshaga primero la baja");
  }
  const cantidad = redondear(Number(estado.cantidad) - deltas.cantidad);
  const cantidadAlmacen = redondear(Number(estado.cantidadAlmacen) - deltas.cantidadAlmacen);
  if (cantidad < 0 || cantidadAlmacen < 0) {
    throw conflicto("No se puede deshacer: esas unidades ya volvieron a salir del almacén; deshaga primero esos movimientos");
  }
  if (cantidad > cantidadAlmacen) {
    throw conflicto("No se puede deshacer: la existencia resultante superaría la cantidad dada de alta");
  }
  const sinCambio = estado.disponible !== InventarioDisponible.BAJA && cantidad > 0 && Number(estado.cantidad) > 0;
  return { cantidad, cantidadAlmacen, disponible: sinCambio ? estado.disponible : disponibilidadPorExistencia(cantidad) };
};
