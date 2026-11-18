#!/usr/bin/env node
/**
 * Carga inicial de inventario · paso 2 de 2: envía el `carga.json` de `generar.mjs` al API, usando los mismos
 * endpoints que el front (así cada alta pasa por MovimientoService, con su transacción e histórico):
 *
 *   1. catálogos: bodega, áreas, proyectos y proveedores (los que ya existan por nombre se reutilizan)
 *   2. un listado de compra por factura      POST /groups/new-purchase
 *   3. cada artículo (producto + inventario)  PUT  /groups/activity-purchase   (tipo 15 COMPRA)
 *   4. su foto                                POST /file/file  (relacion "Producto")
 *   5. sus operaciones posteriores            POST /groups/new-details (un listado por proyecto y tipo) y
 *                                             PUT  /groups/activity  (4 DEVOLUCIÓN, 13 BAJA JUSTIFICADA): la
 *                                             devolución deja el artículo disponible; la baja consume el saldo de la compra
 *
 * Reanudable: lo hecho se anota en `estado-<host>.json` junto a carga.json; si se corta, se vuelve a ejecutar igual.
 *
 * Uso (Node ≥ 22, sin dependencias):
 *   CHRONOS_PASSWORD='…' node scripts/carga-inicial/subir.mjs --api https://<host>/api --carga <carpeta> --usuario <correo> [--simular] [--limite N]
 *
 *   --simular   solo valida el JSON e imprime el plan; no llama al API
 *   --limite N  sube solo los primeros N artículos (para probar en staging)
 */
import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const argv = process.argv.slice(2);
const opcion = (n) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : undefined; };
const bandera = (n) => argv.includes(`--${n}`);
const API = opcion("api")?.replace(/\/+$/, "");
const CARPETA = path.resolve(opcion("carga") ?? ".");
const USUARIO = opcion("usuario");
const SIMULAR = bandera("simular");
const LIMITE = opcion("limite") ? Number(opcion("limite")) : Infinity;

const carga = JSON.parse(await readFile(path.join(CARPETA, "carga.json"), "utf8"));

// ---------- validación local (misma forma que exige actividadCompraSchema en el API) ----------
const errores = [];
if (carga.formato !== "chronos-wms-carga-inicial" || carga.version !== 2) errores.push("formato/versión desconocidos");
const listadosPorClave = new Map(carga.listados.map((l) => [l.clave, l]));
const nombres = new Set();
for (const l of carga.listados) {
  if (nombres.has(l.nombre)) errores.push(`listado repetido: ${l.nombre}`);
  nombres.add(l.nombre);
  if (l.nombre.length < 3 || l.nombre.length > 255) errores.push(`nombre de listado fuera de 3-255: ${l.nombre}`);
  if (!carga.catalogos.proyectos.some((p) => p.nombre === l.proyecto)) errores.push(`${l.clave}: proyecto desconocido ${l.proyecto}`);
  if (!carga.catalogos.proveedores.includes(l.proveedor)) errores.push(`${l.clave}: proveedor desconocido ${l.proveedor}`);
  if (l.numero.length > 40) errores.push(`${l.clave}: número de factura > 40`);
}
const listadosOperacionPorClave = new Map((carga.listadosOperacion ?? []).map((l) => [l.clave, l]));
for (const l of listadosOperacionPorClave.values()) {
  if (nombres.has(l.nombre)) errores.push(`listado repetido: ${l.nombre}`);
  nombres.add(l.nombre);
  if (!carga.catalogos.proyectos.some((p) => p.nombre === l.proyecto)) errores.push(`${l.clave}: proyecto desconocido ${l.proyecto}`);
}
const claves = new Set();
for (const a of carga.articulos) {
  if (claves.has(a.clave)) errores.push(`artículo repetido: ${a.clave}`);
  claves.add(a.clave);
  if (!listadosPorClave.has(a.listado)) errores.push(`${a.clave}: listado inexistente`);
  if (!carga.catalogos.areas.includes(a.area)) errores.push(`${a.clave}: área desconocida ${a.area}`);
  if (!a.titulo || a.titulo.length > 255) errores.push(`${a.clave}: título vacío o > 255`);
  if (!(a.cantidad > 0)) errores.push(`${a.clave}: cantidad inválida`);
  if (a.precioUnitario < 0 || a.precioTotal < 0) errores.push(`${a.clave}: precio negativo`);
  for (const c of a.caracteristicas) if (!c.llave || c.llave.length > 60 || c.valor.length > 255) errores.push(`${a.clave}: característica inválida ${c.llave}`);
  if (a.foto && !existsSync(path.join(CARPETA, "fotos", a.foto))) errores.push(`${a.clave}: falta la foto ${a.foto}`);
  for (const o of a.operaciones ?? []) {
    const lo = listadosOperacionPorClave.get(o.listado);
    if (!lo) errores.push(`${a.clave}: listado de operación inexistente ${o.listado}`);
    else if (lo.movimientoTipoId !== o.tipo || lo.proyecto !== listadosPorClave.get(a.listado)?.proyecto) {
      errores.push(`${a.clave}: la operación ${o.tipo} no corresponde al tipo o proyecto de su listado`);
    }
    if (!(o.cantidad > 0)) errores.push(`${a.clave}: cantidad de operación inválida`);
  }
  // La compra deja todo "en el proyecto": las operaciones deben cubrir exactamente lo comprado.
  const cubierto = (a.operaciones ?? []).reduce((s, o) => s + o.cantidad, 0);
  if (Math.abs(cubierto - a.cantidad) > 1e-9) errores.push(`${a.clave}: operaciones por ${cubierto} ≠ cantidad comprada ${a.cantidad}`);
}
if (errores.length) {
  console.error(`carga.json tiene ${errores.length} errores:\n  ` + errores.join("\n  "));
  process.exit(1);
}

