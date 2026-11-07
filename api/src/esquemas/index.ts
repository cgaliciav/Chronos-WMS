import { z } from "zod";

/** Esquemas zod de los cuerpos de petición (asignación masiva e inyección por objeto: hallazgos H6, M2). */

const id = z.coerce.number().int().positive();
const idOpcional = id.optional().nullable();
const ids = z.array(id);
const cantidad = z.coerce.number().positive().max(999_999_999);
const dinero = z.coerce.number().min(0).max(999_999_999_999);
const texto = (max: number) => z.string().trim().min(1).max(max);

export const loginSchema = z
  .object({
    c: z.string().trim().min(3).max(100),
    p: z.string().min(1).max(200),
  })
  .strip(); // `ip` y cualquier otro campo se descartan (decisión 3c)

/**
 * Orígenes elegidos por el cliente para un regreso/baja/transferencia (plan 02 fase 3). Opcional: sin ellos el API
 * reparte por FIFO. `strict: true` pide un 409 con las candidatas si hay más de una salida abierta.
 */
const relaciones = z
  .array(z.object({ origenId: id, cantidad }).strip())
  .max(100)
  .optional()
  .nullable();
const strict = z.boolean().optional(); // sin coerce: "false" no debe convertirse en true

/** PUT /groups/activity */
export const actividadSchema = z
  .object({
    codigo: z.string().trim().min(4).max(40),
    cantidad,
    movimientoTipoId: idOpcional,
    proyectoId: idOpcional,
    usuariosIds: ids.optional().nullable(),
    grupoId: id,
    relaciones,
    strict,
  })
  .strip();

/** PUT /groups/activity-purchase */
export const actividadCompraSchema = z
  .object({
    cantidad,
    movimientoTipoId: id,
    proyectoId: idOpcional,
    usuariosIds: ids.optional().nullable(),
    precioUnitario: dinero.optional().nullable(),
    precioTotal: dinero.optional().nullable(),
    bodegaId: id,
    titulo: texto(255),
    descripcion: z.string().trim().max(5000).default(""),
    areaId: id,
    moneda: z.string().trim().length(3).default("MXP"),
    productoTipoId: id,
    productoCaracteristicas: z.array(z.object({ llave: texto(60), valor: z.string().max(255) })).default([]),
    productoPrecioOriginal: dinero,
    productoCodigos: z.array(z.object({ barras: texto(40), barrasTipo: z.string().trim().max(20).default("") })).optional().nullable(),
    grupoId: id,
  })
  .strip();

/** PUT /groups/activity-add-transaction */
export const agregarOperacionSchema = z
  .object({
    movimientoId: id,
    movimientoTipoId: id,
    proyectoId: idOpcional,
    usuariosIds: ids.optional().nullable(),
    relaciones,
    strict,
  })
  .strip();

/** DELETE /groups/activity */
export const quitarMovimientoSchema = z.object({ movimientoId: id }).strip();

const fecha = z.union([z.string().min(4), z.date()]);

/** POST /user/new — password, estatus e id NO se aceptan del cliente. */
export const usuarioNuevoSchema = z
  .object({
    nombre: texto(255),
    correo: z.string().trim().email().max(100),
    vencimiento: fecha,
    rolesIds: ids.default([]),
    proyectosIds: ids.default([]),
    bodegasIds: ids.default([]),
    areasIds: ids.default([]),
  })
  .strip();

/** PUT /user/edit */
export const usuarioEditarSchema = usuarioNuevoSchema.extend({ id }).strip();

/** PUT /user/renewpassword */
export const regenerarPasswordSchema = z.object({ email: z.string().trim().email().max(100) }).strip();

/** PUT /current-inventory/edit */
export const inventarioEditarSchema = z
  .object({
    inventarioActualId: id,
    bodegaId: id,
    fechaDisponibilidad: fecha.optional(),
  })
  .strip();
