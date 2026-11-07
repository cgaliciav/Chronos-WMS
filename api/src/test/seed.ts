import { Connection } from "typeorm";
import { Area } from "../entity/Area";
import { Bodega } from "../entity/Bodega";
import { EstatusEstado } from "../entity/common/NombreEstatus";
import { FacturaTipo } from "../entity/FacturaTipo";
import { MovimientoTipo } from "../entity/MovimientoTipo";
import { Parametros } from "../entity/Parametros";
import { PrecioTipo } from "../entity/PrecioTipo";
import { ProductoTipo } from "../entity/ProductoTipo";
import { Proveedor } from "../entity/Proveedor";
import { Proyecto } from "../entity/Proyecto";
import { Rol } from "../entity/Rol";
import { Sesion } from "../entity/Sesion";
import { Usuario } from "../entity/Usuario";

/** Ids fijos que las pruebas pueden dar por sentados. */
export const SEMILLA = {
  adminId: 1,
  adminCorreo: "admin@pruebas.local",
  adminPassword: "Admin123!",
  operadorId: 2,
  operadorCorreo: "operador@pruebas.local",
  operadorPassword: "Operador123!",
  sesionAdminId: 1,
  sesionOperadorId: 2,
  areaId: 1,
  bodegaId: 1,
  proyectoAId: 1,
  proyectoBId: 2,
  proveedorId: 1,
  facturaTipoId: 1,
  productoTipoId: 1,
};

/** Los 17 tipos de movimiento con los ids fijos de producción (docs/api/tipos-de-movimiento.md). */
export const TIPOS_MOVIMIENTO: [number, string][] = [
  [1, "COMPRA*"], [2, "ALTA*"], [3, "PRÉSTAMO"], [4, "DEVOLUCIÓN"], [5, "BAJA*"],
  [6, "AJUSTE INVENTARIO"], [7, "TRANSFERENCIA ORIGEN"], [8, "BAJA EN INVENTARIO"], [9, "INVENTARIO"],
  [10, "AJUSTE DE ADMINISTRADOR"], [11, "RENTA EXTERNA"], [12, "TRANSFERENCIA DESTINO"],
  [13, "BAJA JUSTIFICADA"], [14, "ALTA"], [15, "COMPRA"], [16, "BAJA INJUSTIFICADA"], [17, "BAJA ADMINISTRADOR"],
];

const PARAMETROS: [string, string][] = [
  ["porcentajeEdad0", "0.9"], ["porcentajeEdad1", "0.9"], ["porcentajeEdad2", "0.9"], ["porcentajeEdad3", "0.9"],
  ["porcentajeEdad4", "0.9"], ["porcentajeEdad5", "0.9"], ["minimoDepreciado", "100"],
  ["porcentajeRentaInterna", "0.05"], ["minimoRentaInterna", "10"],
  ["porcentajeRentaExterna", "0.10"], ["minimoRentaExterna", "20"],
];

/**
 * Siembra el catálogo mínimo para que el API funcione: tipos, roles, usuarios, sesiones, área,
 * bodega, proyectos, proveedor, tipos de factura/precio/producto y parámetros de depreciación.
 * Idempotente: usa `save` con ids fijos.
 */
