import { stream, Table, Workbook, Worksheet } from "exceljs";
import { performance } from "perf_hooks";
import { Brackets, SelectQueryBuilder, In } from "typeorm";
import { AppDataSource } from "../data-source";
import { idSeguro } from "./ids";
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
import { InventarioActual } from "../entity/InventarioActual";
import { Movimiento } from "../entity/Movimiento";
import { Proyecto } from "../entity/Proyecto";
import { Usuario } from "../entity/Usuario";
import sharp from "sharp";
import { logger } from "./logger";

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

const columnasDetalle: columnasExcel[] = [
  //PARA REPORTE GENERAL
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
    ancho: 11.43,
    tipo: "general",
    filtro: true,
  },
  {
    titulo: "ARTÍCULO",
    letra: "font8",
    ancho: 13.71,
    tipo: "general",
    filtro: true,
  },
  {
    titulo: "DESCRIPCIÓN",
    letra: "font7",
    ancho: 43.29,
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
    titulo: "ESTADO",
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
    titulo: "NOTAS / COMENTARIOS",
    letra: "font8",
    ancho: 30.29,
    tipo: "general",
    filtro: true,
  },
];

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


const obtenerRenglonesMovimientoProyecto = (
  resultados: Movimiento[],
  saltar: number
) => {
  return resultados.map((item, idx) => {
    return [
      idx + 1 + saltar,
      "",
      item.inventarioActual.producto.productoClaves[
        item.inventarioActual.producto.productoClaves.length - 1
      ].barras, // clave más reciente
      item.inventarioActual.producto.titulo, // artículo
      item.inventarioActual.producto.descripcion.trim(), // descripcion
      item.inventarioActual.producto.area?.nombre, // area
      +item.inventarioActual.producto?.productoPrecios[
        item.inventarioActual.producto.productoPrecios?.findIndex(
          (pp) => pp.precioTipo.id === 2
        )
      ]?.precio * item.cantidad, // DONE total $$$
      item.operacion?.usuarios?.map((usr) => usr.nombre).join("\n"), //responsables
      item.operacion?.fecha, //fecha
    ];
  });
};

const obtenerRenglonesMovimientoProyectoFotoGrande = (
  resultados: Movimiento[],
  saltar: number
) => {
  return resultados.map((item, idx) => {
    return [
      idx + 1 + saltar,
      "",
      item.inventarioActual.producto.productoClaves[
        item.inventarioActual.producto.productoClaves.length - 1
      ].barras, // clave más reciente
      item.inventarioActual.producto.titulo, // artículo
      item.inventarioActual.producto.descripcion.trim(), // descripcion
      +item.inventarioActual.producto?.productoPrecios[
        item.inventarioActual.producto.productoPrecios?.findIndex(
          (pp) => pp.precioTipo.id === 2
        )
      ]?.precio * item.cantidad, // DONE total $$$
      item.operacion?.usuarios?.map((usr) => usr.nombre).join("\n"), //responsables
      item.operacion?.fecha, //fecha
    ];
  });
};

const obtenerRenglonesMovimiento = (
  resultados: Movimiento[],
  saltar: number
) => {
  return resultados.map((item, idx) => {
    return [
      idx + 1 + saltar,
      "",
      item.inventarioActual.producto.productoClaves[
        item.inventarioActual.producto.productoClaves.length - 1
      ].barras, // clave más reciente
      item.inventarioActual.producto.titulo, // artículo
      item.inventarioActual.producto.descripcion.trim(), // descripcion
      item.inventarioActual.producto.area?.nombre, // area
      item.inventarioActual.bodega?.nombre, // almacen
      item.sesion?.usuario?.nombre, // almacenista
      item.operacion?.movimientoTipo?.nombre, // operacion
      item.operacion?.proyecto?.nombre, // proyecto
      +item.inventarioActual.producto?.productoPrecios[
        item.inventarioActual.producto.productoPrecios?.findIndex(
          (pp) => pp.precioTipo.id === 2
        )
      ]?.precio * item.cantidad, // DONE total $$$
      item.operacion?.usuarios?.map((usr) => usr.nombre).join("\n"), //responsables
      item.operacion?.fecha, //fecha

      // item.grupos[0]?.grupoDetalle?.facturaDetalle?.proveedor?.nombre, //Proveedor
      // item.grupos[0]?.grupoDetalle?.facturaDetalle?.facturaTipo?.nombre, //TipoFactura
      // item.grupos[0]?.grupoDetalle?.facturaDetalle?.numero, //Numero Factura
      // item.grupos[0]?.grupoDetalle?.facturaDetalle?.fechaEmision, //Fecha Factura

      item.operacion?.comentarios?.map((com) => com.comentario).join("\n") +
      "\n" +
      item.grupos[0]?.comentarios?.map((com) => com.comentario).join("\n"), // comentarios grupo y movimiento
    ];
  });
};

const obtenerRenglonesMovimientoCompras = (
  resultados: Movimiento[],
  saltar: number
) => {
  return resultados
    .map((item, idx) => {
      if (item.grupos[0]?.grupoDetalle?.facturaDetalle?.facturaTipo?.id === 4) {
        return null;
      }
      return [
        idx + 1 + saltar,
        "",
        item.inventarioActual.producto.productoClaves[
          item.inventarioActual.producto.productoClaves.length - 1
        ].barras, // clave más reciente
        item.inventarioActual.producto.titulo, // artículo
        item.inventarioActual.producto.descripcion.trim(), // descripcion
        item.inventarioActual.producto.area?.nombre, // area
        item.inventarioActual.bodega?.nombre, // almacen
        item.sesion?.usuario?.nombre, // almacenista
        item.operacion?.movimientoTipo?.nombre, // operacion
        item.operacion?.proyecto?.nombre, // proyecto
        +item.inventarioActual.producto?.productoPrecios[
          item.inventarioActual.producto.productoPrecios?.findIndex(
            (pp) => pp.precioTipo.id === 2
          )
        ]?.precio * item.cantidad, // DONE total $$$
        item.operacion?.usuarios?.map((usr) => usr.nombre).join("\n"), //responsables
        item.operacion?.fecha, //fecha

        item.grupos[0]?.grupoDetalle?.facturaDetalle?.proveedor?.nombre, //Proveedor
        item.grupos[0]?.grupoDetalle?.facturaDetalle?.facturaTipo?.nombre, //TipoFactura
        item.grupos[0]?.grupoDetalle?.facturaDetalle?.numero, //Numero Factura
        item.grupos[0]?.grupoDetalle?.facturaDetalle?.fechaEmision, //Fecha Factura

        item.operacion?.comentarios?.map((com) => com.comentario).join("\n") +
        "\n" +
        item.grupos[0]?.comentarios?.map((com) => com.comentario).join("\n"), // comentarios grupo y movimiento
      ];
    })
    .filter((it) => it !== null);
};

