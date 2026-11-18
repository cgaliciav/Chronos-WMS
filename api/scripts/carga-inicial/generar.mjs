#!/usr/bin/env node
/**
 * Carga inicial de inventario de un cliente (primer uso: AMZ, noviembre 2026).
 *
 * Paso 1 de 2: lee los reportes del cliente (Excel con el formato de las plantillas "PCAT_*" y "VNTA_*", y el CSV
 * transcrito del catálogo en PDF) y escribe un `carga.json` revisable a mano, más las fotos extraídas en `fotos/`.
 * El paso 2 (`subir.mjs`) lo envía al API.
 *
 * Uso (desde api/, que ya tiene exceljs en node_modules):
 *   node scripts/carga-inicial/generar.mjs --entrada <carpeta con los reportes> --salida <carpeta> [--pdf-csv <csv>] [--pdf-fotos <carpeta>]
 *
 * Nada de esto se versiona: los reportes y el JSON contienen precios, proveedores y folios fiscales del cliente.
 */
import ExcelJS from "exceljs";
import { mkdir, readdir, readFile, writeFile, copyFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

// ---------- argumentos ----------
const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, arr) => (a.startsWith("--") ? [...acc, [a.slice(2), arr[i + 1]]] : acc), [])
);
if (!args.entrada || !args.salida) {
  console.error("Uso: generar.mjs --entrada <carpeta> --salida <carpeta> [--pdf-csv <csv>] [--pdf-fotos <carpeta>]");
  process.exit(1);
}
const SALIDA = path.resolve(args.salida);
const FOTOS = path.join(SALIDA, "fotos");
await mkdir(FOTOS, { recursive: true });

// ---------- catálogos (decisiones del propietario, 2026-11-10) ----------
const BODEGA = "BODEGA CEDRO";
const PROYECTOS = {
  PCAT: { nombre: "POR CATÁLOGO S1", descripcion: "Serie Por Catálogo, temporada 1" },
  VNTA: { nombre: "LA VENTA", descripcion: "Proyecto La Venta" },
  NEGRO: { nombre: "EL NEGRO", descripcion: "Proyecto El Negro (bodega Cedro, decoración y utilería)" },
};
const AREAS = { PRODUCCION: "PRODUCCIÓN", MAQUILLAJE: "MAQUILLAJE Y PEINADO", UTILERIA: "UTILERÍA", DECORACION: "DECORACIÓN" };
const PROVEEDOR_SIN_FACTURA = "SIN PROVEEDOR (INVENTARIO INICIAL)";
// Variantes del mismo proveedor en los reportes (mismo folio fiscal con dos nombres, erratas).
const ALIAS_PROVEEDOR = { "THE HOME DEPOT MEXICO": "HOME DEPOT MEXICO", "OFFICE DEPTO MEXICO": "OFFICE DEPOT MEXICO" };
const ALIAS_ESTADO = { BEUNO: "BUENO" };
// Ids fijos del catálogo de Sony que se siembra en bases nuevas (api/src/semilla/catalogo.json).
const FACTURA_TIPO = { FISCAL_NACIONAL: 1, RECIBO: 6 };
const PRODUCTO_TIPO_REGULAR = 1;
const T = { COMPRA: 15, DEVOLUCION: 4, BAJA_JUSTIFICADA: 13 };
// Valor simbólico de lo que no tiene factura (La Venta y el catálogo PDF): $1 MXN por pieza.
const PRECIO_SIN_FACTURA = 1;

// ---------- utilidades ----------
const limpio = (v) => (v == null ? "" : String(v).replace(/\s+/g, " ").trim());
const mayus = (v) => limpio(v).toUpperCase();
const vacioONa = (v) => ["", "-", "N/A", "NA", "N/D"].includes(mayus(v));
const num = (v) => (v === "" || v == null ? null : Number(v));
const r2 = (n) => Math.round(n * 100) / 100;
const r4 = (n) => Math.round(n * 10000) / 10000;
const corta = (s, max) => (s.length > max ? s.slice(0, max - 1) + "…" : s);
const fechaISO = (d) => (d instanceof Date ? d.toISOString().slice(0, 10) : null);

