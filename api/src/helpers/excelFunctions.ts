import { Table, Workbook, Worksheet } from "exceljs";
import { randomInt } from "crypto";
import { readFile } from "fs/promises";
import { LOGO_REPORTES_POR_DEFECTO } from "../recursos/logoReportes";
import { performance } from "perf_hooks";
import { Brackets, SelectQueryBuilder, In } from "typeorm";
import { AppDataSource } from "../data-source";
import { idSeguro } from "./ids";
import { AppError } from "./errorClases";
import { aplicarFiltros, columnaSegura, direccionSegura } from "./filtrosTabla";
import { MovimientoTipoId as T } from "../entity/common/MovimientoTipoId";
import {
  condicionesWhereAnd as condicionesWhereAndGrupo,
  condicionesWhereAndPrestamosActivos,
  funcionQueryListadoMovimientos,
  funcionQueryListadoPrestamosPendientes,
} from "../controllers/Grupo.Controller";
import { Archivo } from "../entity/Archivo";
import { Area } from "../entity/Area";
import { Grupo } from "../entity/Grupo";
import { Movimiento } from "../entity/Movimiento";
import { Proyecto } from "../entity/Proyecto";
import { Usuario } from "../entity/Usuario";
import sharp, { Sharp } from "sharp";
import { logger } from "./logger";

/**
 * Sufijo único del nombre de un reporte: milisegundos + 3 cifras aleatorias. Antes `Math.random() * 1e6`, que podía
 * repetirse y sobrescribir el reporte de otra persona (hallazgo L11).
 */
const idArchivo = () => `${Date.now()}${String(randomInt(1000)).padStart(3, "0")}`;

/** Nombre del proyecto del reporte; 404 si no existe (antes un TypeError al leer `.nombre` de `null`). */
const nombreProyecto = async (proyectoId: unknown) => {
  const proyecto = await AppDataSource.getRepository(Proyecto).findOne({
    where: { id: idSeguro(proyectoId, "proyectoId") },
    select: { id: true, nombre: true },
    loadEagerRelations: false,
  });
  if (!proyecto) throw new AppError("Proyecto no encontrado", 404);
  return proyecto.nombre;
};

/**
 * Logo de los reportes. Alternativa temporal (plan 03, fase 0, paso 3; se retira en la fase 5): si existe el logo
 * histórico del cliente en `ARCHIVOS_AUXILIARES`, se sigue usando para no cambiar sus reportes antes de cargar su
 * marca por configuración. Si no, el de Chronos WMS empaquetado en el código.
 */
const LOGO_HISTORICO = "sony-tv-logo.jpg";
const logoReportes = async (): Promise<{ buffer: any; extension: "jpeg" | "png" }> => {
  const historico = `${process.env.ARCHIVOS_AUXILIARES ?? ""}${LOGO_HISTORICO}`;
  try {
    return { buffer: await readFile(historico), extension: "jpeg" };
  } catch {
    return { buffer: LOGO_REPORTES_POR_DEFECTO, extension: "png" }; // tipos de exceljs vs @types/node
  }
};

