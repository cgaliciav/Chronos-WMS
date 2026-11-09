import { escape } from "mysql2"; // mismo escape que mysql (sqlstring); mysql se retiró en la fase 4
import { SelectQueryBuilder } from "typeorm";
import { AppError } from "./errorClases";

/** Condición WHERE parametrizada lista para `qb.andWhere(sql, parametros)`. */
export interface FiltrosSql {
  sql: string;
  parametros: Record<string, unknown>;
}

export const SIN_FILTROS: FiltrosSql = { sql: "", parametros: {} };

/** `columna` o `alias.columna`: lo único que aceptamos en nombres de columna que vienen del cliente. */
const IDENTIFICADOR = /^[A-Za-z_][A-Za-z0-9_]*(\.[A-Za-z_][A-Za-z0-9_]*)?$/;

export const esIdentificadorSeguro = (valor: unknown): valor is string =>
  typeof valor === "string" && IDENTIFICADOR.test(valor);

/**
 * Devuelve `campo` si es un identificador SQL seguro; si viene vacío devuelve `porDefecto`;
 * si viene algo que no es un identificador lanza 400. Úsalo con `sortField`.
 */
export const columnaSegura = (campo: unknown, porDefecto: string): string => {
  if (campo === undefined || campo === null || campo === "") return porDefecto;
  if (Array.isArray(campo)) {
    // antd envía arreglos para columnas anidadas: ["operacion","proyecto","nombre"] → "proyecto.nombre"
    const ultimos = campo.slice(-2).join(".");
    if (esIdentificadorSeguro(ultimos)) return ultimos;
    throw new AppError(`Campo de orden inválido: ${campo.join(".")}`, 400);
  }
  if (esIdentificadorSeguro(campo)) return campo;
  throw new AppError(`Campo de orden inválido: ${String(campo)}`, 400);
};

export const direccionSegura = (sortOrder: unknown): "ASC" | "DESC" => (sortOrder === "descend" ? "DESC" : "ASC");

export interface OpcionesFiltros {
  /** Prefijo que se antepone a las llaves que no traen alias (p. ej. "usuario" → "usuario.nombre"). */
  alias?: string;
  /** Llaves tratadas como texto → `LIKE '%valor%'` con el ÚLTIMO valor del arreglo. */
  textuales?: RegExp;
  /** Llaves tratadas como rango → `BETWEEN v0 AND v1`. */
  fechas?: RegExp;
  /** Prefijo para los nombres de parámetro (evita colisiones si se combinan varios filtros). */
  prefijoParametro?: string;
  /**
   * Para llaves con tratamiento especial. Devuelve la condición (usando parámetros del mapa que recibe)
   * o `undefined` para aplicar el tratamiento normal.
   */
  especiales?: (llave: string, valores: unknown[], parametro: (valor: unknown) => string) => string | undefined;
}

const normalizarValores = (valor: unknown): unknown[] => (Array.isArray(valor) ? valor : [valor]);

/**
 * Convierte el objeto `filters` de las tablas de antd (`{ "usuario.nombre": ["ana"], "estatus": ["activo"] }`)
 * en una condición SQL **parametrizada**. Reemplaza a los `condicionesWhereAnd` que interpolaban texto.
 *
 * Reglas (las mismas que tenía el código original, ahora sin interpolación):
 * - llave que coincide con `textuales` (por defecto nombre|correo|barras|titulo) → `LIKE '%último valor%'`
 * - llave que coincide con `fechas` (por defecto fecha|vencimiento) → `BETWEEN v0 AND v1`
 * - cualquier otra → `IN (...valores)`
 * - valores `null`/`undefined` o arreglos vacíos se ignoran.
 * Las llaves deben ser identificadores (`col` o `alias.col`); de lo contrario se responde 400.
 * No muta `filters`.
 */