/** Valor "plano" de una celda de exceljs (fórmulas, texto enriquecido, hipervínculos). */
const valor = (celda) => {
  const v = celda?.value;
  if (v == null) return null;
  if (v instanceof Date) return v;
  if (typeof v === "object") {
    if ("result" in v) return v.result;
    if ("richText" in v) return v.richText.map((t) => t.text).join("");
    if ("text" in v) return v.text;
    return null;
  }
  return v;
};

const caracteristica = (llave, v) => (vacioONa(v) ? null : { llave, valor: corta(limpio(v), 255) });

const avisos = [];
const avisar = (clave, mensaje) => avisos.push({ clave, mensaje });

/** CSV mínimo (RFC 4180: comillas dobles, saltos de línea dentro de comillas). */
const leerCsv = (texto) => {
  const filas = [];
  let fila = [], campo = "", comillas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (comillas) {
      if (c === '"' && texto[i + 1] === '"') { campo += '"'; i++; }
      else if (c === '"') comillas = false;
      else campo += c;
    } else if (c === '"') comillas = true;
    else if (c === ",") { fila.push(campo); campo = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && texto[i + 1] === "\n") i++;
      fila.push(campo); filas.push(fila); fila = []; campo = "";
    } else campo += c;
  }
  if (campo !== "" || fila.length) { fila.push(campo); filas.push(fila); }
  const [cab, ...resto] = filas.filter((f) => f.some((x) => x.trim() !== ""));
  return resto.map((f) => Object.fromEntries(cab.map((h, i) => [h.trim(), f[i] ?? ""])));
};

// ---------- estructuras de salida ----------
const listados = new Map(); // clave → listado
const articulos = [];
const proveedores = new Set();

// Listados de devolución y de baja justificada: uno por proyecto y tipo (todas sus líneas son de ese tipo, decisión 11).
const listadosOperacion = new Map();
const NOMBRE_TIPO = { [T.DEVOLUCION]: "DEVOLUCIÓN", [T.BAJA_JUSTIFICADA]: "BAJA JUSTIFICADA" };
const operacion = (proyecto, tipo, cantidad) => {
  const clave = `${tipo}|${proyecto}`;
  if (!listadosOperacion.has(clave)) {
    listadosOperacion.set(clave, { clave, nombre: `INVENTARIO INICIAL · ${proyecto} · ${NOMBRE_TIPO[tipo]}`, proyecto, movimientoTipoId: tipo });
  }
  return { tipo, cantidad, listado: clave };
};

const listado = (clave, datos) => {
  if (!listados.has(clave)) listados.set(clave, { clave, ...datos, total: 0 });
  return listados.get(clave);
};

const guardarFoto = async (wb, imagen, destino) => {
  const img = wb.getImage(imagen.imageId);
  const archivo = `${destino}.${img.extension === "jpeg" ? "jpg" : img.extension}`;
  await writeFile(path.join(FOTOS, archivo), img.buffer);
  return archivo;
};