const obtenerRenglonesMovimientoComprasUSD = (
  resultados: Movimiento[],
  saltar: number
) => {
  return resultados
    .map((item, idx) => {
      if (item.grupos[0]?.grupoDetalle?.facturaDetalle?.facturaTipo?.id !== 4) {
        return null;
      }
      return [
        idx + 1 + saltar,
        "",
        item.inventarioActual.producto.productoClaves[
          item.inventarioActual.producto.productoClaves.length - 1
        ].barras, // clave más reciente
        item.inventarioActual.producto.titulo, // artículo
        item.inventarioActual.producto.descripcion.trim(), // descripcion
        item.inventarioActual.producto.area?.nombre, // area
        item.inventarioActual.bodega?.nombre, // almacen
        item.sesion?.usuario?.nombre, // almacenista
        item.operacion?.movimientoTipo?.nombre, // operacion
        item.operacion?.proyecto?.nombre, // proyecto
        +item.inventarioActual.producto?.productoPrecios[
          item.inventarioActual.producto.productoPrecios?.findIndex(
            (pp) => pp.precioTipo.id === 2
          )
        ]?.precio * item.cantidad, // DONE total $$$
        item.operacion?.usuarios?.map((usr) => usr.nombre).join("\n"), //responsables
        item.operacion?.fecha, //fecha

        item.grupos[0]?.grupoDetalle?.facturaDetalle?.proveedor?.nombre, //Proveedor
        item.grupos[0]?.grupoDetalle?.facturaDetalle?.facturaTipo?.nombre, //TipoFactura
        item.grupos[0]?.grupoDetalle?.facturaDetalle?.numero, //Numero Factura
        item.grupos[0]?.grupoDetalle?.facturaDetalle?.fechaEmision, //Fecha Factura

        item.operacion?.comentarios?.map((com) => com.comentario).join("\n") +
        "\n" +
        item.grupos[0]?.comentarios?.map((com) => com.comentario).join("\n"), // comentarios grupo y movimiento
      ];
    })
    .filter((it) => it !== null);
};

const obtenerRenglones = (resultados: InventarioActual[], saltar: number) => {
  return resultados.map((item, idx) => {
    return [
      idx + 1 + saltar,
      "",
      item.producto.productoClaves[item.producto.productoClaves.length - 1]
        .barras, // clave más reciente
      item.producto.titulo, // artículo
      item.producto.descripcion.trim(), // descripcion
      item.producto.area.nombre, // area
      item.bodega.nombre, // almacen
      item.disponible, // estado
      item.cantidadAlmacen *
      item.producto.productoPrecios[
        item.producto.productoPrecios.findIndex(
          (pp) => pp.precioTipo.id === 2
        )
      ].precio, // DONE total $$$
      item.producto.productoCaracteristicas
        .map((it) => `${it.llave}:${it.valor}`)
        .join("\n"), // notas y comentarios
    ];
  });
};

const agregarDatosRenglones = async (
  tbl: Table,
  query: SelectQueryBuilder<InventarioActual>,
  saltar: number,
  tomar: number
) => {
  const resultados = await query.take(tomar).skip(saltar).getMany();

  // Agregar contenido a la tabla

  obtenerRenglones(resultados, saltar).map((it, idx) =>
    tbl.addRow(it, saltar + idx)
  );

  tbl.commit();
  // tbl.getColumn()

  return resultados.length === tomar;
};


const agregarDatosRenglonesMovimientoProyecto = async (
  tbl: Table,
  query: SelectQueryBuilder<Movimiento>,
  saltar: number,
  tomar: number
) => {
  const resultados = await query.take(tomar).skip(saltar).getMany();

  // Agregar contenido a la tabla

  obtenerRenglonesMovimientoProyecto(resultados, saltar).map((it, idx) =>
    tbl.addRow(it, saltar + idx)
  );

  tbl.commit();
  // tbl.getColumn()

  return resultados.length === tomar;
};

const agregarDatosRenglonesMovimientoProyectoFotoGrande = async (
  tbl: Table,
  query: SelectQueryBuilder<Movimiento>,
  saltar: number,
  tomar: number
) => {
  const resultados = await query.take(tomar).skip(saltar).getMany();

  // Agregar contenido a la tabla

  obtenerRenglonesMovimientoProyectoFotoGrande(resultados, saltar).map((it, idx) =>
    tbl.addRow(it, saltar + idx)
  );

  tbl.commit();
  // tbl.getColumn()

  return resultados.length === tomar;
};


const agregarDatosRenglonesMovimiento = async (
  tbl: Table,
  query: SelectQueryBuilder<Movimiento>,
  saltar: number,
  tomar: number
) => {
  const resultados = await query.take(tomar).skip(saltar).getMany();

  // Agregar contenido a la tabla

  obtenerRenglonesMovimiento(resultados, saltar).map((it, idx) =>
    tbl.addRow(it, saltar + idx)
  );

  tbl.commit();
  // tbl.getColumn()

  return resultados.length === tomar;
};

const agregarDatosRenglonesMovimientoCompras = async (
  tbl: Table,
  query: SelectQueryBuilder<Movimiento>,
  saltar: number,
  tomar: number
) => {
  const resultados = await query.take(tomar).skip(saltar).getMany();

  // Agregar contenido a la tabla

  const saltoTabla = tbl.rows?.length ?? saltar;
  logger.debug('agregarDatosRenglonesMovimientoCompras', { saltoTabla });

  obtenerRenglonesMovimientoCompras(resultados, saltoTabla).map((it, idx) =>
    // tbl.addRow(it, saltoTabla + idx)
    tbl.addRow(it)
  );

  tbl.commit();
  // tbl.getColumn()

  return resultados.length === tomar;
};

