import { InventarioDisponible as D } from "../../entity/common/InventarioDisponible";
import { MovimientoTipoId as T } from "../../entity/common/MovimientoTipoId";
import { AppError } from "../../helpers/errorClases";
import {
  aplicarEfecto,
  deltasEntre,
  esInvertible,
  EstadoInventario,
  revertirDeltas,
  revertirEfecto,
  seDeshaceConDeltas,
  unidadesFueraDeBajaLibre,
} from "./efectosInventario";

const estado = (cantidad: number, cantidadAlmacen: number, disponible: D = D.DISPONIBLE): EstadoInventario => ({ cantidad, cantidadAlmacen, disponible });

/** Estados de partida usados en todas las combinaciones. */
const ESTADOS = {
  disponible: estado(3, 5), // 2 unidades fuera
  completo: estado(5, 5), // todo en almacén
  sinExistencia: estado(0, 5, D.NO_DISPONIBLE), // todo fuera (o recién comprado)
  vacio: estado(0, 0, D.NO_DISPONIBLE),
  baja: estado(0, 0, D.BAJA),
};

const error = (fn: () => unknown) => {
  try {
    fn();
  } catch (e) {
    return e as AppError;
  }
  throw new Error("se esperaba un AppError");
};

describe("aplicarEfecto: validaciones comunes a los 17 tipos", () => {
  const todos = Object.values(T).filter((v) => typeof v === "number") as number[];

  it.each(todos)("tipo %i: cantidad <= 0 o no numérica → 400", (tipo) => {
    for (const n of [0, -1, NaN]) {
      const e = error(() => aplicarEfecto(tipo, ESTADOS.disponible, n));
      expect(e.statusCode).toBe(400);
      expect(e.message).toMatch(/mayor de 0/);
    }
  });

  it.each(todos.filter((t) => ![6, 9, 10].includes(t)))("tipo %i: un artículo dado de baja no admite operaciones → 400", (tipo) => {
    const e = error(() => aplicarEfecto(tipo, ESTADOS.baja, 1));
    expect(e.statusCode).toBe(400);
    expect(e.message).toMatch(/DADO DE BAJA/);
  });

  it("tipo desconocido → 400", () => {
    expect(error(() => aplicarEfecto(99, ESTADOS.disponible, 1)).statusCode).toBe(400);
  });

  it("acepta cantidades como string (columnas numeric) y no muta el estado de entrada", () => {
    const entrada = { cantidad: "3" as unknown as number, cantidadAlmacen: "5" as unknown as number, disponible: D.DISPONIBLE };
    expect(aplicarEfecto(T.PRESTAMO, entrada, "2" as unknown as number)).toEqual(estado(1, 5));
    expect(entrada.cantidad).toBe("3");
  });
});

describe("aplicarEfecto: entradas", () => {
  it.each([T.ALTA, T.ALTA_LEGADO, T.COMPRA_LEGADO])("tipo %i suma a cantidad y cantidadAlmacen y deja disponible", (tipo) => {
    expect(aplicarEfecto(tipo, ESTADOS.vacio, 3)).toEqual(estado(3, 3));
    expect(aplicarEfecto(tipo, ESTADOS.sinExistencia, 2)).toEqual(estado(2, 7));
    expect(aplicarEfecto(tipo, ESTADOS.disponible, 0.5)).toEqual(estado(3.5, 5.5));
  });

  it("COMPRA (15) suma a cantidadAlmacen, deja cantidad 0 y no disponible", () => {
    expect(aplicarEfecto(T.COMPRA, ESTADOS.vacio, 5)).toEqual(estado(0, 5, D.NO_DISPONIBLE));
    expect(aplicarEfecto(T.COMPRA, ESTADOS.disponible, 2)).toEqual(estado(0, 7, D.NO_DISPONIBLE));
  });
});