// ---------- PCAT: plantilla "# Inv. | Foto | Producto | Cantidad inicial | Valor compra | Total | …" ----------
const leerPcat = async (archivo, prefijo, areaClave) => {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(archivo);
  const ws = wb.worksheets[0];

  // Encabezado: fila cuya columna B dice "Foto". Metadatos: filas "Fecha última actualización", etc.
  let filaEncabezado = null, fechaReporte = null, encargado = "";
  ws.eachRow((row, n) => {
    const a = mayus(valor(row.getCell(1)));
    if (a.startsWith("FECHA ÚLTIMA") || a.startsWith("FECHA ULTIMA")) fechaReporte = valor(row.getCell(3));
    if (a.startsWith("NOMBRE DEL ENCARGADO")) encargado = limpio(valor(row.getCell(3)));
    if (!filaEncabezado && mayus(valor(row.getCell(2))) === "FOTO") filaEncabezado = n;
  });
  if (!filaEncabezado) throw new Error(`${archivo}: no encontré la fila de encabezado ("Foto" en la columna B)`);
  const col = {};
  ws.getRow(filaEncabezado).eachCell((c, i) => (col[mayus(valor(c))] = i));
  const c = (row, nombre) => (col[nombre] ? valor(row.getCell(col[nombre])) : null);

  // Fotos ancladas a la columna B (índice 1, base 0) de cada renglón; la de la fila 0 es el logotipo.
  const fotosPorFila = new Map();
  for (const img of ws.getImages()) {
    if (img.range.tl.nativeCol === 1 && img.range.tl.nativeRow + 1 > filaEncabezado) fotosPorFila.set(img.range.tl.nativeRow + 1, img);
  }

  const fecha = fechaISO(fechaReporte) ?? new Date().toISOString().slice(0, 10);
  const fuente = path.basename(archivo);
  for (let n = filaEncabezado + 1; n <= ws.rowCount; n++) {
    const row = ws.getRow(n);
    const titulo = mayus(c(row, "PRODUCTO"));
    if (!titulo) continue;
    const inv = c(row, "# INV.");
    const clave = `${prefijo}-${String(inv ?? n).padStart(3, "0")}`;
    const cantidad = num(c(row, "CANTIDAD INICIAL"));
    const actual = num(c(row, "CANTIDAD ACTUAL"));
    const valorCompra = num(c(row, "VALOR COMPRA"));
    const total = num(c(row, "TOTAL"));
    const proveedorReporte = mayus(c(row, "PROVEEDOR"));
    const proveedor = ALIAS_PROVEEDOR[proveedorReporte] ?? (proveedorReporte || PROVEEDOR_SIN_FACTURA);
    const folioReporte = vacioONa(c(row, "FOLIO FISCAL")) ? "" : mayus(c(row, "FOLIO FISCAL"));
    // Algunas celdas traen dos folios (artículo pagado en dos facturas): el listado es el del primero.
    const folios = folioReporte.match(/[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}/g) ?? (folioReporte ? [folioReporte] : []);
    const folio = folios[0] ?? "";
    const comprobacion = limpio(c(row, "NUM. COMPROBACIÓN O SOLICITUD"));
    const comentario = limpio(c(row, "COMENTARIO"));

    if (folios.length > 1) avisar(clave, `trae ${folios.length} folios fiscales; va en el listado del primero (${folio})`);
    if (proveedorReporte && proveedor !== proveedorReporte) avisar(clave, `proveedor "${proveedorReporte}" se unifica como "${proveedor}"`);
    if (!(cantidad > 0)) { avisar(clave, `sin "Cantidad inicial" válida (${cantidad}); se omite`); continue; }
    if (total == null && valorCompra == null) avisar(clave, "sin precio; se carga en 0");

    // Precio: "Total" manda; si no cuadra con cantidad × valor se avisa para revisión.
    const precioTotal = r2(total ?? (valorCompra ?? 0) * cantidad);
    const precioUnitario = r4(precioTotal / cantidad);
    if (valorCompra != null && total != null && Math.abs(valorCompra * cantidad - total) > 0.05) {
      avisar(clave, `Total ${total} ≠ cantidad ${cantidad} × valor ${valorCompra}; se usa Total (unitario ${precioUnitario})`);
    }

    // Un listado de compra por folio fiscal y proveedor (sin folio: uno por proveedor dentro del reporte).
    const claveListado = `${prefijo}|${proveedor}|${folio || "SIN-FOLIO"}`;
    const lst = listado(claveListado, {
      nombre: null, // se calcula al final
      proyecto: PROYECTOS.PCAT.nombre,
      proveedor,
      facturaTipoId: folio ? FACTURA_TIPO.FISCAL_NACIONAL : FACTURA_TIPO.RECIBO,
      numero: corta(folio || `${prefijo}-SIN-FOLIO`, 40),
      fechaEmision: fecha,
      impuestos: 0,
      comprobaciones: new Set(),
    });
    lst.total = r2(lst.total + precioTotal);
    if (comprobacion) lst.comprobaciones.add(comprobacion);
    proveedores.add(proveedor);

    const foto = fotosPorFila.has(n) ? await guardarFoto(wb, fotosPorFila.get(n), clave) : null;
    const base = {
      listado: claveListado,
      titulo: corta(titulo, 255),
      descripcion: comentario,
      area: AREAS[areaClave],
      caracteristicas: [
        caracteristica("Fuente", `${fuente} · renglón ${n}`),
        caracteristica("# Inv. (reporte)", inv),
        caracteristica("Proveedor", proveedorReporte || null),
        caracteristica("Folio fiscal", folios.join(" ")),
        caracteristica("Comprobación o solicitud", comprobacion),
        caracteristica("Personaje o set", c(row, "PERSONAJE O SET")),
        caracteristica("Estado", ALIAS_ESTADO[mayus(c(row, "ESTADO"))] ?? mayus(c(row, "ESTADO"))),
        caracteristica("Caja", c(row, "CAJA")),
        caracteristica("Cantidad inicial (reporte)", cantidad),
        caracteristica("Cantidad actual (reporte)", actual),
        caracteristica("Encargado", encargado),
        caracteristica("Comentario", comentario),
      ].filter(Boolean),
      foto,
    };
    const proyecto = PROYECTOS.PCAT.nombre;

    // Reglas del propietario (2026-11-17):
    //  - actual = inicial (o vacía): un artículo, compra + devolución de todo.
    //  - actual > inicial: solo la inicial (compra + devolución); el excedente queda como aviso.
    //  - actual < inicial: un artículo POR PIEZA (la baja en Chronos es total, no parcial). Las primeras `actual`
    //    piezas llevan devolución y el resto baja justificada. El total se reparte sin perder centavos.
    if (actual == null) avisar(clave, `sin "Cantidad actual"; se asume igual a la inicial (${cantidad})`);
    if (actual != null && actual > cantidad) avisar(clave, `cantidad actual ${actual} > inicial ${cantidad}: se carga solo la inicial`);
    if (actual == null || actual >= cantidad) {
      articulos.push({ clave, ...base, cantidad, precioUnitario, precioTotal, productoPrecioOriginal: precioUnitario,
        operaciones: [operacion(proyecto, T.DEVOLUCION, cantidad)] });
      continue;
    }
    if (!Number.isInteger(cantidad) || !Number.isInteger(actual) || actual < 0) {
      throw new Error(`${clave}: cantidades no enteras (${cantidad} → ${actual}); no se puede dividir por pieza`);
    }
    avisar(clave, `cantidad inicial ${cantidad} > actual ${actual}: ${cantidad} artículos de 1 pieza (${actual} devolución, ${cantidad - actual} baja justificada)`);
    const unitario = r2(precioTotal / cantidad);
    for (let k = 1; k <= cantidad; k++) {
      // La última pieza absorbe el redondeo para que la suma sea exactamente el Total del reporte.
      const precio = k < cantidad ? unitario : r2(precioTotal - unitario * (cantidad - 1));
      articulos.push({
        clave: `${clave}-${String(k).padStart(3, "0")}`,
        ...base,
        caracteristicas: [...base.caracteristicas, { llave: "Pieza", valor: `${k} de ${cantidad}` }],
        cantidad: 1,
        precioUnitario: precio,
        precioTotal: precio,
        productoPrecioOriginal: precio,
        operaciones: [operacion(proyecto, k <= actual ? T.DEVOLUCION : T.BAJA_JUSTIFICADA, 1)],
      });
    }
  }
};

