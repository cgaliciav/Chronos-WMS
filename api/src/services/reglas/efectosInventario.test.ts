import { InventarioDisponible as D } from "../../entity/common/InventarioDisponible";
import { MovimientoTipoId as T } from "../../entity/common/MovimientoTipoId";
import { AppError } from "../../helpers/errorClases";
import { aplicarEfecto, esInvertible, EstadoInventario, revertirEfecto } from "./efectosInventario";

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

describe("aplicarEfecto: bajas (5, 8, 13, 16, 17)", () => {
  it.each([T.BAJA_LEGADO, T.BAJA_JUSTIFICADA, T.BAJA_INJUSTIFICADA, T.BAJA_EN_INVENTARIO, T.BAJA_ADMINISTRADOR])(
    "tipo %i deja todo en 0 y dado de baja, sea cual sea la cantidad",
    (tipo) => {
      for (const inicial of [ESTADOS.disponible, ESTADOS.completo, ESTADOS.sinExistencia, ESTADOS.vacio]) {
        expect(aplicarEfecto(tipo, inicial, 1)).toEqual(estado(0, 0, D.BAJA));
      }
    }
  );
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