describe("aplicarEfecto: salidas (3, 11, 12)", () => {
  it.each([T.PRESTAMO, T.RENTA_EXTERNA, T.TRANSFERENCIA_DESTINO])("tipo %i", (tipo) => {
    expect(aplicarEfecto(tipo, ESTADOS.disponible, 2)).toEqual(estado(1, 5));
    expect(aplicarEfecto(tipo, ESTADOS.disponible, 3)).toEqual(estado(0, 5, D.NO_DISPONIBLE));
    expect(aplicarEfecto(tipo, ESTADOS.completo, 5)).toEqual(estado(0, 5, D.NO_DISPONIBLE));
    expect(aplicarEfecto(tipo, estado(0.3, 1), 0.1)).toEqual(estado(0.2, 1)); // sin residuos de coma flotante

    const sinExistencia = error(() => aplicarEfecto(tipo, ESTADOS.sinExistencia, 1));
    expect(sinExistencia.statusCode).toBe(400);
    expect(sinExistencia.message).toMatch(/NO HAY EXISTENCIA DISPONIBLE/);

    const insuficiente = error(() => aplicarEfecto(tipo, ESTADOS.disponible, 4));
    expect(insuficiente.statusCode).toBe(400);
    expect(insuficiente.message).toMatch(/EXISTENCIA:3 {2}SOLICITADO:4/);
  });
});

describe("aplicarEfecto: regresos con efecto en existencia (4, 7)", () => {
  it.each([T.DEVOLUCION, T.TRANSFERENCIA_ORIGEN])("tipo %i", (tipo) => {
    expect(aplicarEfecto(tipo, ESTADOS.disponible, 2)).toEqual(estado(5, 5));
    expect(aplicarEfecto(tipo, ESTADOS.sinExistencia, 1)).toEqual(estado(1, 5));

    const noPrestado = error(() => aplicarEfecto(tipo, ESTADOS.completo, 1));
    expect(noPrestado.statusCode).toBe(400);
    expect(noPrestado.message).toMatch(/NO INDICA QUE ESTÉ PRESTADO/);

    const excede = error(() => aplicarEfecto(tipo, ESTADOS.disponible, 3));
    expect(excede.statusCode).toBe(400);
    expect(excede.message).toMatch(/SOBREPASA/);
  });
});

