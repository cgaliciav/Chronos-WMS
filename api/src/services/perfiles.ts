import { Perfil } from "../entity/common/Perfil";

/**
 * Permisos de cada perfil (decisión 22). Único lugar donde se traduce un perfil a códigos de rol: los usa `checkRole`
 * (rutas del API) y `GET /user/current` (menú y `<ACL>` del front). Los códigos no necesitan existir en la tabla `rol`.
 *
 * Cada pantalla necesita tres familias de códigos: el del menú (y los de sus menús padre), el del `<ACL>` de la página
 * y uno por cada ruta del API que llama. Al añadir una pantalla a un perfil hay que poner las tres
 * (`docs/front/inventario-rutas.md` las lista por pantalla).
 */

/** Único código que abre la Configuración; `ADMINISTRADOR` no basta. */
export const CODIGO_CONFIGURACION = "CONFIGURACION-EDITAR";
export const CODIGO_ADMINISTRADOR = "ADMINISTRADOR";

/** Préstamos / Préstamos activos, solo lectura (sin reportes ni detalle). */
const PRESTAMOS_ACTIVOS = [
  "V-OPERACIONES-TITULO",
  "V-OPERACION-PRESTAMO",
  "V-OPERACION-PRESTAMOSACTIVOS",
  "GRUPOS-LISTAMOVIMIENTOSACTIVOS",
  "USUARIO-LISTADINAMICA",
  // Cambiar su propia contraseña (Administración / Usuarios / Cambiar Passwords)
  "V-ADMINISTRACION-TITULO",
  "V-ADMINISTRACION-USUARIOS",
  "V-ADMINISTRACION-USUARIOSCAMBIARPASSWORD",
];

const VISITA = [...PRESTAMOS_ACTIVOS];

const ENCARGADO_PRODUCCION = [
  ...PRESTAMOS_ACTIVOS,
  // Catálogo / Búsqueda por proyecto
  "V-CATALOGOS-TITULO",
  "V-CATALOGO-MENU",
  "V-CATALOGO-PROYECTO",
  "INVENTARIOACTUAL-CATALOGOPROYECTOS",
  "MOVIMIENTO-ULTIMOMOVIMIENTO",
  // Detalle del artículo y del movimiento (solo lectura)
  "V-ARTICULOS-DETALLE",
  "DETALLE-MOVIMIENTO",
  "INVENTARIOACTUAL-DETALLE",
  "MOVIMIENTO-HISTORIAL",
  "MOVIMIENTO-DETALLE",
  // Listados por proyecto de préstamos, devoluciones y bajas con proyecto (sin las pantallas de alta)
  "V-OPERACION-PRESTAMOPORPROYECTO",
  "V-OPERACION-DEVOLUCION",
  "V-OPERACION-DEVOLUCIONPORPROYECTO",
  "OPERACION-DEVOLUCIONESPORPROYECTO",
  "V-OPERACION-BAJA",
  "V-OPERACION-BAJACONPROYECTO",
  "V-OPERACION-BAJACONPROYECTO-LISTADOPORPROYECTO",
  "OPERACION-BAJASPORPROYECTO",
  "GRUPOS-LISTADETALLE",
  // Reportes Excel de los listados que ve
  "REPORTE-PROYECTO",
  "REPORTE-GRUPO",
  // Compras completas: nueva factura, operación (agregar y quitar artículos), edición y listados
  "V-OPERACION-COMPRA",
  "V-OPERACION-COMPRANUEVO",
  "V-OPERACION-COMPRAPORPROYECTO",
  "V-OPERACION-COMPRAPORGRUPO",
  "COMPRAS-NUEVO",
  "COMPRAS-OPERACION",
  "OPERACION-COMPRASPORPROYECTO",
  "OPERACION-COMPRASPORGRUPO",
  "GRUPOS-NUEVOCOMPRA",
  "GRUPOS-EDITARCOMPRA",
  "GRUPOS-DETALLE",
  "GRUPOS-BORRAR",
  "GRUPOS-HABILITAR",
  "GRUPOS-DESHABILITAR",
  "GRUPOS-LISTAMOVIMIENTOS",
  "GRUPOS-MOVIMIENTONUEVOCOMPRA",
  "GRUPOS-QUITARMOVIMIENTO",
  "TIPOSFACTURA-LISTASIMPLE",
  "PROVEEDOR-LISTADINAMICA",
  "AREA-LISTASIMPLE",
  "BODEGA-LISTASIMPLE",
  "PRODUCTOCARACTERISTICAS-NUEVO",
  "PRODUCTOCARACTERISTICAS-EDITAR",
  "PRODUCTOCARACTERISTICAS-BORRAR",
  "COMENTARIO-NUEVO",
  "COMENTARIO-BORRAR",
  "ARCHIVO-ARCHIVOSUBIR",
  "ARCHIVO-ARCHIVOBORRAR",
  "ARCHIVO-ARCHIVODATOS",
];

const CODIGOS: Record<Exclude<Perfil, Perfil.PERSONALIZADO>, string[]> = {
  [Perfil.SUPERADMINISTRADOR]: [CODIGO_ADMINISTRADOR, CODIGO_CONFIGURACION],
  [Perfil.ADMINISTRADOR]: [CODIGO_ADMINISTRADOR],
  [Perfil.ENCARGADO_PRODUCCION]: ENCARGADO_PRODUCCION,
  [Perfil.VISITA]: VISITA,
  [Perfil.SIN_ACCESO]: [],
};

/**
 * Códigos de rol efectivos de un usuario. Con un perfil definido los roles sueltos de la base se ignoran; solo el
 * perfil `personalizado` (usuarios anteriores a los perfiles) usa `rolesSueltos`.
 */
export const codigosDePerfil = (perfil: Perfil | null | undefined, rolesSueltos: string[] = []): string[] =>
  !perfil || perfil === Perfil.PERSONALIZADO ? rolesSueltos : CODIGOS[perfil];

/** Perfiles que se pueden asignar desde el formulario de usuarios (`personalizado` solo se conserva). */
export const PERFILES_ASIGNABLES = [Perfil.SUPERADMINISTRADOR, Perfil.ADMINISTRADOR, Perfil.ENCARGADO_PRODUCCION, Perfil.VISITA, Perfil.SIN_ACCESO] as const;

/** Dominio de los correos inventados para los usuarios sin correo (decisión 23): nunca se les envía nada. */
export const DOMINIO_SIN_CORREO = "fake.exogrid.io";
export const esCorreoFalso = (correo: string) => correo.trim().toLowerCase().endsWith(`@${DOMINIO_SIN_CORREO}`);

/** `Juan Pérez` → `juan.perez`: parte local del correo inventado. */
export const baseCorreoFalso = (nombre: string) =>
  nombre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "")
    .slice(0, 60) || "usuario";