// ---------- VNTA: "CAJA/PAQUETE | PROP | PERSONAJE | CONTINUIDAD | CANT | ORIGEN | FOTO" ----------
const leerVnta = async (archivo) => {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(archivo);
  const ws = wb.worksheets[0];
  let filaEncabezado = null;
  ws.eachRow((row, n) => { if (!filaEncabezado && mayus(valor(row.getCell(2))) === "PROP") filaEncabezado = n; });
  if (!filaEncabezado) throw new Error(`${archivo}: no encontré la fila de encabezado ("PROP" en la columna B)`);
  const fuente = path.basename(archivo);
  const claveListado = "VNTA|SIN-FACTURA";
  listado(claveListado, {
    nombre: "INVENTARIO INICIAL · LA VENTA · PROPS",
    proyecto: PROYECTOS.VNTA.nombre,
    proveedor: PROVEEDOR_SIN_FACTURA,
    facturaTipoId: FACTURA_TIPO.RECIBO,
    numero: "VNTA-INVENTARIO-INICIAL",
    fechaEmision: new Date().toISOString().slice(0, 10),
    impuestos: 0,
    comprobaciones: new Set(),
  });
  proveedores.add(PROVEEDOR_SIN_FACTURA);
  let i = 0;
  for (let n = filaEncabezado + 1; n <= ws.rowCount; n++) {
    const row = ws.getRow(n);
    const titulo = mayus(valor(row.getCell(2)));
    if (!titulo) continue;
    const clave = `VNTA-${String(++i).padStart(3, "0")}`;
    let cantidad = num(valor(row.getCell(5)));
    if (!(cantidad > 0)) { avisar(clave, `"${titulo}" sin cantidad; se carga 1 (revisar)`); cantidad = 1; }
    articulos.push({
      clave,
      listado: claveListado,
      titulo: corta(titulo, 255),
      descripcion: "",
      area: AREAS.UTILERIA,
      cantidad,
      precioUnitario: PRECIO_SIN_FACTURA,
      precioTotal: r2(PRECIO_SIN_FACTURA * cantidad),
      productoPrecioOriginal: PRECIO_SIN_FACTURA,
      operaciones: [operacion(PROYECTOS.VNTA.nombre, T.DEVOLUCION, cantidad)],
      caracteristicas: [
        caracteristica("Fuente", `${fuente} · renglón ${n}`),
        caracteristica("Caja o paquete", valor(row.getCell(1))),
        caracteristica("Personaje", valor(row.getCell(3))),
        caracteristica("Continuidad", valor(row.getCell(4))),
        caracteristica("Origen", valor(row.getCell(6))),
      ].filter(Boolean),
      foto: null,
    });
  }
};

