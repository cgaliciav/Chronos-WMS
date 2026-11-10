import type { BusquedaPorProyecto, Id, PaginacionCatalogo, ParametrosCatalogo } from '../tipos'

const comoArreglo = (valor: Id | Id[] | null | undefined): Id[] => {
  if (valor === null || valor === undefined || valor === '') return []
  return Array.isArray(valor) ? valor : [valor]
}

/**
 * Cuerpo de `POST /current-inventory/list-catalog-project` a partir de la búsqueda guardada.
 * El `Select` de operación es simple (un id), pero el API exige arreglos de ids (`idsSeguros`) y, si
 * `movimientosTipoIds` falta, filtra con `1=0`: por eso se envía siempre, también al paginar.
 */
export const parametrosBusquedaProyecto = (
  busqueda: BusquedaPorProyecto,
  pagination: PaginacionCatalogo,
): ParametrosCatalogo => ({
  pagination,
  textoBusqueda: busqueda.textoBusqueda ?? '',
  areasIds: busqueda.areas,
  bodegaIds: busqueda.bodegas,
  proyectoId: busqueda.proyecto,
  movimientosTipoIds: comoArreglo(busqueda.tipoMovimiento),
})
