import { z } from "zod";
import { Perfil } from "../entity/common/Perfil";
import { PERFILES_ASIGNABLES } from "../services/perfiles";

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

/**
 * PUT /groups/activity-transform (decisión 20): `cantidad` unidades del artículo `codigo`, que tiene la producción
 * `proyectoId`, se transforman en uno o más productos nuevos. Lo que no se indica de cada producto (área, tipo, precio)
 * se hereda del original.
 */
export const actividadTransformarSchema = z
  .object({
    codigo: z.string().trim().min(4).max(40),
    cantidad,
    proyectoId: id,
    usuariosIds: ids.optional().nullable(),
    grupoId: id,
    productos: z
      .array(
        z
          .object({
            titulo: texto(255),
            descripcion: z.string().trim().max(5000).default(""),
            cantidad,
            productoTipoId: idOpcional,
            areaId: idOpcional,
            precio: dinero.optional().nullable(),
          })
          .strip()
      )
      .min(1)
      .max(50),
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
    /** Obligatorio salvo con el perfil `sin-acceso` (usuario sin correo, decisión 23): ahí lo inventa el API. */
    correo: z.string().trim().email().max(100).optional(),
    vencimiento: fecha,
    /** De él salen los permisos (decisión 22). Los roles sueltos ya no se asignan. */
    perfil: z.enum(PERFILES_ASIGNABLES),
    proyectosIds: ids.default([]),
    bodegasIds: ids.default([]),
    areasIds: ids.default([]),
    /** Qué productos ve y opera (decisión 21). Sin indicar: `general` en el alta; en la edición se conserva. */
    modoVisibilidad: z.enum(["general", "produccion", "usuario"]).optional(),
  })
  .strip();

/** El correo solo puede faltar con el perfil `sin-acceso`; en la edición sin `perfil` lo decide el controlador. */
const correoSegunPerfil = (u: { perfil?: string; correo?: string }) => u.perfil === Perfil.SIN_ACCESO || u.perfil === undefined || !!u.correo;
const SIN_CORREO = { message: "El correo es obligatorio", path: ["correo"] };

/** POST /user/new con la regla del correo. */
export const usuarioNuevoValidadoSchema = usuarioNuevoSchema.refine(correoSegunPerfil, SIN_CORREO);

/** PUT /user/edit — sin `perfil` se conserva el que tiene (así sigue un usuario `personalizado`). */
export const usuarioEditarSchema = usuarioNuevoSchema
  .extend({ id, perfil: z.enum(PERFILES_ASIGNABLES).optional() })
  .strip()
  .refine(correoSegunPerfil, SIN_CORREO);

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