// ---------- PDF transcrito: pagina,seccion,num,titulo,cantidad,anotacion_manuscrita,confianza,notas,foto ----------
const leerPdfCsv = async (archivoCsv, carpetaFotos) => {
  const filas = leerCsv(await readFile(archivoCsv, "utf8"));
  const claveListado = "NEGRO|SIN-FACTURA";
  listado(claveListado, {
    nombre: "INVENTARIO INICIAL · EL NEGRO · BODEGA CEDRO",
    proyecto: PROYECTOS.NEGRO.nombre,
    proveedor: PROVEEDOR_SIN_FACTURA,
    facturaTipoId: FACTURA_TIPO.RECIBO,
    numero: "CEDRO-INVENTARIO-INICIAL",
    fechaEmision: "2026-02-02", // fecha de creación del PDF
    impuestos: 0,
    comprobaciones: new Set(),
  });
  proveedores.add(PROVEEDOR_SIN_FACTURA);
  filas.forEach((f, i) => {
    const seccion = mayus(f.seccion).startsWith("DECO") ? "DECORACION" : "UTILERIA";
    const clave = `CEDRO-${seccion.slice(0, 4)}-${String(i + 1).padStart(3, "0")}`;
    const titulo = mayus(f.titulo);
    let cantidad = num(f.cantidad);
    if (!titulo) { avisar(clave, `renglón ${i + 2} del CSV sin título; se omite`); return; }
    // Cantidad 0 = foto adicional de un artículo ya contado (una anotación que abarca varias fotos).
    if (cantidad === 0) { avisar(clave, `"${titulo}" con cantidad 0 (foto adicional de otro renglón); se omite`); return; }
    if (!(cantidad > 0)) { avisar(clave, `"${titulo}" sin cantidad; se carga 1 (revisar)`); cantidad = 1; }
    if (mayus(f.confianza) === "BAJA") avisar(clave, `transcripción con confianza baja: ${limpio(f.notas)}`);
    let foto = null;
    if (f.foto && carpetaFotos && existsSync(path.join(carpetaFotos, f.foto))) foto = `${clave}${path.extname(f.foto)}`;
    articulos.push({
      clave,
      listado: claveListado,
      titulo: corta(titulo, 255),
      descripcion: limpio(f.notas),
      area: AREAS[seccion],
      cantidad,
      precioUnitario: PRECIO_SIN_FACTURA,
      precioTotal: r2(PRECIO_SIN_FACTURA * cantidad),
      productoPrecioOriginal: PRECIO_SIN_FACTURA,
      operaciones: [operacion(PROYECTOS.NEGRO.nombre, T.DEVOLUCION, cantidad)],
      caracteristicas: [
        caracteristica("Fuente", `Catálogo PDF Bodega Cedro · página ${f.pagina}${f.num ? ` · foto ${f.num}` : ""}`),
        caracteristica("Anotación en el catálogo", f.anotacion_manuscrita),
        caracteristica("Transcripción", `confianza ${limpio(f.confianza) || "?"}`),
      ].filter(Boolean),
      foto,
      _fotoOrigen: foto ? path.join(carpetaFotos, f.foto) : undefined,
    });
  });
};

// ---------- ejecución ----------
const entrada = path.resolve(args.entrada);
const archivos = (await readdir(entrada)).filter((f) => f.toLowerCase().endsWith(".xlsx"));
const buscar = (patron) => archivos.find((f) => patron.test(f.normalize("NFC")));