const agregarDatosRenglonesMovimientoComprasUSD = async (
  tbl: Table,
  query: SelectQueryBuilder<Movimiento>,
  saltar: number,
  tomar: number
) => {
  const resultados = await query.take(tomar).skip(saltar).getMany();

  // Agregar contenido a la tabla
  const saltoTabla = tbl.rows?.length ?? saltar;
  logger.debug('agregarDatosRenglonesMovimientoCompras', { saltoTabla });

  obtenerRenglonesMovimientoComprasUSD(resultados, saltoTabla).map((it, idx) =>
    // tbl.addRow(it, saltoTabla + idx)
    tbl.addRow(it)
  );

  tbl.commit();
  // tbl.getColumn()

  return resultados.length === tomar;
};

const configurarHojaExcel = async (
  sheet: Worksheet,
  columnas: columnasExcel[]
) => {
  // console.log('*******************************************chet', sheet.state, sheet)

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

    const img = workbook.addImage({
      filename: process.env.ARCHIVOS_AUXILIARES + "sony-tv-logo.jpg",
      extension: "jpeg",
    });

    sheet.addImage(img, {
      editAs: "absolute",
      tl: { col: 0, row: 0 },
      ext: { width: 73, height: 38 },
    });
    // row.commit();
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
    //   {name: 'TOTAL', totalsRowFunction: 'custom', totalsRowFormula:`sum(I4:I${total+3})`, filterButton: true},
    rows: valoresIniciales,
  });
  // tbl.commit();
  // console.log("valoresIniciales", valoresIniciales.pop())



  return tbl;
};

const agregarImagenes = async (
  sheet: Worksheet,
  workbook: Workbook,
  query: SelectQueryBuilder<InventarioActual>,
  saltar: number,
  tomar: number
) => {
  const articulos = await query.take(tomar).skip(saltar).getMany();
  let rowInc = 0 + saltar;
  // console.log(articulos[0]);
  for (const item of articulos) {
    // console.log(item);
    if (item.producto.archivos.length > 0) {

      const idImage = workbook.addImage({
        buffer: (await sharp(item.producto.archivos[0].data)
          .resize(64, 64)
          .withMetadata().toFormat('jpeg')
          .toBuffer()) as any, // exceljs tipa `buffer` con un Buffer antiguo incompatible con @types/node 22
        extension: "jpeg",
      });
      sheet.addImage(idImage, {
        editAs: "",
        tl: { col: 1.15, row: rowInc + 3.35 },
        ext: { width: 60, height: 60 },
      });
    }
    sheet.getRow(rowInc + 4).height = 60;
    rowInc++;
  }

  return articulos.length === tomar;
};

const agregarImagenesMovimiento = async (
  sheet: Worksheet,
  workbook: Workbook,
  query: SelectQueryBuilder<Movimiento>,
  saltar: number,
  tomar: number
) => {
  const articulos = await query.take(tomar).skip(saltar).getMany();
  let rowInc = 0 + saltar;
  // console.log(articulos[0]);
  for (const item of articulos) {
    // console.log(item);
    if (item.inventarioActual.producto.archivos.length > 0) {

      // GET THE LATEST FILE BASE ON ITS ID
      const itemFile = item.inventarioActual.producto.archivos.sort((a, b) => a.id - b.id).pop();
      const file = await AppDataSource.getRepository(Archivo).findOneBy({ id: itemFile.id });


      // const file = await getRepository(Archivo).findOne(
      //   item.inventarioActual.producto.archivos[0].id
      // );
      if (file == null) continue;
      const idImage = workbook.addImage({
        buffer: (await sharp(file.data).resize(64, 64).withMetadata().toFormat('jpeg').toBuffer()) as any, // tipos de exceljs vs @types/node 22
        extension: "jpeg",
      });
      sheet.addImage(idImage, {
        editAs: "",
        tl: { col: 1.15, row: rowInc + 3.35 },
        ext: { width: 60, height: 60 },
      });
    }
    sheet.getRow(rowInc + 4).height = 82.5;
    rowInc++;
  }

  return articulos.length === tomar;
};

