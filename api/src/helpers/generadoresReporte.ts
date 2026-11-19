import {
  reporteGeneral,
  reportePorGrupo,
  reportePorGrupoFotoGrande,
  reportePorPrestamosRentasActivas,
  reportePorProveedor,
  reportePorProyecto,
  reportePorProyectoCompras,
} from "./excelFunctions";

export interface ArchivoReporte {
  path: string;
  nombreReporte: string;
}

/**
 * Generadores de reportes Excel por nombre. El API pide un reporte por su nombre y el proceso de reportes
 * (`src/reporteProceso.ts`) lo ejecuta: así el cuerpo de la petición viaja como datos entre los dos procesos.
 */
const generadores = {
  porGrupo: reportePorGrupo,
  porGrupoFotoGrande: reportePorGrupoFotoGrande,
  porProyecto: reportePorProyecto,
  porProyectoCompras: reportePorProyectoCompras,
  prestamosRentasActivas: reportePorPrestamosRentasActivas,
  porProveedor: reportePorProveedor,
  cierre: reporteGeneral,
};

export type TipoReporte = keyof typeof generadores;

// El cuerpo llega de la petición (o del otro proceso) sin tipar: cada generador valida lo que usa.
export const GENERADORES: Record<TipoReporte, (body: any) => Promise<ArchivoReporte>> = generadores;

export const esTipoReporte = (tipo: unknown): tipo is TipoReporte => typeof tipo === "string" && Object.prototype.hasOwnProperty.call(generadores, tipo);