export const sembrar = async (connection: Connection) => {
  const repo = <T>(e: new () => T) => connection.getRepository<T>(e);
  const silenciar = console.log;
  console.log = () => undefined; // el suscriptor de auditoría es ruidoso mientras no hay sesión
  try {
    await repo(MovimientoTipo).save(
      TIPOS_MOVIMIENTO.map(([id, nombre]) => Object.assign(new MovimientoTipo(), { id, nombre, estatus: EstatusEstado.ACTIVO }))
    );

    const rolAdmin = Object.assign(new Rol(), { id: 1, nombre: "Administrador", codigoRol: "ADMINISTRADOR" });
    const rolMovimiento = Object.assign(new Rol(), { id: 2, nombre: "Movimiento nuevo", codigoRol: "GRUPOS-MOVIMIENTONUEVO" });
    const rolListado = Object.assign(new Rol(), { id: 3, nombre: "Listado grupos", codigoRol: "GRUPOS-LISTADETALLE" });
    await repo(Rol).save([rolAdmin, rolMovimiento, rolListado]);

    const area = Object.assign(new Area(), { id: SEMILLA.areaId, nombre: "GENERAL" });
    await repo(Area).save(area);
    const bodega = Object.assign(new Bodega(), { id: SEMILLA.bodegaId, nombre: "PRINCIPAL", descripcion: "Bodega principal", cobacha: false });
    await repo(Bodega).save(bodega);
    const proyectoA = Object.assign(new Proyecto(), { id: SEMILLA.proyectoAId, nombre: "PROYECTO A", descripcion: "A", fechaInicio: new Date("2026-01-01"), productor: "Productor A", esExterno: false });
    const proyectoB = Object.assign(new Proyecto(), { id: SEMILLA.proyectoBId, nombre: "PROYECTO B", descripcion: "B", fechaInicio: new Date("2026-01-01"), productor: "Productor B", esExterno: false });
    const proyectoExterno = Object.assign(new Proyecto(), { id: 3, nombre: "RENTA EXTERNA X", descripcion: "Externo", fechaInicio: new Date("2026-01-01"), productor: "Externo", esExterno: true });
    await repo(Proyecto).save([proyectoA, proyectoB, proyectoExterno]);

    const vencimiento = new Date("2099-12-31");
    const admin = Object.assign(new Usuario(), {
      id: SEMILLA.adminId, nombre: "Admin Pruebas", correo: SEMILLA.adminCorreo, password: SEMILLA.adminPassword,
      vencimiento, estatus: EstatusEstado.ACTIVO, roles: [rolAdmin], areas: [area], bodegas: [bodega], proyectos: [proyectoA, proyectoB, proyectoExterno],
    });
    admin.hashPassword();
    const operador = Object.assign(new Usuario(), {
      id: SEMILLA.operadorId, nombre: "Operador Pruebas", correo: SEMILLA.operadorCorreo, password: SEMILLA.operadorPassword,
      vencimiento, estatus: EstatusEstado.ACTIVO, roles: [rolMovimiento, rolListado], areas: [area], bodegas: [bodega], proyectos: [proyectoA],
    });
    operador.hashPassword();
    await repo(Usuario).save([admin, operador]);

    await repo(Sesion).save([
      Object.assign(new Sesion(), { id: SEMILLA.sesionAdminId, IP: "127.0.0.1", usuario: admin }),
      Object.assign(new Sesion(), { id: SEMILLA.sesionOperadorId, IP: "127.0.0.1", usuario: operador }),
    ]);

    await repo(Proveedor).save(Object.assign(new Proveedor(), { id: SEMILLA.proveedorId, nombre: "PROVEEDOR UNO", RFCEmite: "XAXX010101000" }));
    await repo(FacturaTipo).save(
      ["Fiscal nacional", "Vale azul", "Nota de compra", "Extranjera", "Ticket", "Recibo / Comprobante"].map((nombre, i) =>
        Object.assign(new FacturaTipo(), { id: i + 1, nombre })
      )
    );
    await repo(PrecioTipo).save(
      ["DEPRECIACION", "COMPRA ORIGEN", "RENTA INTERNA", "RENTA EXTERNA"].map((nombre, i) => Object.assign(new PrecioTipo(), { id: i + 1, nombre }))
    );
    await repo(ProductoTipo).save(Object.assign(new ProductoTipo(), { id: SEMILLA.productoTipoId, nombre: "GENERAL" }));
    await repo(Parametros).save(PARAMETROS.map(([llave, valor], i) => Object.assign(new Parametros(), { id: i + 1, llave, valor })));
  } finally {
    console.log = silenciar;
  }
};
