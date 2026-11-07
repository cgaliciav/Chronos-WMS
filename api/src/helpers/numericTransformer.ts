import { ValueTransformer } from "typeorm";

/**
 * Las columnas `numeric`/`decimal` llegan del driver como string ("5.0000"). Con este transformer
 * la entidad siempre expone `number` y evita errores como `"5.0000" + 5 === "5.00005"` (hallazgo H18/H21).
 * Úsalo así: `@Column({ type: "numeric", precision: 15, scale: 4, transformer: numericTransformer })`.
 */
export const numericTransformer: ValueTransformer = {
  to: (valor: number | string | null | undefined) => {
    if (valor === null || valor === undefined) return valor;
    const n = typeof valor === "number" ? valor : Number(valor);
    if (Number.isNaN(n)) throw new TypeError(`Valor numérico inválido: ${String(valor)}`);
    return n;
  },
  from: (valor: string | number | null | undefined) => {
    if (valor === null || valor === undefined) return valor;
    return typeof valor === "number" ? valor : Number(valor);
  },
};

export const aNumero = (valor: unknown, porDefecto = 0): number => {
  if (valor === null || valor === undefined || valor === "") return porDefecto;
  const n = Number(valor);
  return Number.isNaN(n) ? porDefecto : n;
};