const articulos = carga.articulos.slice(0, LIMITE);
const listadosUsados = new Set(articulos.map((a) => a.listado));
const listadosOperacionUsados = new Set(articulos.flatMap((a) => a.operaciones.map((o) => o.listado)));
const piezasPorTipo = {};
for (const a of articulos) for (const o of a.operaciones) piezasPorTipo[o.tipo] = (piezasPorTipo[o.tipo] ?? 0) + o.cantidad;
console.log(`Plan: ${articulos.length} artículos en ${listadosUsados.size} listados (tipo ${carga.movimientoTipoId}), ` +
  `${articulos.filter((a) => a.foto).length} fotos; bodega "${carga.catalogos.bodega.nombre}", ` +
  `${carga.catalogos.areas.length} áreas, ${carga.catalogos.proyectos.length} proyectos, ${carga.catalogos.proveedores.length} proveedores.`);
console.log(`      después: ${listadosOperacionUsados.size} listados de operación; piezas por tipo de movimiento: ` +
  Object.entries(piezasPorTipo).map(([t, n]) => `${t} → ${n}`).join(", "));
if (carga.avisos?.length) console.log(`(${carga.avisos.length} avisos de generación en carga.json → "avisos")`);
if (SIMULAR) process.exit(0);

if (!API || !USUARIO || !process.env.CHRONOS_PASSWORD) {
  console.error("Faltan --api, --usuario o la variable CHRONOS_PASSWORD");
  process.exit(1);
}

// ---------- estado (reanudación) ----------
const ARCHIVO_ESTADO = path.join(CARPETA, `estado-${new URL(API).host.replace(/[^a-z0-9.-]/gi, "_")}.json`);
const estado = existsSync(ARCHIVO_ESTADO)
  ? JSON.parse(await readFile(ARCHIVO_ESTADO, "utf8"))
  : { api: API, version: carga.version, generado: carga.generado, catalogos: {}, listados: {}, listadosOperacion: {}, articulos: {} };