describe("aplicarEfecto: bajas por cantidad (5, 8, 13, 16, 17; decisión 19)", () => {
  const BAJAS = [T.BAJA_LEGADO, T.BAJA_JUSTIFICADA, T.BAJA_INJUSTIFICADA, T.BAJA_EN_INVENTARIO, T.BAJA_ADMINISTRADOR];

  it.each(BAJAS)("tipo %i: la baja de todas las unidades deja 0/0 y dado de baja", (tipo) => {
    for (const inicial of [ESTADOS.disponible, ESTADOS.completo, ESTADOS.sinExistencia]) {
      expect(aplicarEfecto(tipo, inicial, 5)).toEqual(estado(0, 0, D.BAJA));
    }
    expect(aplicarEfecto(tipo, estado(1, 1), 1)).toEqual(estado(0, 0, D.BAJA));
    expect(aplicarEfecto(tipo, estado(0, 1, D.NO_DISPONIBLE), 1)).toEqual(estado(0, 0, D.BAJA));
  });

  it.each(BAJAS)("tipo %i: un artículo sin existencias (0/0) se da de baja con cualquier cantidad", (tipo) => {
    expect(aplicarEfecto(tipo, ESTADOS.vacio, 3)).toEqual(estado(0, 0, D.BAJA));
  });

  it.each(BAJAS)("tipo %i: no se puede dar de baja más de lo que existe → 400", (tipo) => {
    const e = error(() => aplicarEfecto(tipo, ESTADOS.disponible, 6));
    expect(e.statusCode).toBe(400);
    expect(e.message).toMatch(/EXCEDE LA EXISTENCIA DEL ARTÍCULO \(5\)/);
  });

  it.each([T.BAJA_LEGADO, T.BAJA_JUSTIFICADA, T.BAJA_INJUSTIFICADA])("tipo %i (con proyecto) descuenta primero lo que está fuera del almacén", (tipo) => {
    expect(aplicarEfecto(tipo, ESTADOS.disponible, 1)).toEqual(estado(3, 4)); // 2 fuera → queda 1 fuera
    expect(aplicarEfecto(tipo, ESTADOS.disponible, 2)).toEqual(estado(3, 3));
    expect(aplicarEfecto(tipo, ESTADOS.disponible, 3)).toEqual(estado(2, 2)); // el excedente sale del almacén
    expect(aplicarEfecto(tipo, ESTADOS.sinExistencia, 2)).toEqual(estado(0, 3, D.NO_DISPONIBLE));
  });

  it.each([T.BAJA_EN_INVENTARIO, T.BAJA_ADMINISTRADOR])("tipo %i (sin proyecto) descuenta primero del almacén", (tipo) => {
    expect(aplicarEfecto(tipo, ESTADOS.disponible, 1)).toEqual(estado(2, 4));
    expect(aplicarEfecto(tipo, ESTADOS.disponible, 3)).toEqual(estado(0, 2, D.NO_DISPONIBLE));
    expect(aplicarEfecto(tipo, ESTADOS.disponible, 4)).toEqual(estado(0, 1, D.NO_DISPONIBLE)); // 3 del almacén + 1 de fuera
    expect(aplicarEfecto(tipo, ESTADOS.sinExistencia, 2)).toEqual(estado(0, 3, D.NO_DISPONIBLE));
    expect(unidadesFueraDeBajaLibre(tipo, ESTADOS.disponible, 1)).toBe(0);
    expect(unidadesFueraDeBajaLibre(tipo, ESTADOS.disponible, 4)).toBe(1);
    expect(unidadesFueraDeBajaLibre(tipo, ESTADOS.sinExistencia, 2)).toBe(2);
  });

  it("unidadesFueraDeBajaLibre es 0 para los demás tipos", () => {
    expect(unidadesFueraDeBajaLibre(T.BAJA_JUSTIFICADA, ESTADOS.sinExistencia, 2)).toBe(0);
  });
});

describe("aplicarEfecto: consumibles (expendables, decisión 18)", () => {
  const consumible = { consumible: true };

  it.each([T.PRESTAMO, T.RENTA_EXTERNA])("tipo %i: lo que sale se da por consumido (baja cantidad y cantidadAlmacen)", (tipo) => {
    expect(aplicarEfecto(tipo, ESTADOS.completo, 2, consumible)).toEqual(estado(3, 3));
    expect(aplicarEfecto(tipo, ESTADOS.completo, 5, consumible)).toEqual(estado(0, 0, D.NO_DISPONIBLE)); // nunca `baja`
    expect(error(() => aplicarEfecto(tipo, ESTADOS.completo, 6, consumible)).message).toMatch(/EXISTENCIA:5 {2}SOLICITADO:6/);
    expect(error(() => aplicarEfecto(tipo, ESTADOS.vacio, 1, consumible)).message).toMatch(/NO HAY EXISTENCIA DISPONIBLE/);
  });

  it("DEVOLUCIÓN (4): suma a ambas existencias sin exigir que esté prestado", () => {
    expect(aplicarEfecto(T.DEVOLUCION, ESTADOS.completo, 2, consumible)).toEqual(estado(7, 7));
    expect(aplicarEfecto(T.DEVOLUCION, ESTADOS.vacio, 1, consumible)).toEqual(estado(1, 1));
  });

  it("COMPRA (15): queda a nombre de la producción sin sumar existencias", () => {
    expect(aplicarEfecto(T.COMPRA, ESTADOS.vacio, 10, consumible)).toEqual(estado(0, 0, D.NO_DISPONIBLE));
    expect(aplicarEfecto(T.COMPRA, ESTADOS.completo, 10, consumible)).toEqual(estado(5, 5));
  });

  it("ALTA (14): suma existencias como en un producto regular", () => {
    expect(aplicarEfecto(T.ALTA, ESTADOS.vacio, 10, consumible)).toEqual(estado(10, 10));
  });

  it.each([T.TRANSFERENCIA_ORIGEN, T.TRANSFERENCIA_DESTINO])("tipo %i: los expendables no se transfieren → 400", (tipo) => {
    const e = error(() => aplicarEfecto(tipo, ESTADOS.completo, 1, consumible));
    expect(e.statusCode).toBe(400);
    expect(e.message).toMatch(/NO SE TRANSFIEREN/);
  });

  it.each([T.BAJA_JUSTIFICADA, T.BAJA_INJUSTIFICADA, T.BAJA_EN_INVENTARIO, T.BAJA_ADMINISTRADOR])("tipo %i: la baja descuenta del almacén", (tipo) => {
    expect(aplicarEfecto(tipo, ESTADOS.completo, 2, consumible)).toEqual(estado(3, 3));
    expect(aplicarEfecto(tipo, ESTADOS.completo, 5, consumible)).toEqual(estado(0, 0, D.BAJA));
    expect(aplicarEfecto(tipo, ESTADOS.vacio, 1, consumible)).toEqual(estado(0, 0, D.BAJA));
    expect(error(() => aplicarEfecto(tipo, ESTADOS.completo, 6, consumible)).statusCode).toBe(400);
  });
});