function compareStringsIgnoreAccents(str1: string, str2: string): boolean {
  if (!str1 || !str2) {
    return false;
  }
  return str1.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() ===
    str2.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

interface columnasExcel {
  titulo: string;
  letra: "font7" | "font8" | "font10" | "font12" | "font14";
  ancho: number;
  tipo: "fecha" | "general" | "precio" | "total";
  filtro?: boolean;
  total?:
  | "none"
  | "average"
  | "countNums"
  | "count"
  | "max"
  | "min"
  | "stdDev"
  | "var"
  | "sum"
  | "custom";
  formulaTotal?: string;
}

const font8 = {
  name: "Calibri",
  size: 8,
  color: { theme: 1 },
};
const font7 = {
  name: "Calibri",
  size: 7,
  color: { theme: 1 },
};
const font10 = {
  name: "Calibri",
  size: 10,
  color: { theme: 1 },
};
const font12 = {
  name: "Calibri",
  size: 12,
  color: { theme: 1 },
};
const font14 = {
  name: "Calibri",
  size: 14,
  color: { theme: 1 },
};

const letras = {
  font8,
  font7,
  font10,
  font12,
  font14,
};

const columnasDetalleResumen: columnasExcel[] = [
  {
    titulo: "No.",
    letra: "font8",
    ancho: 5.14,
    tipo: "general",
    filtro: false,
  },
  {
    titulo: "OPERACION",
    letra: "font8",
    ancho: 20.50,
    tipo: "general",
    filtro: true,
  },
  {
    titulo: "CANT. OPS.",
    letra: "font8",
    ancho: 12.50,
    tipo: "general",
    filtro: true,
  },
  {
    titulo: "TOTAL",
    letra: "font8",
    ancho: 18.50,
    tipo: "total",
    filtro: true,
    total: "sum",
  },

]


const columnasDetallePorProyecto: columnasExcel[] = [
  {
    titulo: "No.",
    letra: "font8",
    ancho: 5.14,
    tipo: "general",
    filtro: false,
  },
  {
    titulo: "FOTOGRAFÍA",
    letra: "font8",
    ancho: 10.71,
    tipo: "general",
    filtro: false,
  },
  {
    titulo: "CÓDIGO",
    letra: "font8",
    ancho: 9.50,
    tipo: "general",
    filtro: true,
  },
  {
    titulo: "ARTÍCULO",
    letra: "font8",
    ancho: 10.6,
    tipo: "general",
    filtro: true,
  },
  {
    titulo: "DESCRIPCIÓN",
    letra: "font7",
    ancho: 39.91,
    tipo: "general",
    filtro: true,
  },
  {
    titulo: "AREA",
    letra: "font8",
    ancho: 16.14,
    tipo: "general",
    filtro: true,
  },
  {
    titulo: "TOTAL",
    letra: "font8",
    ancho: 8.55,
    tipo: "total",
    filtro: true,
    total: "sum",
  },
  {
    titulo: "RESPONSABLES",
    letra: "font8",
    ancho: 13.82,
    tipo: "general",
    filtro: true,
  },
  {
    titulo: "FECHA",
    letra: "font8",
    ancho: 11.82,
    tipo: "fecha",
    filtro: true,
  },

]

const columnasDetallePorProyectoFotoGrande: columnasExcel[] = [
  {
    titulo: "No.",
    letra: "font8",
    ancho: 5.14,
    tipo: "general",
    filtro: false,
  },
  {
    titulo: "FOTOGRAFÍA",
    letra: "font8",
    ancho: 26.0,
    tipo: "general",
    filtro: false,
  },
  {
    titulo: "CÓDIGO",
    letra: "font8",
    ancho: 9.50,
    tipo: "general",
    filtro: true,
  },
  {
    titulo: "ARTÍCULO",
    letra: "font8",
    ancho: 10.6,
    tipo: "general",
    filtro: true,
  },
  {
    titulo: "DESCRIPCIÓN",
    letra: "font7",
    ancho: 39.91,
    tipo: "general",
    filtro: true,
  },
  {
    titulo: "TOTAL",
    letra: "font8",
    ancho: 8.55,
    tipo: "total",
    filtro: true,
    total: "sum",
  },
  {
    titulo: "RESPONSABLES",
    letra: "font8",
    ancho: 13.82,
    tipo: "general",
    filtro: true,
  },
  {
    titulo: "FECHA",
    letra: "font8",
    ancho: 11.82,
    tipo: "fecha",
    filtro: true,
  },

]


const columnasDetalleGrupo: columnasExcel[] = [
  {
    titulo: "No.",
    letra: "font8",
    ancho: 5.14,
    tipo: "general",
    filtro: false,
  },
  {
    titulo: "FOTOGRAFÍA",
    letra: "font8",
    ancho: 10.71,
    tipo: "general",
    filtro: false,
  },
  {
    titulo: "CÓDIGO",
    letra: "font8",
    ancho: 9.50,
    tipo: "general",
    filtro: true,
  },
  {
    titulo: "ARTÍCULO",
    letra: "font8",
    ancho: 10.6,
    tipo: "general",
    filtro: true,
  },
  {
    titulo: "DESCRIPCIÓN",
    letra: "font7",
    ancho: 39.91,
    tipo: "general",
    filtro: true,
  },
  {
    titulo: "AREA",
    letra: "font8",
    ancho: 16.14,
    tipo: "general",
    filtro: true,
  },
  {
    titulo: "ALMACÉN",
    letra: "font8",
    ancho: 20.29,
    tipo: "general",
    filtro: true,
  },
  {
    titulo: "ALMACENISTA",
    letra: "font8",
    ancho: 20.29,
    tipo: "general",
    filtro: true,
  },
  {
    titulo: "OPERACION",
    letra: "font8",
    ancho: 20.29,
    tipo: "general",
    filtro: true,
  },
  {
    titulo: "PROYECTO",
    letra: "font8",
    ancho: 20.29,
    tipo: "general",
    filtro: true,
  },
  {
    titulo: "TOTAL",
    letra: "font8",
    ancho: 13.29,
    tipo: "total",
    filtro: true,
    total: "sum",
  },
  {
    titulo: "RESPONSABLES",
    letra: "font8",
    ancho: 25.29,
    tipo: "general",
    filtro: true,
  },
  {
    titulo: "FECHA",
    letra: "font8",
    ancho: 16.29,
    tipo: "fecha",
    filtro: true,
  },
  {
    titulo: "NOTAS / COMENTARIOS",
    letra: "font8",
    ancho: 30.29,
    tipo: "general",
    filtro: true,
  },
];

const columnasDetalleGrupoCompras: columnasExcel[] = [
  ...columnasDetalleGrupo.slice(0, columnasDetalleGrupo.length - 1),
  {
    titulo: "PROVEEDOR",
    letra: "font8",
    ancho: 20.29,
    tipo: "general",
    filtro: true,
  },
  {
    titulo: "FACTURA",
    letra: "font8",
    ancho: 20.29,
    tipo: "general",
    filtro: true,
  },
  {
    titulo: "# FAC",
    letra: "font8",
    ancho: 20.29,
    tipo: "general",
    filtro: true,
  },
  {
    titulo: "FECHA FAC",
    letra: "font8",
    ancho: 16.29,
    tipo: "fecha",
    filtro: true,
  },
  ...columnasDetalleGrupo.slice(-1),
];

function mergeCellsAndInsertData(sheet: Worksheet, rangeXls: string, data: string) {
  sheet.mergeCells(rangeXls);
  const rangeInit = rangeXls.split(':')[0];

  const cell = sheet.getCell(rangeInit);
  cell.font = font8;
  cell.value = data;
  cell.alignment = {
    wrapText: true,
    vertical: "middle",
    horizontal: "center",
  }
}


// ── Renglones de las tablas (hallazgo L11: antes 5 mapeos y 5 "agregarDatos" casi idénticos) ──────────────────

/** Clave de barras más reciente del producto. */
const claveReciente = (item: Movimiento) =>
  item.inventarioActual.producto.productoClaves[item.inventarioActual.producto.productoClaves.length - 1].barras;

/** Precio original (tipo 2, decisión 13) × cantidad. */
const totalPrecioOriginal = (item: Movimiento) =>
  +item.inventarioActual.producto?.productoPrecios[
    item.inventarioActual.producto.productoPrecios?.findIndex((pp) => pp.precioTipo.id === 2)
  ]?.precio * item.cantidad;

const responsables = (item: Movimiento) => item.operacion?.usuarios?.map((usr) => usr.nombre).join("\n");

/** Comentarios del movimiento y de su grupo. */
const comentarios = (item: Movimiento) =>
  item.operacion?.comentarios?.map((com) => com.comentario).join("\n") +
  "\n" +
  item.grupos[0]?.comentarios?.map((com) => com.comentario).join("\n");

/** Factura en dólares (tipo de factura 4): va en la hoja USD del reporte de compras. */
const esFacturaUSD = (item: Movimiento) => item.grupos[0]?.grupoDetalle?.facturaDetalle?.facturaTipo?.id === 4;

// Celdas de exceljs (texto, número, fecha o vacío); `any` como los mapeos anteriores.
type Renglones = (resultados: Movimiento[], saltar: number) => any[][];

/** Reportes por grupo y por proyecto: n.º, foto, clave, artículo, descripción, área, total, responsables, fecha. */
const obtenerRenglonesMovimientoProyecto: Renglones = (resultados, saltar) =>
  resultados.map((item, idx) => [
    idx + 1 + saltar,
    "",
    claveReciente(item),
    item.inventarioActual.producto.titulo,
    item.inventarioActual.producto.descripcion.trim(),
    item.inventarioActual.producto.area?.nombre,
    totalPrecioOriginal(item),
    responsables(item),
    item.operacion?.fecha,
  ]);

/** Igual que `obtenerRenglonesMovimientoProyecto` sin la columna de área (la foto grande ocupa su lugar). */
const obtenerRenglonesMovimientoProyectoFotoGrande: Renglones = (resultados, saltar) =>
  obtenerRenglonesMovimientoProyecto(resultados, saltar).map((fila) => fila.filter((_, columna) => columna !== 5));

/** Columnas comunes de los reportes con detalle (préstamos activos y compras). */
const columnasDetalle = (item: Movimiento, numero: number) => [
  numero,
  "",
  claveReciente(item),
  item.inventarioActual.producto.titulo,
  item.inventarioActual.producto.descripcion.trim(),
  item.inventarioActual.producto.area?.nombre,
  item.inventarioActual.bodega?.nombre, // almacén
  item.sesion?.usuario?.nombre, // almacenista
  item.operacion?.movimientoTipo?.nombre,
  item.operacion?.proyecto?.nombre,
  totalPrecioOriginal(item),
  responsables(item),
  item.operacion?.fecha,
];

const obtenerRenglonesMovimiento: Renglones = (resultados, saltar) =>
  resultados.map((item, idx) => [...columnasDetalle(item, idx + 1 + saltar), comentarios(item)]);

/** Compras de una moneda: las de la otra se omiten, pero el número de renglón cuenta todas (como antes). */
const obtenerRenglonesCompras = (usd: boolean): Renglones => (resultados, saltar) =>
  resultados
    .map((item, idx) => {
      if (esFacturaUSD(item) !== usd) return null;
      const factura = item.grupos[0]?.grupoDetalle?.facturaDetalle;
      return [
        ...columnasDetalle(item, idx + 1 + saltar),
        factura?.proveedor?.nombre,
        factura?.facturaTipo?.nombre,
        factura?.numero,
        factura?.fechaEmision,
        comentarios(item),
      ];
    })
    .filter((it): it is any[] => it !== null);

const obtenerRenglonesMovimientoCompras = obtenerRenglonesCompras(false);
const obtenerRenglonesMovimientoComprasUSD = obtenerRenglonesCompras(true);

/** Añade a la tabla la página `[saltar, saltar + tomar)` de la consulta. Devuelve si puede haber más. */
const agregarDatosRenglones = async (
  tbl: Table,
  query: SelectQueryBuilder<Movimiento>,
  saltar: number,
  tomar: number,
  renglones: Renglones
) => {
  const resultados = await query.take(tomar).skip(saltar).getMany();
  renglones(resultados, saltar).forEach((fila, idx) => tbl.addRow(fila, saltar + idx));
  tbl.commit();
  return resultados.length === tomar;
};

/** Compras: cada moneda en su tabla; la numeración sigue la de la tabla (filas que ya tiene). */
const agregarDatosRenglonesCompras = async (
  tbl: Table,
  query: SelectQueryBuilder<Movimiento>,
  saltar: number,
  tomar: number,
  usd: boolean
) => {
  const resultados = await query.take(tomar).skip(saltar).getMany();
  const saltoTabla = tbl.rows?.length ?? saltar;
  obtenerRenglonesCompras(usd)(resultados, saltoTabla).forEach((fila) => tbl.addRow(fila));
  tbl.commit();
  return resultados.length === tomar;
};

const configurarHojaExcel = async (
  sheet: Worksheet,
  columnas: columnasExcel[]
) => {

  for (let index = 1; index <= columnas.length; index++) {
    sheet.getColumn(index).font = letras[columnas[index - 1].letra];
    sheet.getColumn(index).alignment = {
      wrapText: true,
      vertical: "middle",
      horizontal: "center",
    };
    sheet.getColumn(index).width = columnas[index - 1].ancho;
    if (columnas[index - 1].tipo === "fecha") {
      sheet.getColumn(index).numFmt = "dd/mmm/yyyy hh:mm";
    } else if (
      columnas[index - 1].tipo === "precio" ||
      columnas[index - 1].tipo === "total"
    ) {
      sheet.getColumn(index).numFmt = '"$"#,##0.00';
    }
  }
  sheet.pageSetup.margins = {
    top: 1.9 / 2.54, //4.8
    left: 0.6 / 2.54, //1.5
    right: 0.6 / 2.54, //
    bottom: 1.9 / 2.54,
    header: 0.8 / 2.54,
    footer: 0.8 / 2.54
  }
};

const agregarTituloHojaExcel = async (
  sheet: Worksheet,
  workbook: Workbook,
  numCeldas: number,
  titulo: string
) => {
  const row = sheet.getRow(1);

  try {
    row.height = 32.25;
    sheet.mergeCells(1, 1, 1, numCeldas);
    const cell = row.getCell(1);
    const font12 = {
      name: "Calibri",
      size: 12,
      bold: true,
      color: { theme: 1 },
    };
    cell.font = font12;
    cell.value = titulo;

    const img = workbook.addImage(await logoReportes());

    sheet.addImage(img, {
      editAs: "absolute",
      tl: { col: 0, row: 0 },
      ext: { width: 73, height: 38 },
    });
  } catch (error) {
    logger.error(error);
  } finally {
  }
};

const agregarTabla = async (
  sheet: Worksheet,
  columnas: columnasExcel[],
  ref: string,
  valoresIniciales: (string | number | Date)[][],
  theme: string = "TableStyleMedium15"
) => {
  const tbl = sheet.addTable({
    name: `T-${Date.now().toString()}`,
    ref,
    headerRow: true,
    totalsRow: true,
    style: {
      theme: theme as ('TableStyleDark1' | 'TableStyleDark10' | 'TableStyleDark11' | 'TableStyleDark2' | 'TableStyleDark3' | 'TableStyleDark4' | 'TableStyleDark5' | 'TableStyleDark6' | 'TableStyleDark7' | 'TableStyleDark8' | 'TableStyleDark9' | 'TableStyleLight1' | 'TableStyleLight10' | 'TableStyleLight11' | 'TableStyleLight12' | 'TableStyleLight13' | 'TableStyleLight14' | 'TableStyleLight15' | 'TableStyleLight16' | 'TableStyleLight17' | 'TableStyleLight18' | 'TableStyleLight19' | 'TableStyleLight2' | 'TableStyleLight20' | 'TableStyleLight21' | 'TableStyleLight3' | 'TableStyleLight4' | 'TableStyleLight5' | 'TableStyleLight6' | 'TableStyleLight7' | 'TableStyleLight8' | 'TableStyleLight9' | 'TableStyleMedium1' | 'TableStyleMedium10' | 'TableStyleMedium11' | 'TableStyleMedium12' | 'TableStyleMedium13' | 'TableStyleMedium14' | 'TableStyleMedium15' | 'TableStyleMedium16' | 'TableStyleMedium17' | 'TableStyleMedium18' | 'TableStyleMedium19' | 'TableStyleMedium2' | 'TableStyleMedium20' | 'TableStyleMedium21' | 'TableStyleMedium22' | 'TableStyleMedium23' | 'TableStyleMedium24' | 'TableStyleMedium25' | 'TableStyleMedium26' | 'TableStyleMedium27' | 'TableStyleMedium28' | 'TableStyleMedium3' | 'TableStyleMedium4' | 'TableStyleMedium5' | 'TableStyleMedium6' | 'TableStyleMedium7' | 'TableStyleMedium8' | 'TableStyleMedium9'),
      showRowStripes: true,
    },
    columns: columnas.map((it) => ({
      name: it.titulo,
      filterButton: it.filtro || false,
      totalsRowFunction: it.total || "none",
      totalsRowFormula: it.formulaTotal || "",
      totalsRowLabel: "",
    })),
    rows: valoresIniciales,
  });

  return tbl;
};


/** Tamaño y posición de la foto en los reportes normales y de foto grande. */
const FOTO_NORMAL = { redimensionar: (s: Sharp) => s.resize(64, 64), tl: { col: 1.15, dy: 3.35 }, ext: 60, alturaFila: 82.5 };
const FOTO_GRANDE = { redimensionar: (s: Sharp) => s.resize(400, null, { fit: "inside" }), tl: { col: 1.08, dy: 3.1 }, ext: 180, alturaFila: 220.5 };

/** Inserta la foto más reciente de cada artículo de la página `[saltar, saltar + tomar)`. Devuelve si puede haber más. */
const agregarImagenesMovimiento = async (
  sheet: Worksheet,
  workbook: Workbook,
  query: SelectQueryBuilder<Movimiento>,
  saltar: number,
  tomar: number,
  foto: typeof FOTO_NORMAL = FOTO_NORMAL
) => {
  const articulos = await query.take(tomar).skip(saltar).getMany();
  let rowInc = 0 + saltar;
  for (const item of articulos) {
    if (item.inventarioActual.producto.archivos.length > 0) {
      const itemFile = item.inventarioActual.producto.archivos.sort((a, b) => a.id - b.id).pop();
      if (!itemFile) continue;
      const file = await AppDataSource.getRepository(Archivo).findOneBy({ id: itemFile.id });
      if (file == null) continue;
      const idImage = workbook.addImage({
        buffer: (await foto.redimensionar(sharp(file.data)).withMetadata().toFormat("jpeg").toBuffer()) as any, // tipos de exceljs vs @types/node
        extension: "jpeg",
      });
      sheet.addImage(idImage, {
        editAs: "",
        tl: { col: foto.tl.col, row: rowInc + foto.tl.dy },
        ext: { width: foto.ext, height: foto.ext },
      });
    }
    sheet.getRow(rowInc + 4).height = foto.alturaFila;
    rowInc++;
  }
  return articulos.length === tomar;
};

const agregarImagenesMovimientoCompra = async (
  sheet: Worksheet,
  sheetUSD: Worksheet,
  workbook: Workbook,
  query: SelectQueryBuilder<Movimiento>,
  saltar: number,
  tomar: number,
  renMXP: number,
  renUSD: number
): Promise<[boolean, number, number]> => {
  const articulos = await query.take(tomar).skip(saltar).getMany();
  for (const item of articulos) {
    if (item.inventarioActual.producto.archivos.length > 0) {
      // GET THE LATEST FILE BASE ON ITS ID
      const itemFile = item.inventarioActual.producto.archivos.sort((a, b) => a.id - b.id).pop();
      if (!itemFile) continue;
      const file = await AppDataSource.getRepository(Archivo).findOneBy({ id: itemFile.id });

      if (file == null) continue;
      const idImage = workbook.addImage({
        buffer: (await sharp(file.data).resize(64, 64).withMetadata().toFormat('jpeg').toBuffer()) as any, // tipos de exceljs vs @types/node 22
        extension: "jpeg",
      });

      if (esFacturaUSD(item)) {
        sheetUSD.addImage(idImage, {
          editAs: "",
          tl: { col: 1.15, row: renUSD + 3.35 },
          ext: { width: 60, height: 60 },
        });
        renUSD++;
      } else {
        sheet.addImage(idImage, {
          editAs: "",
          tl: { col: 1.15, row: renMXP + 3.35 },
          ext: { width: 60, height: 60 },
        });
      }

      sheet.getRow(renMXP + 4).height = 60;
      renMXP++;
    }
  }

  return [articulos.length === tomar, renMXP, renUSD];
};

async function agregarHojaMovimientos(
  workbook: Workbook, reportTitle: string, sheetTitle: string, conFoto: boolean,
  movementsParams: {
    areasId?: number[],
    bodegasId?: number[],
    proyectosId: number[],
    fechaInicio?: Date,
    fechaFin?: Date,
    tiposMovimientosId: number[],
    usuariosIds?: number[],
    filters?: any,
    campoOrden?: string | string[],
    direccion?: string
  },
  t0: number
) {
  const { areasId, bodegasId, proyectosId, tiposMovimientosId,
    usuariosIds, filters, campoOrden = 'movimiento.id', direccion = 'DESC'
  } = movementsParams;


  const qry = funcionQueryListadoMovimientos().where(
    "proyecto.id IN (:...proyectosId) and movimientoTipo.id IN (:...tiposMovimientosId)",
    { proyectosId, tiposMovimientosId }
  );

  if ((usuariosIds?.length ?? 0) > 0) {
    qry.andWhere(
      new Brackets((qb) =>
        qb
          .where("operacionUsuarios.id in (:...usuariosIds)", { usuariosIds })
          .orWhere("usuario.id in (:...usuariosIds)", { usuariosIds })
      )
    );
  }
  if ((areasId?.length ?? 0) > 0) {
    qry.andWhere("area.id in (:...areasId)", { areasId });
  }
  if ((bodegasId?.length ?? 0) > 0) {
    qry.andWhere("bodega.id in (:...bodegasIds)", { bodegasIds: bodegasId }); // antes :bodegasIds vs bodegasId (hallazgo H11)
  }

  if (filters) {
    aplicarFiltros(qry, condicionesWhereAndGrupo(filters));
  }

  qry.orderBy(columnaSegura(campoOrden, "movimiento.id"), direccionSegura(direccion === "DESC" ? "descend" : direccion === "ASC" ? "ascend" : direccion));

  const qryResultados = qry.clone();

  logger.debug('---------- qry', qry.getSql());


  const valoresIniciales = obtenerRenglonesMovimientoProyecto(await qry.take(50).getMany(), 0);
  if (valoresIniciales.length === 0) return { totalPrecio: 0, totalRegistros: 0 };


  const sheet = workbook.addWorksheet(sheetTitle);

  logger.debug(`---------- agregarHojaMovimientos ${reportTitle} ${sheetTitle}: `, performance.now() - t0);
  await configurarHojaExcel(sheet, columnasDetallePorProyecto);

  await agregarTituloHojaExcel(
    sheet,
    workbook,
    columnasDetallePorProyecto.length,
    reportTitle
  );

  logger.debug(`---------- agregarRenglones init ${reportTitle} ${sheetTitle}: `, performance.now() - t0);
  const tbl = await agregarTabla(
    sheet,
    columnasDetallePorProyecto,
    "A3",
    valoresIniciales
  );

  let incRenglones = 0;

  while (
    await agregarDatosRenglones(tbl, qry, 50 + incRenglones * 50, 50, obtenerRenglonesMovimientoProyecto)
  ) {
    logger.debug(
      `agregarDatosRenglones. ${incRenglones} Regs:${50 + incRenglones * 50}-${50 + incRenglones * 50 + 50
      }......${reportTitle}.........`, performance.now() - t0
    );
    incRenglones++;
  }

  if (conFoto) {
    let incImagenes = 0;
    while (
      await agregarImagenesMovimiento(
        sheet,
        workbook,
        qry,
        50 * incImagenes,
        50
      )
    ) {
      logger.debug(
        `agregarDatosRenglones. ${incImagenes}.....${reportTitle}..........`,
        performance.now() - t0
      );
      incImagenes++;
    }
  }

  // para obtener el total de registros y el total de precios
  qryResultados.andWhere("precioTipo.id = 2")
    .select("productoPrecios.precio", "tPrecio")
    .addSelect("movimiento.id", "tId");

  const resulQry = AppDataSource.createQueryBuilder()
    .select("SUM(listing.tPrecio)", "totalPrecio")
    .addSelect("COUNT(listing.tId)", "totalRegistros")
    .from("(" + qryResultados.getQuery() + ")", "listing")
    .setParameters(qryResultados.getParameters())

  const resultados = await resulQry.getRawOne();

  logger.debug('------------- resultados', resultados);

  return resultados as {
    totalPrecio: number,
    totalRegistros: number
  };


}

async function agregarHojaPrestamosActivos(
  workbook: Workbook, reportTitle: string, sheetTitle: string, conFoto: boolean,
  movementsParams: {
    areasId?: number[],
    bodegasId?: number[],
    proyectosId: number[],
    fechaInicio?: Date,
    fechaFin?: Date,
    tiposMovimientosId: number[],
    usuariosIds?: number[],
    filters?: any,
    campoOrden?: string | string[],
    direccion?: string
  },
  t0: number
) {
  const { areasId = [], bodegasId = [], proyectosId,
    usuariosIds = [], filters, campoOrden = 'movimiento.id', direccion = 'DESC'
  } = movementsParams;


  const qry = funcionQueryListadoPrestamosPendientes(
    proyectosId[0],
    usuariosIds,
    areasId,
    bodegasId
  );

  if (filters) {
    aplicarFiltros(qry, condicionesWhereAndPrestamosActivos(filters));
  }

  qry.orderBy(columnaSegura(campoOrden, "movimiento.id"), direccionSegura(direccion === "DESC" ? "descend" : direccion === "ASC" ? "ascend" : direccion));

  const qryResultados = qry.clone();


  const valoresIniciales = obtenerRenglonesMovimientoProyecto(await qry.take(50).getMany(), 0);
  if (valoresIniciales.length === 0) return { totalPrecio: 0, totalRegistros: 0 };


  const sheet = workbook.addWorksheet(sheetTitle);

  logger.debug(`---------- agregarHojaPrestamosActivos ${reportTitle} ${sheetTitle}: `, performance.now() - t0);
  await configurarHojaExcel(sheet, columnasDetallePorProyecto);

  await agregarTituloHojaExcel(
    sheet,
    workbook,
    columnasDetallePorProyecto.length,
    reportTitle
  );

  logger.debug(`---------- agregarRenglones init ${reportTitle} ${sheetTitle}: `, performance.now() - t0);
  const tbl = await agregarTabla(
    sheet,
    columnasDetallePorProyecto,
    "A3",
    valoresIniciales
  );

  let incRenglones = 0;

  while (
    await agregarDatosRenglones(tbl, qry, 50 + incRenglones * 50, 50, obtenerRenglonesMovimientoProyecto)
  ) {
    logger.debug(
      `agregarDatosRenglones. ${incRenglones} Regs:${50 + incRenglones * 50}-${50 + incRenglones * 50 + 50
      }......${reportTitle}.........`, performance.now() - t0
    );
    incRenglones++;
  }

  if (conFoto) {
    let incImagenes = 0;
    while (
      await agregarImagenesMovimiento(
        sheet,
        workbook,
        qry,
        50 * incImagenes,
        50
      )
    ) {
      logger.debug(
        `agregarDatosRenglones. ${incImagenes}.....${reportTitle}..........`,
        performance.now() - t0
      );
      incImagenes++;
    }
  }

  // para obtener el total de registros y el total de precios
  const resul = qryResultados
    // Aquí definimos las agregaciones:
    .andWhere("precioTipo.id = 2")
    .select("SUM(productoPrecios.precio)", "totalPrecio")
    .addSelect("COUNT(movimiento.id)", "totalRegistros")
  logger.debug('---------- resultados', resul.getSql());

  const resultados = await resul.getRawOne();

  logger.debug('------------- resultados', resultados);

  return resultados as {
    totalPrecio: number,
    totalRegistros: number
  };


}

const reporteGeneral = async (body: {
  proyectoId: number,
  conFoto: boolean,
  usuariosIds?: number[],
  fechaInicio?: Date,
  fechaFin?: Date,
  areasId?: number[],
  bodegasId?: number[],
  filters?: any,
  campoOrden?: string | string[],
  direccion?: string
}) => {
  logger.debug("...............reporteGeneral................", body);
  const { proyectoId, conFoto,
    usuariosIds = [], fechaInicio, fechaFin, areasId = [], bodegasId, filters, campoOrden, direccion
  } = body

  const proyecto = await AppDataSource.getRepository(Proyecto).findOne({ where: { id: idSeguro(proyectoId, "proyectoId") }, 
    select: { id: true, nombre: true },
    loadEagerRelations: false,
  });

  if (proyecto == null) {
    logger.debug(">>>>>> Proyecto no encontrado para reporte general");
    throw new Error("Proyecto no encontrado para reporte general");
  }

  const t0 = performance.now();

  // obtener los nombres de las areas definidas en areasId
  const areas = (await AppDataSource.getRepository(Area).findBy({ id: In(areasId) })).map((it) => it.nombre).join(" ") || "";

  //obtener los nombres de usuarios definidos en usuariosIds
  const usuarios = (await AppDataSource.getRepository(Usuario).findBy({ id: In(usuariosIds) })).map((it) => it.nombre).join(" ") || "";

  logger.debug("Iniciando generacion de reporte................");
  const tituloReporte = `CIERRE - ${proyecto.nombre.toLocaleUpperCase()}
  ${areas.toLocaleUpperCase()} ${usuarios.toLocaleUpperCase()}`;

  const nombreReporte = sanitizeFilename(
    `REPORTE DE CIERRE ${proyecto.nombre.toLocaleUpperCase()} ${areas.toLocaleUpperCase()} ${usuarios.toLocaleUpperCase()}_${idArchivo()}.xlsx`
  );


  const workbook = new Workbook();

  workbook.creator = "Sistema Almacén Exogrid";
  workbook.created = new Date();

  const sheetResumen = workbook.addWorksheet("RESUMEN");

  logger.debug("...............COMPRAS");
  const comprasResumen = await agregarHojaMovimientos(
    workbook,
    `COMPRAS - ${areas.toLocaleUpperCase()} ${usuarios.toLocaleUpperCase()} ${proyecto.nombre.toLocaleUpperCase()}`,
    "COMPRAS",
    conFoto,
    {
      proyectosId: [proyectoId],
      tiposMovimientosId: [T.COMPRA_LEGADO, T.COMPRA],
      usuariosIds, fechaInicio, fechaFin, areasId, bodegasId, filters, campoOrden, direccion
    },
    t0
  );

  logger.debug("...............PRÉSTAMOS");
  const prestamosResumen = await agregarHojaMovimientos(
    workbook,
    `PRÉSTAMOS - ${areas.toLocaleUpperCase()} ${usuarios.toLocaleUpperCase()} ${proyecto.nombre.toLocaleUpperCase()}`,
    "PRÉSTAMOS",
    conFoto,
    {
      proyectosId: [proyectoId],
      tiposMovimientosId: [T.PRESTAMO],
      usuariosIds, fechaInicio, fechaFin, areasId, bodegasId, filters, campoOrden, direccion
    },
    t0
  );

  logger.debug("...............DEVOLUCIONES");
  const DevolucionesResumen = await agregarHojaMovimientos(
    workbook,
    `DEVOLUCIONES - ${areas.toLocaleUpperCase()} ${usuarios.toLocaleUpperCase()} ${proyecto.nombre.toLocaleUpperCase()}`,
    "DEVOLUCIONES",
    conFoto,
    {
      proyectosId: [proyectoId],
      tiposMovimientosId: [T.DEVOLUCION],
      usuariosIds, fechaInicio, fechaFin, areasId, bodegasId, filters, campoOrden, direccion
    },
    t0
  );

  logger.debug("...............BAJAS JUSTIFICADAS");
  const BajasJResumen = await agregarHojaMovimientos(
    workbook,
    `BAJAS JUSTIFICADAS - ${areas.toLocaleUpperCase()} ${usuarios.toLocaleUpperCase()} ${proyecto.nombre.toLocaleUpperCase()}`,
    "BAJAS JUSTIFICADAS",
    conFoto,
    {
      proyectosId: [proyectoId],
      tiposMovimientosId: [T.BAJA_JUSTIFICADA],
      usuariosIds, fechaInicio, fechaFin, areasId, bodegasId, filters, campoOrden, direccion
    },
    t0
  );

  logger.debug("...............BAJAS INJUSTIFICADAS");
  const BajasIResumen = await agregarHojaMovimientos(
    workbook,
    `BAJAS INJUSTIFICADAS - ${areas.toLocaleUpperCase()} ${usuarios.toLocaleUpperCase()} ${proyecto.nombre.toLocaleUpperCase()}`,
    "BAJAS INJUSTIFICADAS",
    conFoto,
    {
      proyectosId: [proyectoId],
      tiposMovimientosId: [T.BAJA_INJUSTIFICADA],
      usuariosIds, fechaInicio, fechaFin, areasId, bodegasId, filters, campoOrden, direccion
    },
    t0
  );

  logger.debug("...............FALTANTES");
  const FaltentesResumen = await agregarHojaPrestamosActivos(
    workbook,
    `FALTANTES - ${areas.toLocaleUpperCase()} ${usuarios.toLocaleUpperCase()} ${proyecto.nombre.toLocaleUpperCase()}`,
    "FALTANTES",
    conFoto,
    {
      proyectosId: [proyectoId],
      tiposMovimientosId: [],
      usuariosIds, fechaInicio, fechaFin, areasId, bodegasId, filters, campoOrden, direccion
    },
    t0
  );

  logger.debug("...............RESUMEN");
  await configurarHojaExcel(sheetResumen, columnasDetalleResumen);
  logger.debug("configurarHojaExcel................", performance.now() - t0);

  await agregarTituloHojaExcel(sheetResumen, workbook, columnasDetalleResumen.length, tituloReporte);
  logger.debug("agregarTituloHojaExcel................", performance.now() - t0);

  const valores = [
    [1, "COMPRAS", Number(comprasResumen.totalRegistros), +Number(comprasResumen.totalPrecio).toFixed(2)],
    [2, "PRÉSTAMOS", Number(prestamosResumen.totalRegistros), +Number(prestamosResumen.totalPrecio).toFixed(2)],
    [3, "DEVOLUCIONES", Number(DevolucionesResumen.totalRegistros), +Number(DevolucionesResumen.totalPrecio * -1).toFixed(2)],
    [4, "BAJAS JUSTIFICADAS", Number(BajasJResumen.totalRegistros), +Number(BajasJResumen.totalPrecio * -1).toFixed(2)],
    [5, "BAJAS INJUSTIFICADAS", Number(BajasIResumen.totalRegistros), +Number(BajasIResumen.totalPrecio * -1).toFixed(2)],
    [6, "FALTANTES", Number(FaltentesResumen.totalRegistros), +Number(FaltentesResumen.totalPrecio).toFixed(2)],
  ];

  logger.debug("agregarTabla................", performance.now() - t0);

  await agregarTabla(
    sheetResumen,
    columnasDetalleResumen,
    "A3",
    valores,
    'TableStyleMedium18'
  );


  const arch = process.env.RUTA_REPORTES + nombreReporte;

  logger.debug(
    `"Workbook guardando ......${nombreReporte}......."`,
    performance.now() - t0
  );

  await workbook.xlsx.writeFile(arch);
  logger.debug(
    `"FIN DE REPORTE ......${nombreReporte}......."`,
    performance.now() - t0
  );

  return { path: arch, nombreReporte };
};

/** Variante del reporte por grupo: columnas, renglones, tamaño de foto y sufijo del archivo. */
interface VarianteGrupo {
  columnas: columnasExcel[];
  renglones: Renglones;
  foto: typeof FOTO_NORMAL;
  sufijoArchivo: string;
}

/**
 * Reporte de un grupo (listado). Antes había dos funciones casi idénticas, normal y de foto grande (hallazgo L11);
 * ahora la variante decide columnas, renglones y tamaño de la foto.
 */
const generarReportePorGrupo = async (body: any, variante: VarianteGrupo) => {
  const {
    grupoNombre,
    movimientoTipoNombre,
    conFoto,
    grupoId,
    sortField,
    sortOrder,
    filters,
    nombreAlmacenista
  } = body;

  const t0 = performance.now();

  const gres = await AppDataSource.getRepository(Grupo)
    .createQueryBuilder("Grupo")
    .leftJoinAndSelect("Grupo.grupoDetalle", "GrupoDetalle")
    .leftJoinAndSelect("GrupoDetalle.usuarios", "Usuarios")
    .leftJoinAndSelect("GrupoDetalle.proyecto", "Proyecto")
    .where("Grupo.id = :grupoId", { grupoId })
    .getOne();

  const proyectoNombre = gres?.grupoDetalle?.proyecto?.nombre ?? "SIN PROYECTO";


  const nombreReporte = sanitizeFilename(
    `${movimientoTipoNombre ?? grupoNombre} ${proyectoNombre ?? ""}${variante.sufijoArchivo}_${idArchivo()}.xlsx`
  );

  logger.debug(
    `"Iniciando generacion de reporte......${nombreReporte}.........."`
  );

  const workbook = new Workbook();

  workbook.creator = "Sistema Almacén Exogrid";
  workbook.created = new Date();
  const sheet = workbook.addWorksheet(movimientoTipoNombre ?? "REPORTE");

  await configurarHojaExcel(sheet, variante.columnas);

  await agregarTituloHojaExcel(
    sheet,
    workbook,
    variante.columnas.length,
    `${movimientoTipoNombre ?? grupoNombre.toLocaleUpperCase()} ${proyectoNombre ?? ""}`.toLocaleUpperCase()
  );


  const campoOrden: string = columnaSegura(sortField, "grupo.id");
  let direccion: string = "ASC";

  if (sortOrder !== undefined) {
    direccion = sortOrder == "descend" ? "DESC" : "ASC";
  }

  // obtener los datos del usuario que genero el grupo a partir de la sesion del usuario

  const qry = funcionQueryListadoMovimientos().where("grupo.id=:grupoId", {
    grupoId,
  });
  aplicarFiltros(qry, condicionesWhereAndGrupo(filters));

  qry.orderBy(columnaSegura(campoOrden, "movimiento.id"), direccionSegura(direccion === "DESC" ? "descend" : direccion === "ASC" ? "ascend" : direccion));

  //clonar qry para obtener el total de registros
  const qryTotal = qry.clone();

  const tbl: Table = await agregarTabla(
    sheet,
    variante.columnas,
    "A3",
    variante.renglones(await qry.take(50).getMany(), 0)
  );

  let incRenglones = 0;

  while (
    await agregarDatosRenglones(tbl, qry, 50 + incRenglones * 50, 50, variante.renglones)
  ) {
    logger.debug(
      `agregarDatosRenglones. ${incRenglones} Regs:${50 + incRenglones * 50}-${50 + incRenglones * 50 + 50
      }......${nombreReporte}.........`,
      performance.now() - t0
    );
    incRenglones++;
  }

  if (conFoto) {
    let incImagenes = 0;
    while (
      await agregarImagenesMovimiento(
        sheet,
        workbook,
        qry,
        50 * incImagenes,
        50,
        variante.foto
      )
    ) {
      logger.debug(
        `agregarDatosRenglones. ${incImagenes}.....${nombreReporte}..........`,
        performance.now() - t0
      );
      incImagenes++;
    }
  }

  const totalRows = await qryTotal.getCount();
  logger.debug(">>>>>>>>>>>>>>>>>>totalRows", totalRows);
  if (totalRows > 0) {

    const nombreResponsable = gres?.grupoDetalle?.usuarios?.map((it) => it.nombre).join("\r\n") ?? "SIN RESPONSABLE";

    mergeCellsAndInsertData(sheet, `F${totalRows + 9}:G${totalRows + 9}`, `___________________________`);
    mergeCellsAndInsertData(sheet, `C${totalRows + 9}:D${totalRows + 9}`, `___________________________`);


    if (compareStringsIgnoreAccents(movimientoTipoNombre, 'PRÉSTAMO')
      || compareStringsIgnoreAccents(movimientoTipoNombre, 'RENTA EXTERNA')
      || compareStringsIgnoreAccents(movimientoTipoNombre, 'TRANSFERENCIA')
    ) {
      mergeCellsAndInsertData(sheet, `F${totalRows + 10}:G${totalRows + 10}`, `RECIBE`);
      mergeCellsAndInsertData(sheet, `C${totalRows + 10}:D${totalRows + 10}`, `ENTREGA`);
    } else if (compareStringsIgnoreAccents(movimientoTipoNombre, 'DEVOLUCIÓN')) {
      mergeCellsAndInsertData(sheet, `F${totalRows + 10}:G${totalRows + 10}`, `ENTREGA`);
      mergeCellsAndInsertData(sheet, `C${totalRows + 10}:D${totalRows + 10}`, `RECIBE`);
    } else {

      mergeCellsAndInsertData(sheet, `F${totalRows + 10}:G${totalRows + 10}`, `RESPONSABLE`);
      mergeCellsAndInsertData(sheet, `C${totalRows + 10}:D${totalRows + 10}`, `ALMACENISTA`);
    }

    // agregar nombre del almacenista al final del archivo

    mergeCellsAndInsertData(sheet, `F${totalRows + 11}:G${totalRows + 11}`, `${nombreResponsable}`);
    mergeCellsAndInsertData(sheet, `C${totalRows + 11}:D${totalRows + 11}`, `${nombreAlmacenista}`);

  }


  const arch = process.env.RUTA_REPORTES + nombreReporte;
  logger.debug(
    `"Workbook guardando ......${nombreReporte}......."`,
    performance.now() - t0
  );
  await workbook.xlsx.writeFile(arch);

  logger.debug(
    `"FIN DE REPORTE ......${nombreReporte}......."`,
    performance.now() - t0
  );

  return { path: arch, nombreReporte };
};

const reportePorGrupo = (body: any) =>
  generarReportePorGrupo(body, {
    columnas: columnasDetallePorProyecto,
    renglones: obtenerRenglonesMovimientoProyecto,
    foto: FOTO_NORMAL,
    sufijoArchivo: "",
  });

const reportePorGrupoFotoGrande = (body: any) =>
  generarReportePorGrupo(body, {
    columnas: columnasDetallePorProyectoFotoGrande,
    renglones: obtenerRenglonesMovimientoProyectoFotoGrande,
    foto: FOTO_GRANDE,
    sufijoArchivo: "_BIGPIC",
  });

const reportePorProyecto = async (body: any) => {
  logger.debug(`"Iniciando generacion de reporte......`, { body });
  const {
    movimientoTipoNombre,
    conFoto,
    proyectoId,
    movimientoTipoId,
    usuariosIds,
    areasIds,
    bodegasIds,
    sortField,
    sortOrder,
    filters,
  } = body;

  logger.debug("-----------------------------", {
    sortField,
    sortOrder,
    filters,
  });

  const proyectoNombre = (await nombreProyecto(proyectoId));


  const areasNombres = areasIds ? (await AppDataSource.getRepository(Area).findBy({ id: In(areasIds) })).map(area => area.nombre).join(' - ') : '';

  const t0 = performance.now();
  const nombreReporte = sanitizeFilename(
    `${movimientoTipoNombre ?? "_"}_${areasNombres}_${proyectoNombre ?? "_"}_${idArchivo()}.xlsx`
  );
  logger.debug(
    `"Iniciando generacion de reporte......${nombreReporte}.........."${{
      proyectoId,
    }}`
  );

  const workbook = new Workbook();

  workbook.creator = "Sistema Almacén Exogrid";
  workbook.created = new Date();
  const sheet = workbook.addWorksheet(movimientoTipoNombre ?? "REPORTE");

  await configurarHojaExcel(sheet, columnasDetallePorProyecto);


  await agregarTituloHojaExcel(
    sheet,
    workbook,
    columnasDetallePorProyecto.length,
    `${movimientoTipoNombre ?? ""} ${areasNombres} ${proyectoNombre ?? ""}`.toLocaleUpperCase()
  );

  const campoOrden: string | string[] = sortField
    ? sortField
    : "inventarioActual.id";
  let direccion: string = "ASC";

  if (sortOrder !== undefined) {
    direccion = sortOrder == "descend" ? "DESC" : "ASC";
  }
  const tiposMovimineto = Array.isArray(movimientoTipoId)
    ? movimientoTipoId
    : [movimientoTipoId];

  const qry = funcionQueryListadoMovimientos().where(
    "proyecto.id=:proyectoId and movimientoTipo.id IN (:...tiposMovimineto)",
    { proyectoId, tiposMovimineto }
  );

  if ((usuariosIds?.length ?? 0) > 0) {
    qry.andWhere(
      new Brackets((qb) =>
        qb
          .where("operacionUsuarios.id in (:...usuariosIds)", { usuariosIds })
          .orWhere("usuario.id in (:...usuariosIds)", { usuariosIds })
      )
    );
  }
  if (areasIds?.length > 0) {
    qry.andWhere("area.id in (:...areasIds)", { areasIds });
  }
  if (bodegasIds?.length > 0) {
    qry.andWhere("bodega.id in (:...bodegasIds)", { bodegasIds });
  }

  aplicarFiltros(qry, condicionesWhereAndGrupo(filters));

  qry.orderBy(columnaSegura(campoOrden, "movimiento.id"), direccionSegura(direccion === "DESC" ? "descend" : direccion === "ASC" ? "ascend" : direccion));

  logger.debug("<<<<<<<<<<<>>>>>>>>>>>>>>>>>>qry", qry.getSql());

  const tbl = await agregarTabla(
    sheet,
    columnasDetallePorProyecto,
    "A3",
    obtenerRenglonesMovimientoProyecto(await qry.take(50).getMany(), 0)
  );

  let incRenglones = 0;

  while (
    await agregarDatosRenglones(tbl, qry, 50 + incRenglones * 50, 50, obtenerRenglonesMovimientoProyecto)
  ) {
    logger.debug(
      `agregarDatosRenglones. ${incRenglones} Regs:${50 + incRenglones * 50}-${50 + incRenglones * 50 + 50
      }......${nombreReporte}.........`,
      performance.now() - t0
    );
    incRenglones++;
  }

  if (conFoto) {
    let incImagenes = 0;
    while (
      await agregarImagenesMovimiento(
        sheet,
        workbook,
        qry,
        50 * incImagenes,
        50
      )
    ) {
      logger.debug(
        `agregarDatosRenglones. ${incImagenes}.....${nombreReporte}..........`,
        performance.now() - t0
      );
      incImagenes++;
    }
  }

  const arch = process.env.RUTA_REPORTES + nombreReporte;
  logger.debug(
    `"Workbook guardando ......${nombreReporte}......."`,
    performance.now() - t0
  );

  await workbook.xlsx.writeFile(arch);
  logger.debug(
    `"FIN DE REPORTE ......${nombreReporte}......."`,
    performance.now() - t0
  );

  return { path: arch, nombreReporte };
};

const reportePorProyectoCompras = async (body: any) => {
  logger.debug(`"Iniciando generacion de reporte......`, { body });
  const {
    movimientoTipoNombre,
    conFoto,
    proyectoId,
    movimientoTipoId,
    usuariosIds,
    areasIds,
    bodegasIds,
    sortField,
    sortOrder,
    filters
  } = body;
  logger.debug("-----------------------------", {
    sortField,
    sortOrder,
    filters,
  });

  const proyectoNombre = (await nombreProyecto(proyectoId));

  const areasNombres = areasIds ? (await AppDataSource.getRepository(Area).findBy({ id: In(areasIds) })).map(area => area.nombre).join(' - ') : '';

  const t0 = performance.now();
  const nameProposal = [movimientoTipoNombre, areasNombres, proyectoNombre, idArchivo()]
    .filter(item => item !== null && item !== undefined)
    .join('_');

  const nombreReporte = sanitizeFilename(`${nameProposal}.xlsx`);
  logger.debug(
    `"Iniciando generacion de reporte......${nombreReporte}.........." ${proyectoId}`
  );

  const workbook = new Workbook();

  workbook.creator = "Sistema Almacén Exogrid";
  workbook.created = new Date();
  const sheet = workbook.addWorksheet(
    `${movimientoTipoNombre ?? "REPORTE"} MXN`
  );
  const sheetUSD = workbook.addWorksheet(
    `${movimientoTipoNombre ?? "REPORTE"} USD`
  );

  await configurarHojaExcel(sheet, columnasDetalleGrupoCompras);
  await configurarHojaExcel(sheetUSD, columnasDetalleGrupoCompras);

  await agregarTituloHojaExcel(
    sheet,
    workbook,
    columnasDetalleGrupoCompras.length,
    `REPORTE ${movimientoTipoNombre ?? ""} - ${proyectoNombre ?? ""} - PESOS`
  );

  await agregarTituloHojaExcel(
    sheetUSD,
    workbook,
    columnasDetalleGrupoCompras.length,
    `REPORTE ${movimientoTipoNombre ?? ""} - ${proyectoNombre ?? ""} - DÓLARES`
  );

  const campoOrden: string | string[] = sortField
    ? sortField
    : "inventarioActual.id";
  let direccion: string = "ASC";

  if (sortOrder !== undefined) {
    direccion = sortOrder == "descend" ? "DESC" : "ASC";
  }
  const tiposMovimineto = Array.isArray(movimientoTipoId)
    ? movimientoTipoId
    : [movimientoTipoId];

  const qry = funcionQueryListadoMovimientos().where(
    "proyecto.id=:proyectoId and movimientoTipo.id IN (:tiposMovimineto)",
    { proyectoId, tiposMovimineto }
  );

  if ((usuariosIds?.length ?? 0) > 0) {
    qry.andWhere(
      new Brackets((qb) =>
        qb
          .where("operacionUsuarios.id in (:...usuariosIds)", { usuariosIds })
          .orWhere("usuario.id in (:...usuariosIds)", { usuariosIds })
      )
    );
  }
  if (areasIds?.length > 0) {
    qry.andWhere("area.id in (:...areasIds)", { areasIds });
  }
  if (bodegasIds?.length > 0) {
    qry.andWhere("bodega.id in (:...bodegasIds)", { bodegasIds });
  }

  aplicarFiltros(qry, condicionesWhereAndGrupo(filters));

  qry.orderBy(columnaSegura(campoOrden, "movimiento.id"), direccionSegura(direccion === "DESC" ? "descend" : direccion === "ASC" ? "ascend" : direccion));


  const qryResultInit = await qry.take(50).getMany();

  const tbl = await agregarTabla(
    sheet,
    columnasDetalleGrupoCompras,
    "A3",
    obtenerRenglonesMovimientoCompras(qryResultInit, 0)
  );

  const tblUSD = await agregarTabla(
    sheetUSD,
    columnasDetalleGrupoCompras,
    "A3",
    obtenerRenglonesMovimientoComprasUSD(qryResultInit, 0)
  );

  let incRenglones = 0;

  while (
    await agregarDatosRenglonesCompras(
      tbl,
      qry,
      50 + incRenglones * 50,
      50, false)
  ) {
    logger.debug(
      `agregarDatosRenglones. ${incRenglones} Regs:${50 + incRenglones * 50}-${50 + incRenglones * 50 + 50
      }......${nombreReporte}.........`,
      performance.now() - t0
    );
    incRenglones++;
  }

  let incRenglonesUSD = 0;

  while (
    await agregarDatosRenglonesCompras(
      tblUSD,
      qry,
      50 + incRenglones * 50,
      50, true)
  ) {
    logger.debug(
      `agregarDatosRenglones. ${incRenglonesUSD} Regs:${50 + incRenglonesUSD * 50
      }-${50 + incRenglonesUSD * 50 + 50}......${nombreReporte}......... USD`,
      performance.now() - t0
    );
    incRenglonesUSD++;
  }

  if (conFoto) {
    let incImagenes = 0;
    let resp: boolean = false;
    let incRenMXP: number = 0,
      incRenUSD: number = 0;
    do {
      [resp, incRenMXP, incRenUSD] = await agregarImagenesMovimientoCompra(
        sheet,
        sheetUSD,
        workbook,
        qry,
        50 * incImagenes,
        50,
        incRenMXP,
        incRenUSD
      );
      logger.debug(
        `agregarDatosRenglones. ${incImagenes}.....${nombreReporte}..........`,
        performance.now() - t0
      );
      incImagenes++;
    } while (resp);

  }

  const arch = process.env.RUTA_REPORTES + nombreReporte;
  logger.debug(
    `"Workbook guardando ......${nombreReporte}......."`,
    performance.now() - t0
  );

  await workbook.xlsx.writeFile(arch);
  logger.debug(
    `"FIN DE REPORTE ......${nombreReporte}......."`,
    performance.now() - t0
  );

  return { path: arch, nombreReporte };
};

const reportePorPrestamosRentasActivas = async (body: any) => {
  const {
    movimientoTipoNombre,
    conFoto,
    proyectoId,
    usuariosIds,
    areasIds,
    bodegasIds,
    sortField,
    sortOrder,
    filters
  } = body;

  const proyectoNombre = proyectoId > 0 ? (await nombreProyecto(proyectoId)) : 'Todos';

  const t0 = performance.now();
  const nombreReporte = sanitizeFilename(
    `${movimientoTipoNombre ?? "_"}_${proyectoNombre ?? "_"}_${idArchivo()}.xlsx`
  );

  logger.debug(
    `"Iniciando generacion de reporte......${nombreReporte}.........."`
  );

  const workbook = new Workbook();

  workbook.creator = "Sistema Almacén Exogrid";
  workbook.created = new Date();
  const sheet = workbook.addWorksheet(movimientoTipoNombre ?? "REPORTE");

  await configurarHojaExcel(sheet, columnasDetalleGrupo);

  await agregarTituloHojaExcel(
    sheet,
    workbook,
    columnasDetalleGrupo.length,
    `REPORTE ${movimientoTipoNombre ?? ""}`
  );

  const campoOrden: string | string[] = sortField ? sortField : "movimiento.id";
  let direccion: string = "ASC";

  if (sortOrder !== undefined) {
    direccion = sortOrder == "descend" ? "DESC" : "ASC";
  }
  const qry = funcionQueryListadoPrestamosPendientes(
    proyectoId,
    usuariosIds,
    areasIds,
    bodegasIds
  );

  aplicarFiltros(qry, condicionesWhereAndPrestamosActivos(filters));

  qry.orderBy(columnaSegura(campoOrden, "movimiento.id"), direccionSegura(direccion === "DESC" ? "descend" : direccion === "ASC" ? "ascend" : direccion));

  const tbl = await agregarTabla(
    sheet,
    columnasDetalleGrupo,
    "A3",
    obtenerRenglonesMovimiento(await qry.take(50).getMany(), 0)
  );

  let incRenglones = 0;

  while (
    await agregarDatosRenglones(tbl, qry, 50 + incRenglones * 50, 50, obtenerRenglonesMovimiento)
  ) {
    logger.debug(
      `agregarDatosRenglones. ${incRenglones} Regs:${50 + incRenglones * 50}-${50 + incRenglones * 50 + 50
      }......${nombreReporte}.........`,
      performance.now() - t0
    );
    incRenglones++;
  }

  if (conFoto) {
    let incImagenes = 0;
    while (
      await agregarImagenesMovimiento(
        sheet,
        workbook,
        qry,
        50 * incImagenes,
        50
      )
    ) {
      logger.debug(
        `agregarDatosRenglones. ${incImagenes}.....${nombreReporte}..........`,
        performance.now() - t0
      );
      incImagenes++;
    }
  }

  const arch = process.env.RUTA_REPORTES + nombreReporte;
  logger.debug(
    `"Workbook guardando ......${nombreReporte}......."`,
    performance.now() - t0
  );

  await workbook.xlsx.writeFile(arch);
  logger.debug(
    `"FIN DE REPORTE ......${nombreReporte}......."`,
    performance.now() - t0
  );

  return { path: arch, nombreReporte };
};

/**
 * Sanitizes a given filename by replacing invalid characters and removing accents.
 *
 * This function performs the following operations:
 * 1. Replaces invalid characters (`/`, `\`, `:`, `*`, `?`, `"`, `<`, `>`, `|`) with an underscore (`_`).
 * 2. Normalizes the string to decompose accented characters and removes the accents.
 * 3. Replaces any trailing period or space with an underscore.
 *
 * @param filename - The filename to be sanitized.
 * @returns The sanitized filename.
 */
function sanitizeFilename(filename: string): string {
  // Define the invalid characters
  const invalidChars = /[\/\\:*?"<>|]/g; // Note the 'g' flag for global replacement

  // Convert filename to title case
  let sanitizedFilename = filename
    .split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");

  // Remove accented characters
  sanitizedFilename = sanitizedFilename.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  // Replace invalid characters with underscore
  sanitizedFilename = sanitizedFilename.replace(invalidChars, "_");

  // Remove any remaining characters that are not printable ASCII
  sanitizedFilename = sanitizedFilename.replace(/[^ -~]/g, "");

  // Replace trailing period or space with underscore
  sanitizedFilename = sanitizedFilename.replace(/\. $/, "");

  return sanitizedFilename;
}

export {
  reporteGeneral,
  reportePorGrupo,
  reportePorPrestamosRentasActivas,
  reportePorProyecto,
  reportePorProyectoCompras,
  reportePorGrupoFotoGrande
};