// Un estado de otra versión de carga.json (p. ej. la carga v1, solo compras) no sirve para reanudar: mezclaría
// artículos de dos cargas distintas. Hay que partir de una base limpia y borrar o mover ese archivo.
if (estado.version !== carga.version || estado.generado !== carga.generado) {
  console.error(`${ARCHIVO_ESTADO} es de otra carga (versión ${estado.version ?? 1}, generada ${estado.generado ?? "?"}). ` +
    "Si el servidor se reinició, mueve ese archivo fuera de la carpeta y vuelve a ejecutar.");
  process.exit(1);
}
const guardarEstado = () => writeFile(ARCHIVO_ESTADO, JSON.stringify(estado, null, 2) + "\n");

// ---------- cliente HTTP ----------
let token = null;
const llamar = async (metodo, ruta, cuerpo) => {
  const esForm = cuerpo instanceof FormData;
  const r = await fetch(`${API}${ruta}`, {
    method: metodo,
    headers: { ...(token ? { auth: token } : {}), ...(cuerpo && !esForm ? { "Content-Type": "application/json" } : {}) },
    body: cuerpo ? (esForm ? cuerpo : JSON.stringify(cuerpo)) : undefined,
  });
  const texto = await r.text();
  let datos;
  try { datos = texto ? JSON.parse(texto) : null; } catch { datos = texto; }
  if (!r.ok) throw new Error(`${metodo} ${ruta} → ${r.status}: ${typeof datos === "object" ? JSON.stringify(datos) : datos}`);
  return datos;
};

const login = await llamar("POST", "/auth/login", { c: USUARIO, p: process.env.CHRONOS_PASSWORD });
if (login.cambiarPassword) {
  console.error("El usuario tiene contraseña temporal: entra al sistema, cámbiala y vuelve a ejecutar.");
  process.exit(1);
}
token = login.t;
const usuarioId = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString()).ui;

// ---------- 1. catálogos ----------
const norm = (s) => String(s).normalize("NFC").trim().toUpperCase();
const asegurar = async (recurso, tipo, lista) => {
  estado.catalogos[tipo] ??= {};
  const existentes = await llamar("GET", `/${recurso}/list-names`);
  const porNombre = new Map(existentes.map((e) => [norm(e.nombre), e.id]));
  for (const item of lista) {
    const cuerpo = typeof item === "string" ? { nombre: item } : item;
    let id = porNombre.get(norm(cuerpo.nombre));
    if (id == null) {
      id = (await llamar("POST", `/${recurso}/new`, cuerpo)).id;
      console.log(`  + ${tipo}: ${cuerpo.nombre} (#${id})`);
    }
    estado.catalogos[tipo][cuerpo.nombre] = id;
  }
  await guardarEstado();
};
console.log("1/4 catálogos");
await asegurar("warehouse", "bodega", [carga.catalogos.bodega]);
await asegurar("area", "areas", carga.catalogos.areas);
await asegurar("project", "proyectos", carga.catalogos.proyectos);
await asegurar("supplier", "proveedores", carga.catalogos.proveedores);
const bodegaId = estado.catalogos.bodega[carga.catalogos.bodega.nombre];

// ---------- 2. listados de compra ----------
console.log("2/4 listados de compra");
for (const clave of listadosUsados) {
  if (estado.listados[clave]) continue;
  const l = listadosPorClave.get(clave);
  const grupo = await llamar("POST", "/groups/new-purchase", {
    nombre: l.nombre,
    proyectoId: estado.catalogos.proyectos[l.proyecto],
    movimientoTipoId: carga.movimientoTipoId,
    usuariosIds: [usuarioId],
    numero: l.numero,
    fechaEmision: l.fechaEmision,
    total: l.total,
    impuestos: l.impuestos,
    montoIngresado: l.montoIngresado,
    proveedorId: estado.catalogos.proveedores[l.proveedor],
    facturaTipoId: l.facturaTipoId,
  });
  estado.listados[clave] = grupo.id;
  await guardarEstado();
  console.log(`  + listado #${grupo.id}: ${l.nombre}`);
}

