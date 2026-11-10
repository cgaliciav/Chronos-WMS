import { AppError } from "./errorClases";

/**
 * Convierte un id recibido del cliente a entero positivo o lanza 400. Necesario porque en TypeORM 0.2
 * `findOne(undefined)` devuelve la PRIMERA fila y un objeto como id se serializa como pares `clave='valor'`.
 */
export const idSeguro = (valor: unknown, nombre = "id"): number => {
  if (typeof valor === "number" && Number.isInteger(valor) && valor > 0) return valor;
  if (typeof valor === "string" && /^\d+$/.test(valor.trim())) {
    const n = Number(valor);
    if (n > 0) return n;
  }
  throw new AppError(`${nombre} inválido`, 400);
};

/** Igual que `idSeguro` pero admite `undefined`/`null` (devuelve `undefined`). */
export const idOpcional = (valor: unknown, nombre = "id"): number | undefined =>
  valor === undefined || valor === null || valor === "" ? undefined : idSeguro(valor, nombre);

/** Arreglo de ids seguros; `undefined` si no viene. */
export const idsSeguros = (valores: unknown, nombre = "ids"): number[] | undefined => {
  if (valores === undefined || valores === null) return undefined;
  if (!Array.isArray(valores)) throw new AppError(`${nombre} debe ser un arreglo`, 400);
  return valores.map((v, i) => idSeguro(v, `${nombre}[${i}]`));
};

/**
 * Parámetro de ruta como texto. Express 5 tipa `req.params` como `string | string[]` (por los comodines de
 * path-to-regexp 8); las rutas del API no usan comodines, así que siempre llega un texto.
 */
export const parametroOpcional = (req: { params: Record<string, string | string[] | undefined> }, nombre: string): string | undefined => {
  const valor = req.params?.[nombre];
  return Array.isArray(valor) ? valor.join("/") : valor;
};
export const parametro = (req: { params: Record<string, string | string[] | undefined> }, nombre: string): string =>
  parametroOpcional(req, nombre) ?? "";
