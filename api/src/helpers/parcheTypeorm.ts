/**
 * Parche de rendimiento para TypeORM 0.2 (plan 02 fase 4; se retira con TypeORM 1.x en la fase 6).
 *
 * `QueryBuilder.replacePropertyNames` reconstruye, en CADA consulta y para CADA alias, un mapa con todas las columnas
 * y relaciones de la entidad y una expresión regular con todas ellas escapadas. Con los listados del API (20-30 joins)
 * eso se llevaba la mayor parte de la CPU de cada petición (medido con --cpu-prof, docs/api/rendimiento.md).
 *
 * El mapa y la expresión solo dependen de los metadatos de la entidad y del prefijo del alias, así que aquí se
 * calculan una vez y se reutilizan. El SQL resultante es idéntico (src/test/parcheTypeorm.int.test.ts lo compara con
 * la implementación original sobre las consultas reales del API).
 */
import { QueryBuilder } from "typeorm";

type Entrada = { regex: RegExp; reemplazos: Record<string, string> } | null;

const prototipo = QueryBuilder.prototype as any;
const original: (statement: string) => string = prototipo.replacePropertyNames;
const cache = new WeakMap<object, Map<string, Entrada>>();

const escaparRegExp = (s: string) => s.replace(/[.*+\-?^${}()|[\]\\]/g, "\\$&");

/** Mismo orden de prioridad que TypeORM 0.2.45: lo último que se asigna gana. */
const construir = (metadata: any, prefijo: string): Entrada => {
  const reemplazos: Record<string, string> = {};
  for (const relacion of metadata.relations) {
    if (relacion.joinColumns.length > 0) reemplazos[relacion.propertyPath] = relacion.joinColumns[0].databaseName;
  }
  for (const relacion of metadata.relations) {
    for (const joinColumn of [...relacion.joinColumns, ...relacion.inverseJoinColumns]) {
      reemplazos[`${relacion.propertyPath}.${joinColumn.referencedColumn.propertyPath}`] = joinColumn.databaseName;
    }
  }
  for (const columna of metadata.columns) reemplazos[columna.databaseName] = columna.databaseName;
  for (const columna of metadata.columns) reemplazos[columna.propertyName] = columna.databaseName;
  for (const columna of metadata.columns) reemplazos[columna.propertyPath] = columna.databaseName;
  const llaves = Object.keys(reemplazos);
  if (llaves.length === 0) return null;
  const regex = new RegExp(
    "([ =(]|^.{0})" + `${escaparRegExp(prefijo)}(${llaves.map(escaparRegExp).join("|")})` + "(?=[ =),]|.{0}$)",
    "gm"
  );
  return { regex, reemplazos };
};

function replacePropertyNamesConCache(this: any, statement: string): string {
  for (const alias of this.expressionMap.aliases) {
    if (!alias.hasMetadata) continue;
    const conPrefijo = this.expressionMap.aliasNamePrefixingEnabled;
    const prefijo = conPrefijo ? `${alias.name}.` : "";
    const prefijoReemplazo = conPrefijo ? `${this.escape(alias.name)}.` : "";
    let porMetadata = cache.get(alias.metadata);
    if (porMetadata === undefined) {
      porMetadata = new Map();
      cache.set(alias.metadata, porMetadata);
    }
    let entrada = porMetadata.get(prefijo);
    if (entrada === undefined) {
      entrada = construir(alias.metadata, prefijo);
      porMetadata.set(prefijo, entrada);
    }
    if (entrada === null) continue;
    const { regex, reemplazos } = entrada;
    statement = statement.replace(regex, (_: string, pre: string, p: string) => `${pre}${prefijoReemplazo}${this.escape(reemplazos[p])}`);
  }
  return statement;
}

export const aplicarParcheTypeorm = () => {
  prototipo.replacePropertyNames = replacePropertyNamesConCache;
};

/** Solo para las pruebas de equivalencia. */
export const quitarParcheTypeorm = () => {
  prototipo.replacePropertyNames = original;
};

export const parcheTypeormActivo = () => prototipo.replacePropertyNames === replacePropertyNamesConCache;