// ---------- 3. listados de devolución y baja ----------
console.log("3/4 listados de operación");
for (const clave of listadosOperacionUsados) {
  if (estado.listadosOperacion[clave]) continue;
  const l = listadosOperacionPorClave.get(clave);
  const grupo = await llamar("POST", "/groups/new-details", {
    nombre: l.nombre,
    proyectoId: estado.catalogos.proyectos[l.proyecto],
    movimientoTipoId: l.movimientoTipoId,
    usuariosIds: [usuarioId],
  });
  estado.listadosOperacion[clave] = grupo.id;
  await guardarEstado();
  console.log(`  + listado #${grupo.id}: ${l.nombre}`);
}

// ---------- 4. artículos, fotos y operaciones ----------
console.log("4/4 artículos");
let hechos = 0, fallidos = 0;
for (const a of articulos) {
  const e = (estado.articulos[a.clave] ??= {});
  try {
    if (!e.productoId) {
      const l = listadosPorClave.get(a.listado);
      const mov = await llamar("PUT", "/groups/activity-purchase", {
        cantidad: a.cantidad,
        movimientoTipoId: carga.movimientoTipoId,
        proyectoId: estado.catalogos.proyectos[l.proyecto],
        usuariosIds: [usuarioId],
        precioUnitario: a.precioUnitario,
        precioTotal: a.precioTotal,
        bodegaId,
        titulo: a.titulo,
        descripcion: a.descripcion ?? "",
        areaId: estado.catalogos.areas[a.area],
        moneda: carga.moneda,
        productoTipoId: carga.productoTipoId,
        productoCaracteristicas: a.caracteristicas,
        productoPrecioOriginal: a.productoPrecioOriginal,
        grupoId: estado.listados[a.listado],
      });
      e.movimientoId = mov.id;
      e.inventarioActualId = mov.inventarioActual?.id;
      e.productoId = mov.inventarioActual?.producto?.id;
      e.codigo = mov.inventarioActual?.producto?.productoClaves?.[0]?.barras;
      await guardarEstado();
    }
    if (a.foto && !e.fotoId) {
      const form = new FormData();
      const datos = await readFile(path.join(CARPETA, "fotos", a.foto));
      form.append("relacion", "Producto");
      form.append("id", String(e.productoId));
      form.append("file", new Blob([datos], { type: a.foto.endsWith(".png") ? "image/png" : "image/jpeg" }), a.foto);
      const archivo = await llamar("POST", "/file/file", form);
      e.fotoId = archivo?.id ?? true;
      await guardarEstado();
    }
    e.operaciones ??= {};
    for (const [i, o] of a.operaciones.entries()) {
      if (e.operaciones[i]) continue;
      if (!e.codigo) throw new Error("no tengo el código del artículo para registrar sus operaciones");
      const lo = listadosOperacionPorClave.get(o.listado);
      const mov = await llamar("PUT", "/groups/activity", {
        codigo: e.codigo,
        cantidad: o.cantidad,
        movimientoTipoId: o.tipo,
        proyectoId: estado.catalogos.proyectos[lo.proyecto],
        usuariosIds: [usuarioId],
        grupoId: estado.listadosOperacion[o.listado],
      });
      e.operaciones[i] = mov?.id ?? true;
      await guardarEstado();
    }
    delete e.error;
    hechos++;
    process.stdout.write(`\r  ${hechos}/${articulos.length} ${a.clave}                `);
  } catch (error) {
    fallidos++;
    e.error = String(error.message ?? error);
    await guardarEstado();
    console.error(`\n  ✗ ${a.clave} (${a.titulo}): ${e.error}`);
  }
}
console.log(`\nListo: ${hechos} artículos correctos, ${fallidos} con error. Estado en ${ARCHIVO_ESTADO}`);
console.log("Recuerda asignar la bodega y las áreas nuevas a los usuarios (Administración → Usuarios) para que vean los listados.");
process.exit(fallidos ? 2 : 0);