export const construirFiltros = (filters: unknown, opciones: OpcionesFiltros = {}): FiltrosSql => {
  if (!filters || typeof filters !== "object") return SIN_FILTROS;
  const {
    alias,
    textuales = /nombre|correo|barras|titulo/,
    fechas = /fecha|vencimiento/,
    prefijoParametro = "f",
    especiales,
  } = opciones;

  const condiciones: string[] = [];
  const parametros: Record<string, unknown> = {};
  let n = 0;
  const parametro = (valor: unknown) => {
    const nombre = `${prefijoParametro}${n++}`;
    parametros[nombre] = valor;
    return `:${nombre}`;
  };

  for (const llave of Object.keys(filters as object)) {
    const crudo = (filters as Record<string, unknown>)[llave];
    if (crudo === null || crudo === undefined) continue;
    const valores = normalizarValores(crudo).filter((v) => v !== null && v !== undefined);
    if (valores.length === 0) continue;

    if (!esIdentificadorSeguro(llave)) {
      throw new AppError(`Filtro inválido: ${llave}`, 400);
    }
    const columna = alias && !llave.includes(".") ? `${alias}.${llave}` : llave;

    const especial = especiales?.(llave, valores, parametro);
    if (especial !== undefined) {
      condiciones.push(especial);
    } else if (textuales.test(llave)) {
      condiciones.push(`${columna} LIKE ${parametro(`%${valores[valores.length - 1]}%`)}`);
    } else if (fechas.test(llave)) {
      if (valores.length < 2) continue;
      condiciones.push(`(${columna} BETWEEN ${parametro(valores[0])} AND ${parametro(valores[1])})`);
    } else {
      const nombre = `${prefijoParametro}${n++}`;
      parametros[nombre] = valores;
      condiciones.push(`${columna} IN (:...${nombre})`);
    }
  }

  return { sql: condiciones.join(" AND "), parametros };
};

/** Combina varias condiciones con AND. */
export const combinarFiltros = (...filtros: (FiltrosSql | string | undefined)[]): FiltrosSql => {
  const partes: string[] = [];
  const parametros: Record<string, unknown> = {};
  for (const f of filtros) {
    if (!f) continue;
    if (typeof f === "string") {
      if (f.length > 0) partes.push(f);
      continue;
    }
    if (f.sql.length > 0) partes.push(f.sql);
    Object.assign(parametros, f.parametros);
  }
  return { sql: partes.join(" AND "), parametros };
};

/** Aplica la condición al QueryBuilder (con AND) si no está vacía. */
export const aplicarFiltros = <T>(qb: SelectQueryBuilder<T>, filtros: FiltrosSql | string): SelectQueryBuilder<T> => {
  if (typeof filtros === "string") {
    if (filtros.length > 0) qb.andWhere(filtros);
    return qb;
  }
  if (filtros.sql.length > 0) qb.andWhere(filtros.sql, filtros.parametros);
  return qb;
};

/**
 * `IN (:...ids)` con un arreglo vacío es un error de sintaxis en MariaDB. Esta función añade la condición
 * solo si hay valores; con arreglo vacío añade `1=0` (ningún resultado), que es lo que significa "en ninguno".
 */
export const andWhereIn = <T>(qb: SelectQueryBuilder<T>, columna: string, valores: unknown[] | undefined, nombre: string) => {
  if (!esIdentificadorSeguro(columna)) throw new AppError(`Columna inválida: ${columna}`, 400);
  if (!valores || valores.length === 0) return qb.andWhere("1=0");
  const parametros: Record<string, unknown> = {};
  parametros[nombre] = valores;
  return qb.andWhere(`${columna} IN (:...${nombre})`, parametros);
};

/**
 * Literal SQL escapado con el driver (comillas incluidas). Úsalo SOLO donde MariaDB no admite parámetros
 * preparados, p. ej. `MATCH(...) AGAINST (${literalSeguro(texto)} IN BOOLEAN MODE)`.
 */
export const literalSeguro = (valor: string): string => escape(String(valor));

/**
 * Prepara un texto para `MATCH ... AGAINST (... IN BOOLEAN MODE)`: quita los operadores del modo booleano
 * (`+ - < > ( ) ~ " @`) que, desbalanceados, hacen fallar el analizador de MariaDB, y devuelve el literal
 * ya escapado. Devuelve `null` si no queda nada que buscar.
 */
export const textoBusquedaBooleana = (texto: unknown): string | null => {
  if (typeof texto !== "string") return null;
  const limpio = texto.replace(/[+\-<>()~"@]/g, " ").replace(/\s+/g, " ").trim();
  return limpio.length === 0 ? null : literalSeguro(limpio);
};