const pcatProd = buscar(/^PCAT.*PRODUCCI/i);
const pcatMaq = buscar(/^PCAT.*MAQUILLAJE/i);
const vnta = buscar(/^VNTA.*PROPS/i);
if (pcatProd) await leerPcat(path.join(entrada, pcatProd), "PCAT-PROD", "PRODUCCION");
if (pcatMaq) await leerPcat(path.join(entrada, pcatMaq), "PCAT-MAQ", "MAQUILLAJE");
if (vnta) await leerVnta(path.join(entrada, vnta));
if (args["pdf-csv"]) await leerPdfCsv(path.resolve(args["pdf-csv"]), args["pdf-fotos"] && path.resolve(args["pdf-fotos"]));
else avisar("PDF", "no se pasó --pdf-csv: el catálogo PDF de Bodega Cedro no se incluye");

for (const a of articulos) {
  if (a._fotoOrigen) await copyFile(a._fotoOrigen, path.join(FOTOS, a.foto));
  delete a._fotoOrigen;
}

// Nombres de listado únicos (grupo.nombre es UNIQUE, 3-255).
const usados = new Set();
const listadosSalida = [...listados.values()].map((l) => {
  const comp = [...l.comprobaciones].join(", ");
  let nombre = l.nombre ?? corta(`INVENTARIO INICIAL · ${l.proyecto} · ${l.proveedor}${comp ? ` · ${comp}` : ""}${l.numero.includes("-SIN-FOLIO") ? "" : ` · ${l.numero.slice(0, 8)}`}`, 250);
  let base = nombre, k = 2;
  while (usados.has(nombre)) nombre = `${base} (${k++})`;
  usados.add(nombre);
  const { comprobaciones, ...resto } = l;
  // El total de la factura es la suma de sus líneas (incluye los listados sin factura a $1 por pieza).
  const total = r2(articulos.filter((a) => a.listado === l.clave).reduce((s, a) => s + a.precioTotal, 0));
  return { ...resto, nombre, total, montoIngresado: total };
});
for (const l of listadosOperacion.values()) {
  if (usados.has(l.nombre)) throw new Error(`nombre de listado repetido: ${l.nombre}`);
  usados.add(l.nombre);
}

const carga = {
  formato: "chronos-wms-carga-inicial",
  version: 2, // v2: operaciones posteriores a la compra (devolución, baja justificada)
  generado: new Date().toISOString(),
  cliente: "AMZ",
  movimientoTipoId: T.COMPRA,
  productoTipoId: PRODUCTO_TIPO_REGULAR,
  moneda: "MXP",
  catalogos: {
    bodega: { nombre: BODEGA, descripcion: "Bodega Cedro (LOL)", cobacha: false },
    areas: [...new Set(articulos.map((a) => a.area))],
    proyectos: Object.values(PROYECTOS).filter((p) => listadosSalida.some((l) => l.proyecto === p.nombre))
      .map((p) => ({ ...p, productor: "AMZ", fechaInicio: "2026-01-01", esExterno: false })),
    proveedores: [...proveedores].sort(),
  },
  listados: listadosSalida,
  listadosOperacion: [...listadosOperacion.values()],
  articulos,
  avisos,
};
await writeFile(path.join(SALIDA, "carga.json"), JSON.stringify(carga, null, 2) + "\n");

const porArea = articulos.reduce((m, a) => ((m[a.area] = (m[a.area] ?? 0) + 1), m), {});
console.log(`carga.json: ${articulos.length} artículos, ${listadosSalida.length} listados, ${carga.catalogos.proveedores.length} proveedores`);
console.log("por área:", porArea);
const porTipo = {};
for (const a of articulos) for (const o of a.operaciones) porTipo[NOMBRE_TIPO[o.tipo]] = (porTipo[NOMBRE_TIPO[o.tipo]] ?? 0) + o.cantidad;
console.log(`piezas: ${articulos.reduce((s, a) => s + a.cantidad, 0)} compradas ·`, porTipo,
  `· importe $${articulos.reduce((s, a) => s + a.precioTotal, 0).toFixed(2)}`);
console.log(`fotos: ${articulos.filter((a) => a.foto).length} · avisos: ${avisos.length} (ver "avisos" en carga.json)`);