const agregarImagenesMovimientoFotoGrande = async (
  sheet: Worksheet,
  workbook: Workbook,
  query: SelectQueryBuilder<Movimiento>,
  saltar: number,
  tomar: number
) => {
  const articulos = await query.take(tomar).skip(saltar).getMany();
  let rowInc = 0 + saltar;
  // console.log(articulos[0]);
  for (const item of articulos) {
    // console.log(item);
    if (item.inventarioActual.producto.archivos.length > 0) {
      // GET THE LATEST FILE BASE ON ITS ID
      const itemFile = item.inventarioActual.producto.archivos.sort((a, b) => a.id - b.id).pop();
      const file = await AppDataSource.getRepository(Archivo).findOneBy({ id: itemFile.id });

      // const file = await getRepository(Archivo).findOne(
      //   item.inventarioActual.producto.archivos[0].id
      // );
      if (file == null) continue;
      const idImage = workbook.addImage({
        buffer: (await sharp(file.data).resize(400, null, { fit: 'inside' }).withMetadata().toFormat('jpeg').toBuffer()) as any, // tipos de exceljs vs @types/node 22
        extension: "jpeg",
      });
      sheet.addImage(idImage, {
        editAs: "",
        tl: { col: 1.08, row: rowInc + 3.10 },
        ext: { width: 180, height: 180 },
      });
    }
    sheet.getRow(rowInc + 4).height = 220.5;
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
  // let rowInc = 0 + saltar;
  // console.log(articulos[0]);
  for (const item of articulos) {
    // console.log(item);
    if (item.inventarioActual.producto.archivos.length > 0) {
      // GET THE LATEST FILE BASE ON ITS ID
      const itemFile = item.inventarioActual.producto.archivos.sort((a, b) => a.id - b.id).pop();
      const file = await AppDataSource.getRepository(Archivo).findOneBy({ id: itemFile.id });

      // const file = await getRepository(Archivo).findOne(
      //   item.inventarioActual.producto.archivos[0].id
      // );
      if (file == null) continue;
      const idImage = workbook.addImage({
        buffer: (await sharp(file.data).resize(64, 64).withMetadata().toFormat('jpeg').toBuffer()) as any, // tipos de exceljs vs @types/node 22
        extension: "jpeg",
      });

      if (item.grupos[0]?.grupoDetalle?.facturaDetalle?.facturaTipo?.id === 4) {
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
    // rowInc++;
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
  const { areasId, bodegasId, proyectosId, fechaInicio, fechaFin, tiposMovimientosId,
    usuariosIds, filters, campoOrden = 'movimiento.id', direccion = 'DESC'
  } = movementsParams;


  const qry = funcionQueryListadoMovimientos().where(
    "proyecto.id IN (:...proyectosId) and movimientoTipo.id IN (:...tiposMovimientosId)",
    { proyectosId, tiposMovimientosId }
  );

  if (usuariosIds?.length > 0) {
    qry.andWhere(
      new Brackets((qb) =>
        qb
          .where("operacionUsuarios.id in (:...usuariosIds)", { usuariosIds })
          .orWhere("usuario.id in (:...usuariosIds)", { usuariosIds })
      )
    );
  }
  if (areasId?.length > 0) {
    qry.andWhere("area.id in (:...areasId)", { areasId });
  }
  if (bodegasId?.length > 0) {
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
    await agregarDatosRenglonesMovimientoProyecto(tbl, qry, 50 + incRenglones * 50, 50)
  ) {
    logger.debug(
      `agregarDatosRenglones. ${incRenglones} Regs:${50 + incRenglones * 50}-${50 + incRenglones * 50 + 50
      }......${reportTitle}.........`, performance.now() - t0
    );
    // process.send({r:0,message:`6 + ${incRenglones}`});
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
      // process.send({r:0,message:`7 + ${incImagenes}`});
      incImagenes++;
    }
  }
  // if (!conFoto) {
  //   tbl.removeColumns(1, 1);
  //   tbl.commit()
  // }
  // if (areasId?.length) {
  //   tbl.removeColumns(5, 1);
  //   tbl.commit()
  // }

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
  const { areasId = [], bodegasId = [], proyectosId, fechaInicio, fechaFin, tiposMovimientosId,
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
    await agregarDatosRenglonesMovimientoProyecto(tbl, qry, 50 + incRenglones * 50, 50)
  ) {
    logger.debug(
      `agregarDatosRenglones. ${incRenglones} Regs:${50 + incRenglones * 50}-${50 + incRenglones * 50 + 50
      }......${reportTitle}.........`, performance.now() - t0
    );
    // process.send({r:0,message:`6 + ${incRenglones}`});
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
      // process.send({r:0,message:`7 + ${incImagenes}`});
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
    `REPORTE DE CIERRE ${proyecto.nombre.toLocaleUpperCase()} ${areas.toLocaleUpperCase()} ${usuarios.toLocaleUpperCase()}_${Math.trunc(Math.random() * 1000000)}.xlsx`
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


  // const sheetCompras = workbook.addWorksheet("COMPRAS");
  // const sheetPrestamos = workbook.addWorksheet("PRÉSTAMOS");
  // const sheetDevoluciones = workbook.addWorksheet("DEVOLUCIONES");
  // const sheetBajasJ = workbook.addWorksheet("BAJAS JUSTIFICADAS");
  // const sheetBajasI = workbook.addWorksheet("BAJAS INJUSTIFICADAS");
  // const sheetBajasI = workbook.addWorksheet("FALTANTES");



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

const queryReporteGeneralImagenes = () =>
  AppDataSource.getRepository(InventarioActual)
    .createQueryBuilder("inventarioActual")
    .innerJoinAndSelect("inventarioActual.producto", "producto")
    .leftJoinAndSelect("producto.archivos", "archivos")
    // .leftJoinAndSelect("producto.productoCaracteristicas","productoCaracteristicas")
    .leftJoin("producto.productoPrecios", "productoPrecios")
    .leftJoin("productoPrecios.precioTipo", "precioTipo")
    .leftJoin("producto.area", "area")
    .where("area.id=1") // Maquillaje
    .andWhere("precioTipo.id=2") // COMPRA ORIGEN
    .andWhere("inventarioActual.disponible<>'baja'");

const queryReporteGeneral = () =>
  AppDataSource.getRepository(InventarioActual)
    .createQueryBuilder("inventarioActual")
    .innerJoinAndSelect("inventarioActual.producto", "producto")
    // .leftJoinAndSelect("producto.archivos","archivos")
    .leftJoinAndSelect(
      "producto.productoCaracteristicas",
      "productoCaracteristicas"
    )
    .leftJoinAndSelect("producto.productoClaves", "productoClaves")
    .leftJoinAndSelect("producto.productoPrecios", "productoPrecios")
    .leftJoinAndSelect("productoPrecios.precioTipo", "precioTipo")
    .leftJoinAndSelect("producto.area", "area")
    .leftJoinAndSelect("inventarioActual.bodega", "bodega")
    .where("area.id=1") // Maquillaje
    .andWhere("precioTipo.id=2") // COMPRA ORIGEN
    .andWhere("inventarioActual.disponible<>'baja'");

const reporteGeneral2 = async () => {
  const t0 = performance.now();
  const arch =
    process.env.RUTA_REPORTES + "RG" + Date.now().toString() + ".xlsx";
  const columnas = [
    "No.",
    "FOTOGRAFÍA",
    "CÓDIGO",
    "ARTÍCULO",
    "DESCRIPCIÓN",
    "AREA",
    "ALMACEN",
    "ESTADO",
    "TOTAL",
    "NOTAS / COMENTARIOS",
  ];
  logger.debug("Iniciando generacion de reporte................");

  // const query= queryReporteGeneral();

  // const workbook=new Workbook();
  // new stream.xlsx.WorksheetReader({})
  const workbook = new stream.xlsx.WorkbookWriter({
    filename: arch,
    useStyles: true,
    useSharedStrings: true,
  });
  workbook.creator = "Sistema Almacén Exogrid";
  workbook.created = new Date();
  const sheet = workbook.addWorksheet("GENERAL");
  // console.log("sheet",sheet)
  // const sheet=new stream.xlsx.WorksheetReader({
  //     workbook,
  //     id:1,

  // })
  // sheet.commit();

  await configurarHojaExcel(sheet, columnasDetalle);

  await agregarTituloHojaExcel(sheet, workbook, 10, "REPORTE GENERAL");
  // workbook.commit();

  // const tbl = await agregarTabla(sheet,columnas,'A3',obtenerRenglones( await queryReporteGeneral().take(50).getMany() ) )

  // await agregarDatosRenglones(tbl,queryReporteGeneral(),50,50)

  // await agregarImagenes(sheet,workbook,queryReporteGeneralImagenes(),0,5)
  await workbook.commit();

  // console.log("Imagenes de productos agregados................", performance.now() - t0)
  const arch2 =
    process.env.RUTA_REPORTES + "RG-2-" + Date.now().toString() + ".xlsx";
  // workbook.xlsx.writeFile(arch2);
  logger.debug("Workbook guardado .............", performance.now() - t0);
  logger.debug("ARCHIVO EXCEL....", arch);
  // console.log("ARCHIVO EXCEL....", arch2)
  // console.log("ARCHIVO EXCEL....", arch2)

  logger.debug(
    "...............FIN DE REPORTE.............",
    performance.now() - t0
  );

  return arch;
};

const reporteMaquillajeGeneral = async () => {
  const t0 = performance.now();
  const arch =
    process.env.RUTA_REPORTES + "RG" + Date.now().toString() + ".xlsx";
  logger.debug("Iniciando generacion de reporte................");

  const [articulos, total] = await AppDataSource.getRepository(InventarioActual)
    .createQueryBuilder("inventarioActual")
    .innerJoinAndSelect("inventarioActual.producto", "producto")
    .leftJoinAndSelect("producto.archivos", "archivos")
    .leftJoinAndSelect(
      "producto.productoCaracteristicas",
      "productoCaracteristicas"
    )
    .leftJoinAndSelect("producto.productoClaves", "productoClaves")
    .leftJoinAndSelect("producto.productoPrecios", "productoPrecios")
    .leftJoinAndSelect("productoPrecios.precioTipo", "precioTipo")
    .leftJoinAndSelect("producto.area", "area")
    .leftJoinAndSelect("inventarioActual.bodega", "bodega")
    .where("area.id=1") // Maquillaje
    .andWhere("precioTipo.id=2") // COMPRA ORIGEN
    .andWhere("inventarioActual.disponible<>'baja'")
    .getManyAndCount();

  logger.debug(
    "Datos obtenidos de la DB................",
    performance.now() - t0
  );

  const workbook = new Workbook();
  workbook.creator = "Sistema Almacén Exogrid";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("General");

  // CONFIGURAR HOJA
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
  const alignment = { vertical: "middle", horizontal: "center" };

  for (let index = 1; index <= 10; index++) {
    sheet.getColumn(index).font = font8;
    sheet.getColumn(index).alignment = {
      wrapText: true,
      vertical: "middle",
      horizontal: "center",
    };
    // sheet.getColumn(index).width=5.14;
  }
  (sheet.getColumn(1).width = 5.14), // numero partida
    (sheet.getColumn(2).width = 10.71); // foto
  sheet.getColumn(3).width = 11.43; // clave
  sheet.getColumn(4).width = 13.71; // articulo

  sheet.getColumn(5).width = 43.29; // descripcion
  sheet.getColumn(5).font = font7;

  sheet.getColumn(6).width = 16.14; // area
  sheet.getColumn(7).width = 20.29; // almacen
  sheet.getColumn(8).width = 20.29; // estado

  sheet.getColumn(9).width = 13.29; // precio
  sheet.getColumn(9).numFmt = '"$"#,##0.00';

  sheet.getColumn(10).width = 43.29; // notas y comentarios

  /// TITULO
  sheet.getRow(1).height = 32.25;
  sheet.mergeCells("A1:M1");
  sheet.getCell("A1").value = "MAQUILLAJE";
  const img = workbook.addImage({
    filename: process.env.ARCHIVOS_AUXILIARES + "sony-tv-logo.jpg",
    extension: "jpeg",
  });
  sheet.addImage(img, {
    editAs: "absolute",
    tl: { col: 0, row: 0 },
    ext: { width: 73, height: 38 },
  });

  /// REGISTROS
  // await GrupoController.generarExcel(workbook,query,0,100);

  const renglones = articulos.map((item, idx) => {
    return [
      idx + 1,
      "",
      item.producto.productoClaves[item.producto.productoClaves.length - 1]
        .barras, // clave más reciente
      item.producto.titulo, // artículo
      item.producto.descripcion.trim(), // descripcion
      item.producto.area.nombre, // area
      item.bodega.nombre, // almacen
      item.disponible, // estado
      item.cantidadAlmacen *
      item.producto.productoPrecios[
        item.producto.productoPrecios.findIndex(
          (pp) => pp.precioTipo.id === 2
        )
      ].precio, // DONE total $$$
      item.producto.productoCaracteristicas
        .map((it) => `${it.llave}:${it.valor}`)
        .join("\n"), // notas y comentarios
    ];
  });

  const tbl = sheet.addTable({
    name: `T-${Date.now().toString()}`,
    ref: "A3",
    headerRow: true,
    totalsRow: true,
    style: {
      theme: "TableStyleMedium15",
      showRowStripes: true,
    },
    columns: [
      { name: "No.", totalsRowLabel: "", filterButton: false },
      {
        name: "FOTOGRAFÍA",
        /* totalsRowFunction: 'sum',*/ filterButton: false,
      },
      { name: "CÓDIGO", /* totalsRowFunction: 'sum',*/ filterButton: true },
      { name: "ARTÍCULO", /* totalsRowFunction: 'sum',*/ filterButton: true },
      { name: "DESCRIPCIÓN", /* totalsRowLabel: 'TOTAL',*/ filterButton: true },
      { name: "AREA", /* totalsRowFunction: 'sum',*/ filterButton: true },
      { name: "ALMACEN", /* totalsRowFunction: 'sum',*/ filterButton: true },
      { name: "ESTADO", /* totalsRowFunction: 'sum',*/ filterButton: true },
      {
        name: "TOTAL",
        totalsRowFunction: "custom",
        totalsRowFormula: `sum(I4:I${total + 3})`,
        filterButton: true,
      },
      {
        name: "NOTAS / COMENTARIOS",
        /* totalsRowFunction: 'sum',*/ filterButton: true,
      },
      //   {name: 'PROVEEDOR',/* totalsRowFunction: 'sum',*/ filterButton: true},
    ],
    rows: renglones,
  });
  // tbl.addRow()
  logger.debug("Tabla agregada................", performance.now() - t0);

  // COLOCANDO IMAGENES
  let rowInc = 0;
  for (const item of articulos) {
    if (item.producto.archivos.length > 0) {
      const data = (
        await sharp(item.producto.archivos[0].data)
          .resize(64, 64)
          .withMetadata().toFormat('jpeg')
          .toBuffer()
      ).toString("base64");
      const base64 = `data:${item.producto.archivos[0].tipo};base64,${data}`;
      const idImage = workbook.addImage({
        base64,
        extension: "jpeg",
      });
      // console.log(`idImage: ${idImage}`);

      sheet.addImage(idImage, {
        editAs: "",
        tl: { col: 1.15, row: rowInc + 3.35 },
        ext: { width: 60, height: 60 },
      });
    }
    sheet.getRow(rowInc + 4).height = 60;
    rowInc++;
  }

  logger.debug(
    "Imagenes de productos agregados................",
    performance.now() - t0
  );

  await workbook.xlsx.writeFile(arch);
  logger.debug("Workbook guardado .............", performance.now() - t0);

  logger.debug("ARCHIVO EXCEL....", arch);

  logger.debug(
    "...............FIN DE REPORTE.............",
    performance.now() - t0
  );

  return arch;
};

const reportePorGrupo = async (body: any) => {
  const {
    grupoNombre,
    movimientoTipoNombre,
    conFoto,
    grupoId,
    sortField,
    sortOrder,
    filters,
    nombreAlmacenista,
    ...nuevoBody
  } = body;

  const t0 = performance.now();

  const gres = await AppDataSource.getRepository(Grupo)
    .createQueryBuilder("Grupo")
    .leftJoinAndSelect("Grupo.grupoDetalle", "GrupoDetalle")
    .leftJoinAndSelect("GrupoDetalle.usuarios", "Usuarios")
    .leftJoinAndSelect("GrupoDetalle.proyecto", "Proyecto")
    .where("Grupo.id = :grupoId", { grupoId })
    .getOne();

  // console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>gres", gres, gres.grupoDetalle);
  const proyectoNombre = gres?.grupoDetalle?.proyecto?.nombre ?? "SIN PROYECTO";


  const nombreReporte = sanitizeFilename(
    `${movimientoTipoNombre ?? grupoNombre} ${proyectoNombre ?? ""}_${Math.trunc(Math.random() * 1000000)}.xlsx`
  );

  logger.debug(
    `"Iniciando generacion de reporte......${nombreReporte}.........."`
  );
  // // process.send({r:0,message:"Iniciando generacion de reporte......nombreReporte.........."});

  const workbook = new Workbook();

  workbook.creator = "Sistema Almacén Exogrid";
  workbook.created = new Date();
  const sheet = workbook.addWorksheet(movimientoTipoNombre ?? "REPORTE");

  await configurarHojaExcel(sheet, columnasDetallePorProyecto);

  await agregarTituloHojaExcel(
    sheet,
    workbook,
    columnasDetallePorProyecto.length,
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
    columnasDetallePorProyecto,
    "A3",
    obtenerRenglonesMovimientoProyecto(await qry.take(50).getMany(), 0)
    // obtenerRenglonesMovimiento(await qry.take(50).getMany(), 0)
  );
  // console.log("agregarTabla.....nombreReporte...........", performance.now() - t0)
  // process.send({r:0,message:"4"});

  let incRenglones = 0;

  while (
    await agregarDatosRenglonesMovimientoProyecto(tbl, qry, 50 + incRenglones * 50, 50)
    // await agregarDatosRenglonesMovimiento(tbl, qry, 50 + incRenglones * 50, 50)
  ) {
    logger.debug(
      `agregarDatosRenglones. ${incRenglones} Regs:${50 + incRenglones * 50}-${50 + incRenglones * 50 + 50
      }......${nombreReporte}.........`,
      performance.now() - t0
    );
    // process.send({r:0,message:`6 + ${incRenglones}`});
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
      // process.send({r:0,message:`7 + ${incImagenes}`});
      incImagenes++;
    }
  }

  // qry.getCount();


  // const totalRows = tbl.rows.length;
  const totalRows = await qryTotal.getCount();
  logger.debug(">>>>>>>>>>>>>>>>>>totalRows", totalRows);
  if (totalRows > 0) {

    const nombreResponsable = gres?.grupoDetalle?.usuarios?.map((it) => it.nombre).join("\r\n") ?? "SIN RESPONSABLE";
    // const nombreResponsable = tbl.rows[0][columnasDetallePorProyecto.length - 1];


    // sheet.getCell(`A${totalRows + 7}`).value = `Fecha: ${new Date().toLocaleString()}`;


    mergeCellsAndInsertData(sheet, `F${totalRows + 9}:G${totalRows + 9}`, `___________________________`);
    mergeCellsAndInsertData(sheet, `C${totalRows + 9}:D${totalRows + 9}`, `___________________________`);
    // sheet.getCell(`F${totalRows + 9}`).value = `_________________________________`;

    // sheet.getCell(`C${totalRows + 9}`).value = `_________________________________`;

    if (compareStringsIgnoreAccents(movimientoTipoNombre, 'PRÉSTAMO')
      || compareStringsIgnoreAccents(movimientoTipoNombre, 'RENTA EXTERNA')
      || compareStringsIgnoreAccents(movimientoTipoNombre, 'TRANSFERENCIA')
    ) {
      mergeCellsAndInsertData(sheet, `F${totalRows + 10}:G${totalRows + 10}`, `RECIBE`);
      mergeCellsAndInsertData(sheet, `C${totalRows + 10}:D${totalRows + 10}`, `ENTREGA`);
      // sheet.getCell(`F${totalRows + 10}`).value = `RECIBE`;
      // sheet.getCell(`C${totalRows + 10}`).value = `ENTREGA`;
    } else if (compareStringsIgnoreAccents(movimientoTipoNombre, 'DEVOLUCIÓN')) {
      mergeCellsAndInsertData(sheet, `F${totalRows + 10}:G${totalRows + 10}`, `ENTREGA`);
      mergeCellsAndInsertData(sheet, `C${totalRows + 10}:D${totalRows + 10}`, `RECIBE`);
      // sheet.getCell(`F${totalRows + 10}`).value = `ENTREGA`;
      // sheet.getCell(`C${totalRows + 10}`).value = `RECIBE`;
    } else {
      // if (movimientoTipoNombre === 'COMPRA' ||
      //   movimientoTipoNombre === 'COMPRA*' ||
      //   movimientoTipoNombre === 'BAJA EN INVENTARIO' ||
      //   movimientoTipoNombre === 'BAJA JUSTIFICADA' ||
      //   movimientoTipoNombre === 'BAJA INJUSTIFICADA' ||
      //   movimientoTipoNombre === 'BAJA ADMINISTRADOR'
      // ) 

      mergeCellsAndInsertData(sheet, `F${totalRows + 10}:G${totalRows + 10}`, `RESPONSABLE`);
      mergeCellsAndInsertData(sheet, `C${totalRows + 10}:D${totalRows + 10}`, `ALMACENISTA`);
      //
      // sheet.getCell(`F${totalRows + 10}`).value = `RESPONSABLE`;
      // sheet.getCell(`C${totalRows + 10}`).value = `ALMACENISTA`;
    }

    // agregar nombre del almacenista al final del archivo

    mergeCellsAndInsertData(sheet, `F${totalRows + 11}:G${totalRows + 11}`, `${nombreResponsable}`);
    mergeCellsAndInsertData(sheet, `C${totalRows + 11}:D${totalRows + 11}`, `${nombreAlmacenista}`);

    // sheet.getCell(`F${totalRows + 11}`).value = `${nombreResponsable}`;
    // sheet.getCell(`C${totalRows + 11}`).value = `${nombreAlmacenista}`;


  }


  const arch = process.env.RUTA_REPORTES + nombreReporte;
  logger.debug(
    `"Workbook guardando ......${nombreReporte}......."`,
    performance.now() - t0
  );
  // // process.send({r:0,message:`8 + ${arch}`});
  await workbook.xlsx.writeFile(arch);
  // console.log("ARCHIVO EXCEL.........", arch)
  // // process.send({r:0,message:`9 + ${arch}`});

  logger.debug(
    `"FIN DE REPORTE ......${nombreReporte}......."`,
    performance.now() - t0
  );
  // // process.send({r:0,message:`10 + ${arch}`});

  return { path: arch, nombreReporte };
};

const reportePorGrupoFotoGrande = async (body: any) => {
  const {
    grupoNombre,
    movimientoTipoNombre,
    conFoto,
    grupoId,
    sortField,
    sortOrder,
    filters,
    nombreAlmacenista,
    ...nuevoBody
  } = body;

  const t0 = performance.now();

  const gres = await AppDataSource.getRepository(Grupo)
    .createQueryBuilder("Grupo")
    .leftJoinAndSelect("Grupo.grupoDetalle", "GrupoDetalle")
    .leftJoinAndSelect("GrupoDetalle.usuarios", "Usuarios")
    .leftJoinAndSelect("GrupoDetalle.proyecto", "Proyecto")
    .where("Grupo.id = :grupoId", { grupoId })
    .getOne();

  // console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>gres", gres, gres.grupoDetalle);
  const proyectoNombre = gres?.grupoDetalle?.proyecto?.nombre ?? "SIN PROYECTO";




  const nombreReporte = sanitizeFilename(
    `${movimientoTipoNombre ?? ""} ${proyectoNombre ?? ""}_BIGPIC_${Math.trunc(Math.random() * 1000000)}.xlsx`
  );

  logger.debug(
    `"Iniciando generacion de reporte......${nombreReporte}.........."`
  );
  // // process.send({r:0,message:"Iniciando generacion de reporte......nombreReporte.........."});

  const workbook = new Workbook();

  workbook.creator = "Sistema Almacén Exogrid";
  workbook.created = new Date();
  const sheet = workbook.addWorksheet(movimientoTipoNombre ?? "REPORTE");

  await configurarHojaExcel(sheet, columnasDetallePorProyectoFotoGrande);

  await agregarTituloHojaExcel(
    sheet,
    workbook,
    columnasDetallePorProyectoFotoGrande.length,
    `${movimientoTipoNombre ?? ""} ${proyectoNombre ?? ""}`.toLocaleUpperCase()
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
    columnasDetallePorProyectoFotoGrande,
    "A3",
    obtenerRenglonesMovimientoProyectoFotoGrande(await qry.take(50).getMany(), 0)
    // obtenerRenglonesMovimiento(await qry.take(50).getMany(), 0)
  );
  // console.log("agregarTabla.....nombreReporte...........", performance.now() - t0)
  // process.send({r:0,message:"4"});

  let incRenglones = 0;

  while (
    await agregarDatosRenglonesMovimientoProyectoFotoGrande(tbl, qry, 50 + incRenglones * 50, 50)
    // await agregarDatosRenglonesMovimiento(tbl, qry, 50 + incRenglones * 50, 50)
  ) {
    logger.debug(
      `agregarDatosRenglones. ${incRenglones} Regs:${50 + incRenglones * 50}-${50 + incRenglones * 50 + 50
      }......${nombreReporte}.........`,
      performance.now() - t0
    );
    // process.send({r:0,message:`6 + ${incRenglones}`});
    incRenglones++;
  }

  if (conFoto) {
    let incImagenes = 0;
    while (
      await agregarImagenesMovimientoFotoGrande(
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
      // process.send({r:0,message:`7 + ${incImagenes}`});
      incImagenes++;
    }
  }

  // qry.getCount();


  // const totalRows = tbl.rows.length;
  const totalRows = await qryTotal.getCount();
  logger.debug(">>>>>>>>>>>>>>>>>>totalRows", totalRows);
  if (totalRows > 0) {

    const nombreResponsable = gres?.grupoDetalle?.usuarios?.map((it) => it.nombre).join("\r\n") ?? "SIN RESPONSABLE";

    // agregar lineas de separacion
    mergeCellsAndInsertData(sheet, `F${totalRows + 9}:G${totalRows + 9}`, `___________________________`);
    mergeCellsAndInsertData(sheet, `C${totalRows + 9}:D${totalRows + 9}`, `___________________________`);

    // agregar titulo de entrega o recepcion
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
    pagination,
    filters,
    nombreAlmacenista,
    ...nuevoBody
  } = body;

  logger.debug("-----------------------------", {
    sortField,
    sortOrder,
    filters,
  });

  const proyectoNombre = (
    await AppDataSource.getRepository(Proyecto).findOne({ where: { id: idSeguro(proyectoId, "proyectoId") }, 
      select: { id: true, nombre: true },
      loadEagerRelations: false,
    })
  ).nombre;

  // const movimientoNombre = movimientoTipoId ? (await getRepository(MovimientoTipo).findOne(movimientoTipoId, {
  //   select: ["id", "nombre"],
  //   loadEagerRelations: false,
  // })).nombre:'';

  const areasNombres = areasIds ? (await AppDataSource.getRepository(Area).findBy({ id: In(areasIds) })).map(area => area.nombre).join(' - ') : '';
  // proyectoId,movimientoTipoId,usuariosIds,areasIds,bodegasIds,

  const t0 = performance.now();
  // const nombreReporte=`${proyectoNombre}_${movimientoTipoNombre}_${Math.trunc(Math.random()*10000000)}`
  const nombreReporte = sanitizeFilename(
    `${movimientoTipoNombre ?? "_"}_${areasNombres}_${proyectoNombre ?? "_"}_${Math.trunc(
      Math.random() * 1000000
    )}.xlsx`
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

  //   const campoOrden: string | string[] = sortField ? sortField : "movimiento.id";
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

  if (usuariosIds?.length > 0) {
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
    await agregarDatosRenglonesMovimientoProyecto(tbl, qry, 50 + incRenglones * 50, 50)
  ) {
    logger.debug(
      `agregarDatosRenglones. ${incRenglones} Regs:${50 + incRenglones * 50}-${50 + incRenglones * 50 + 50
      }......${nombreReporte}.........`,
      performance.now() - t0
    );
    // process.send({r:0,message:`6 + ${incRenglones}`});
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
      // process.send({r:0,message:`7 + ${incImagenes}`});
      incImagenes++;
    }
  }

  // const totalRows = tbl.rows.length;



  // agregar firma
  // nombreAlmacenista


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
    pagination,
    filters,
    ...nuevoBody
  } = body;
  logger.debug("-----------------------------", {
    sortField,
    sortOrder,
    filters,
  });

  const proyectoNombre = (
    await AppDataSource.getRepository(Proyecto).findOne({ where: { id: idSeguro(proyectoId, "proyectoId") }, 
      select: { id: true, nombre: true },
      loadEagerRelations: false,
    })
  ).nombre;

  const areasNombres = areasIds ? (await AppDataSource.getRepository(Area).findBy({ id: In(areasIds) })).map(area => area.nombre).join(' - ') : '';

  const t0 = performance.now();
  const nameProposal = [movimientoTipoNombre, areasNombres, proyectoNombre, Math.trunc(Math.random() * 1000000)]
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

  //   const campoOrden: string | string[] = sortField ? sortField : "movimiento.id";
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

  if (usuariosIds?.length > 0) {
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

  // console.log("SQL", qry.getSql());

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
    await agregarDatosRenglonesMovimientoCompras(
      tbl,
      qry,
      50 + incRenglones * 50,
      50
    )
  ) {
    logger.debug(
      `agregarDatosRenglones. ${incRenglones} Regs:${50 + incRenglones * 50}-${50 + incRenglones * 50 + 50
      }......${nombreReporte}.........`,
      performance.now() - t0
    );
    // process.send({r:0,message:`6 + ${incRenglones}`});
    incRenglones++;
  }

  let incRenglonesUSD = 0;

  while (
    await agregarDatosRenglonesMovimientoComprasUSD(
      tblUSD,
      qry,
      50 + incRenglones * 50,
      50
    )
  ) {
    logger.debug(
      `agregarDatosRenglones. ${incRenglonesUSD} Regs:${50 + incRenglonesUSD * 50
      }-${50 + incRenglonesUSD * 50 + 50}......${nombreReporte}......... USD`,
      performance.now() - t0
    );
    // process.send({r:0,message:`6 + ${incRenglones}`});
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

    //   await agregarImagenesMovimientoCompra(
    //     sheet,
    //     sheetUSD,
    //     workbook,
    //     qry,
    //     50 * incImagenes,
    //     50
    //   )
    // ) {
    //   console.log(
    //     `agregarDatosRenglones. ${incImagenes}.....${nombreReporte}..........`,
    //     performance.now() - t0
    //   );
    //   // process.send({r:0,message:`7 + ${incImagenes}`});
    //   incImagenes++;
    // }
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
    filters,
    ...nuevoBody
  } = body;

  const proyectoNombre = proyectoId > 0 ? (
    await AppDataSource.getRepository(Proyecto).findOne({ where: { id: idSeguro(proyectoId, "proyectoId") }, 
      select: { id: true, nombre: true },
      loadEagerRelations: false,
    })
  ).nombre : 'Todos';

  const t0 = performance.now();
  // const nombreReporte = `${Math.trunc(Math.random() * 10000000)}.xlsx`;
  const nombreReporte = sanitizeFilename(
    `${movimientoTipoNombre ?? "_"}_${proyectoNombre ?? "_"}_${Math.trunc(
      Math.random() * 1000000
    )}.xlsx`
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
    await agregarDatosRenglonesMovimiento(tbl, qry, 50 + incRenglones * 50, 50)
  ) {
    logger.debug(
      `agregarDatosRenglones. ${incRenglones} Regs:${50 + incRenglones * 50}-${50 + incRenglones * 50 + 50
      }......${nombreReporte}.........`,
      performance.now() - t0
    );
    // process.send({r:0,message:`6 + ${incRenglones}`});
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
      // process.send({r:0,message:`7 + ${incImagenes}`});
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


// const reporte

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
  reporteGeneral2,
  reporteMaquillajeGeneral,
  reportePorGrupo,
  reportePorPrestamosRentasActivas,
  reportePorProyecto,
  reportePorProyectoCompras,
  reportePorGrupoFotoGrande
};