describe("revertirDeltas (deshacer bajas por cantidad y movimientos de consumibles)", () => {
  it("deltasEntre calcula el cambio con signo", () => {
    expect(deltasEntre(estado(5, 5), estado(3, 3))).toEqual({ cantidad: -2, cantidadAlmacen: -2 });
    expect(deltasEntre(estado(3, 5), estado(3, 4))).toEqual({ cantidad: 0, cantidadAlmacen: -1 });
  });

  it("seDeshaceConDeltas: bajas y consumibles con deltas guardados", () => {
    const d = { cantidad: -1, cantidadAlmacen: -1 };
    expect(seDeshaceConDeltas(T.BAJA_JUSTIFICADA, false, d)).toBe(true);
    expect(seDeshaceConDeltas(T.PRESTAMO, true, d)).toBe(true);
    expect(seDeshaceConDeltas(T.PRESTAMO, false, d)).toBe(false);
    expect(seDeshaceConDeltas(T.BAJA_JUSTIFICADA, false, null)).toBe(false); // bajas anteriores al plan 04
  });

  it("deshace el préstamo y la devolución de un consumible", () => {
    expect(revertirDeltas(T.PRESTAMO, estado(3, 3), { cantidad: -2, cantidadAlmacen: -2 })).toEqual(estado(5, 5));
    expect(revertirDeltas(T.PRESTAMO, estado(0, 0, D.NO_DISPONIBLE), { cantidad: -5, cantidadAlmacen: -5 })).toEqual(estado(5, 5));
    expect(revertirDeltas(T.DEVOLUCION, estado(7, 7), { cantidad: 2, cantidadAlmacen: 2 })).toEqual(estado(5, 5));
    expect(revertirDeltas(T.DEVOLUCION, estado(2, 2), { cantidad: 2, cantidadAlmacen: 2 })).toEqual(estado(0, 0, D.NO_DISPONIBLE));
  });

  it("409 si lo devuelto ya volvió a salir", () => {
    expect(error(() => revertirDeltas(T.DEVOLUCION, estado(1, 1), { cantidad: 2, cantidadAlmacen: 2 })).statusCode).toBe(409);
  });

  it("deshace una baja parcial y una total (que saca al artículo de `baja`)", () => {
    expect(revertirDeltas(T.BAJA_JUSTIFICADA, estado(3, 4), { cantidad: 0, cantidadAlmacen: -1 })).toEqual(estado(3, 5));
    expect(revertirDeltas(T.BAJA_EN_INVENTARIO, estado(0, 0, D.BAJA), { cantidad: -3, cantidadAlmacen: -5 })).toEqual(estado(3, 5));
    expect(revertirDeltas(T.BAJA_JUSTIFICADA, estado(0, 0, D.BAJA), { cantidad: 0, cantidadAlmacen: -1 })).toEqual(estado(0, 1, D.NO_DISPONIBLE));
  });

  it("un movimiento que no es baja no saca al artículo de `baja` → 409", () => {
    expect(error(() => revertirDeltas(T.PRESTAMO, estado(0, 0, D.BAJA), { cantidad: -1, cantidadAlmacen: -1 })).statusCode).toBe(409);
  });
});

