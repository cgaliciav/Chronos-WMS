/**
 * Carga inicial de una base nueva (cliente nuevo): siembra los catálogos que el API necesita para funcionar y crea el
 * primer administrador con contraseña temporal. Se niega a correr si la base ya tiene movimientos. Idempotente: una
 * segunda ejecución no inserta nada ni cambia la contraseña (salvo con `regenerar`).
 * Los catálogos salen de `catalogo.json` (generado por `extraerCatalogo.ts`); áreas, bodegas, proyectos y
 * proveedores los captura el cliente.
 */
import { DataSource, EntityManager } from "typeorm";
import { EstatusEstado } from "../entity/common/NombreEstatus";
import { Rol } from "../entity/Rol";
import { Usuario } from "../entity/Usuario";
import { asignarPasswordTemporal } from "../services/PasswordService";

export interface Catalogo {
  movimientoTipo: { id: number; nombre: string; estatus: string }[];
  rol: { nombre: string; codigoRol: string; estatus: string }[]; // sin id: se identifica por codigoRol
  precioTipo: { id: number; nombre: string; estatus?: string }[];
  facturaTipo: { id: number; nombre: string; estatus?: string }[];
  productoTipo: { id: number; nombre: string; estatus?: string }[];
  parametros: { llave: string; valor: string }[]; // se identifica por llave
}

export interface OpcionesSembrado {
  adminCorreo: string;
  adminNombre: string;
  regenerar?: boolean;
}

export interface ResultadoSembrado {
  adminCreado: boolean;
  passwordTemporal: string | null;
  insertados: Record<keyof Catalogo, number>;
}

/** La base ya tiene movimientos: no es una base nueva. */
export class BaseEnUsoError extends Error {}

const CODIGO_ADMIN = "ADMINISTRADOR";

/** `INSERT IGNORE` fila a fila; devuelve cuántas filas entraron de verdad (las repetidas no cuentan). */
const insertarIgnorando = async (manager: EntityManager, tabla: string, filas: Record<string, unknown>[]) => {
  let insertadas = 0;
  for (const fila of filas) {
    const columnas = Object.keys(fila);
    const resultado = await manager.query(
      `INSERT IGNORE INTO \`${tabla}\` (${columnas.map((c) => `\`${c}\``).join(", ")}) VALUES (${columnas.map(() => "?").join(", ")})`,
      columnas.map((c) => fila[c])
    );
    insertadas += Number(resultado.affectedRows ?? 0);
  }
  return insertadas;
};

export async function sembrarInicial(conexion: DataSource, catalogo: Catalogo, opciones: OpcionesSembrado): Promise<ResultadoSembrado> {
  return conexion.transaction(async (manager) => {
    if ((await manager.query("SELECT 1 FROM `movimiento` LIMIT 1")).length > 0) {
      throw new BaseEnUsoError("La base ya tiene movimientos: la carga inicial solo es para bases nuevas.");
    }

    const insertados = {
      movimientoTipo: await insertarIgnorando(manager, "movimiento_tipo", catalogo.movimientoTipo),
      rol: await insertarIgnorando(manager, "rol", catalogo.rol),
      precioTipo: await insertarIgnorando(manager, "precio_tipo", catalogo.precioTipo),
      facturaTipo: await insertarIgnorando(manager, "factura_tipo", catalogo.facturaTipo),
      productoTipo: await insertarIgnorando(manager, "producto_tipo", catalogo.productoTipo),
      parametros: await insertarIgnorando(manager, "parametros", catalogo.parametros),
    };

    const rolAdmin = await manager.findOneBy(Rol, { codigoRol: CODIGO_ADMIN });
    if (!rolAdmin) throw new Error(`El catálogo no incluye el rol ${CODIGO_ADMIN}.`);

    let admin = await manager.findOneBy(Usuario, { correo: opciones.adminCorreo });
    let adminCreado = false;
    let passwordTemporal: string | null = null;
    if (!admin) {
      const vencimiento = new Date();
      vencimiento.setFullYear(vencimiento.getFullYear() + 10);
      admin = Object.assign(new Usuario(), {
        nombre: opciones.adminNombre,
        correo: opciones.adminCorreo,
        vencimiento,
        estatus: EstatusEstado.ACTIVO,
        roles: [rolAdmin],
      });
      passwordTemporal = asignarPasswordTemporal(admin);
      await manager.save(admin);
      adminCreado = true;
    } else if (opciones.regenerar) {
      passwordTemporal = asignarPasswordTemporal(admin);
      await manager.save(admin);
    }
    return { adminCreado, passwordTemporal, insertados };
  });
}