describe("aplicarEfecto: inventarios y ajustes (6, 9, 10) no son movimientos (decisión 12)", () => {
  it.each([T.AJUSTE_INVENTARIO, T.INVENTARIO, T.AJUSTE_ADMINISTRADOR])("tipo %i se rechaza con 400", (tipo) => {
    for (const inicial of [ESTADOS.disponible, ESTADOS.completo, ESTADOS.sinExistencia, ESTADOS.baja]) {
      const e = error(() => aplicarEfecto(tipo, inicial, 1));
      expect(e.statusCode).toBe(400);
      expect(e.message).toMatch(/no es un movimiento de almacén/);
    }
  });
});

describe("revertirEfecto (deshacer por efecto inverso)", () => {
  it("son invertibles salidas, regresos, altas y administrativos; no lo son compras ni bajas", () => {
    for (const t of [3, 11, 12, 4, 7, 14, 2, 6, 9, 10]) expect(esInvertible(t)).toBe(true);
    for (const t of [1, 15, 5, 8, 13, 16, 17]) expect(esInvertible(t)).toBe(false);
  });

  it.each([T.PRESTAMO, T.RENTA_EXTERNA, T.TRANSFERENCIA_DESTINO])("tipo %i devuelve la existencia al almacén", (tipo) => {
    expect(revertirEfecto(tipo, estado(0, 5, D.NO_DISPONIBLE), 2)).toEqual(estado(2, 5));
    expect(error(() => revertirEfecto(tipo, ESTADOS.completo, 1)).statusCode).toBe(409);
  });

  it.each([T.DEVOLUCION, T.TRANSFERENCIA_ORIGEN])("tipo %i vuelve a sacar la existencia", (tipo) => {
    expect(revertirEfecto(tipo, ESTADOS.completo, 2)).toEqual(estado(3, 5));
    expect(revertirEfecto(tipo, ESTADOS.disponible, 3)).toEqual(estado(0, 5, D.NO_DISPONIBLE));
    expect(error(() => revertirEfecto(tipo, ESTADOS.disponible, 4)).statusCode).toBe(409);
  });

  it.each([T.ALTA, T.ALTA_LEGADO])("tipo %i resta de cantidad y cantidadAlmacen", (tipo) => {
    expect(revertirEfecto(tipo, estado(3, 3), 3)).toEqual(estado(0, 0, D.NO_DISPONIBLE));
    expect(revertirEfecto(tipo, estado(5, 8), 2)).toEqual(estado(3, 6));
    expect(error(() => revertirEfecto(tipo, estado(1, 3), 3)).statusCode).toBe(409);
  });

  it("los inventarios y ajustes antiguos se deshacen sin cambiar nada", () => {
    expect(revertirEfecto(T.INVENTARIO, ESTADOS.disponible, 9)).toEqual(ESTADOS.disponible);
    expect(revertirEfecto(T.AJUSTE_INVENTARIO, ESTADOS.disponible, 9)).toEqual(ESTADOS.disponible);
    expect(revertirEfecto(T.AJUSTE_ADMINISTRADOR, ESTADOS.disponible, 9)).toEqual(ESTADOS.disponible);
  });

  it("un artículo dado de baja no se modifica por efecto inverso (409) y un tipo no invertible es error interno", () => {
    expect(error(() => revertirEfecto(T.PRESTAMO, ESTADOS.baja, 1)).statusCode).toBe(409);
    expect(error(() => revertirEfecto(T.COMPRA, ESTADOS.disponible, 1)).statusCode).toBe(500);
  });
});
