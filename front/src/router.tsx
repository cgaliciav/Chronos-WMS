import { lazy, Suspense, type ComponentType } from 'react'
import { createHashRouter, Navigate, type RouteObject } from 'react-router'
import { Spin } from 'antd'
import RaizLayout from 'app/layouts/RaizLayout'
import ErrorPage from 'app/errors/ErrorPage'
import { useUsuarioStore } from 'stores/usuario.store'

type Cargador = () => Promise<{ default: ComponentType }>

/**
 * Rutas de la aplicación (hash routing: los enlaces `#/catalogo/general` siguen funcionando). Inventario con
 * roles y endpoints en `docs/front/inventario-rutas.md`.
 */
export const RUTAS: Array<[ruta: string, cargar: Cargador]> = [
  ['/usuarios/listado', () => import('pages/administracion/usuarios/listado')],
  ['/usuarios/cambiar-password', () => import('pages/administracion/usuarios/cambiarPassword')],
  ['/usuarios/nuevo', () => import('pages/administracion/usuarios/nuevo')],
  ['/usuarios/editar', () => import('pages/administracion/usuarios/editar')],
  ['/proyectos/listado', () => import('pages/administracion/proyectos/listado')],
  ['/proyectos/nuevo', () => import('pages/administracion/proyectos/nuevo')],
  ['/proyectos/editar', () => import('pages/administracion/proyectos/editar')],
  ['/proveedores/listado', () => import('pages/administracion/proveedores/listado')],
  ['/proveedores/nuevo', () => import('pages/administracion/proveedores/nuevo')],
  ['/proveedores/editar', () => import('pages/administracion/proveedores/editar')],
  ['/areas/listado', () => import('pages/administracion/areas/listado')],
  ['/areas/nuevo', () => import('pages/administracion/areas/nuevo')],
  ['/areas/editar', () => import('pages/administracion/areas/editar')],
  ['/bodegas/listado', () => import('pages/administracion/bodegas/listado')],
  ['/bodegas/nuevo', () => import('pages/administracion/bodegas/nuevo')],
  ['/bodegas/editar', () => import('pages/administracion/bodegas/editar')],
  ['/catalogo/general', () => import('pages/catalogos/1.general')],
  ['/catalogo/por-codigos', () => import('pages/catalogos/2.porCodigos')],
  ['/catalogo/bajas', () => import('pages/catalogos/3.bajas')],
  ['/catalogo/por-proyecto', () => import('pages/catalogos/4.porProyecto')],
  ['/catalogo/por-facturas', () => import('pages/catalogos/5.porFacturas')],
  ['/catalogo/validaciones', () => import('pages/catalogos/6.validaciones')],
  ['/articulos/detalle', () => import('pages/catalogos/articulos/detalle')],
  ['/articulos/editar/detalle', () => import('pages/catalogos/articulos/editarDetalle')],
  ['/articulos/validado', () => import('pages/catalogos/articulos/detalleValidaciones')],
  ['/catalogo/inventario', () => import('pages/catalogos/7.inventarioVisual')],
  ['/prestamos/nuevo', () => import('pages/operaciones/1.prestamos/nuevo')],
  ['/prestamos/por-grupo', () => import('pages/operaciones/1.prestamos/listado/porGrupo')],
  ['/prestamos/por-proyecto', () => import('pages/operaciones/1.prestamos/listado/porProyecto')],
  ['/prestamos/operacion', () => import('pages/operaciones/1.prestamos/operacion')],
  ['/prestamos/activos', () => import('pages/operaciones/1.prestamos/listado/porActivos')],
  ['/devoluciones/nuevo', () => import('pages/operaciones/2.devoluciones/nuevo')],
  ['/devoluciones/nuevo-externa', () => import('pages/operaciones/2.devoluciones/nuevoExterno')],
  ['/devoluciones/por-grupo', () => import('pages/operaciones/2.devoluciones/listado/porGrupo')],
  ['/devoluciones/por-proyecto', () => import('pages/operaciones/2.devoluciones/listado/porProyecto')],
  ['/devoluciones/operacion', () => import('pages/operaciones/2.devoluciones/operacion')],
  ['/bajas/nuevo', () => import('pages/operaciones/3.bajas/nuevo')],
  ['/bajas/por-grupo', () => import('pages/operaciones/3.bajas/listado/porGrupo')],
  ['/bajas/por-proyecto', () => import('pages/operaciones/3.bajas/listado/porProyecto')],
  ['/bajas/operacion', () => import('pages/operaciones/3.bajas/operacion')],
  ['/bajas/sin-proyecto/nuevo', () => import('pages/operaciones/3.bajas/deAdministrador/nuevo')],
  ['/bajas/sin-proyecto/por-grupo', () => import('pages/operaciones/3.bajas/deAdministrador/listado/porGrupo')],
  ['/bajas/sin-proyecto/operacion', () => import('pages/operaciones/3.bajas/deAdministrador/operacion')],
  ['/compras/nuevo', () => import('pages/operaciones/4.compras/nuevo')],
  ['/compras/por-factura', () => import('pages/operaciones/4.compras/listado/porGrupo')],
  ['/compras/por-proyecto', () => import('pages/operaciones/4.compras/listado/porProyecto')],
  ['/compras/operacion', () => import('pages/operaciones/4.compras/operacion')],
  ['/compras/editar', () => import('pages/operaciones/4.compras/editarGrupo')],
  ['/altas/nuevo', () => import('pages/operaciones/5.altas/nuevo')],
  ['/altas/por-grupo', () => import('pages/operaciones/5.altas/listado/porGrupo')],
  ['/altas/operacion', () => import('pages/operaciones/5.altas/operacion')],
  ['/renta-externa/nuevo', () => import('pages/operaciones/6.rentasExternas/nuevo')],
  ['/renta-externa/por-grupo', () => import('pages/operaciones/6.rentasExternas/listado/porGrupo')],
  ['/renta-externa/por-proyecto', () => import('pages/operaciones/6.rentasExternas/listado/porProyecto')],
  ['/renta-externa/operacion', () => import('pages/operaciones/6.rentasExternas/operacion')],
  ['/renta-externa/activos', () => import('pages/operaciones/6.rentasExternas/listado/porActivos')],
  ['/previo/nuevo', () => import('pages/operaciones/8.previo/nuevo')],
  ['/previo/por-grupo', () => import('pages/operaciones/8.previo/listado/porGrupo')],
  ['/previo/operacion', () => import('pages/operaciones/8.previo/operacion')],
  ['/movimientos/detalle', () => import('pages/operaciones/movimiento')],
  ['/reportes/por-usuario', () => import('pages/reportes/6.porUsuario')],
  ['/reportes/de-cierre', () => import('pages/reportes/3.cierreProyecto')],
  ['/auth/login', () => import('app/auth/LoginPage')],
  ['/auth/401', () => Promise.resolve({ default: () => <ErrorPage code={401} /> })],
  ['/auth/404', () => Promise.resolve({ default: () => <ErrorPage code={404} /> })],
  ['/auth/500', () => Promise.resolve({ default: () => <ErrorPage code={500} /> })],
  ['/auth/503', () => Promise.resolve({ default: () => <ErrorPage code={503} /> })],
]

/** `/` lleva al catálogo de validaciones o al general según los permisos (como antes). */
function RedireccionInicial() {
  const permisos = useUsuarioStore(estado => estado.permisos)
  const destino = permisos.includes('VALIDACIONES') ? '/catalogo/validaciones' : '/catalogo/general'
  return <Navigate to={destino} replace />
}

function Cargando() {
  return (
    <div style={{ textAlign: 'center', padding: 48 }}>
      <Spin />
    </div>
  )
}

export const rutas: RouteObject[] = [
  {
    element: <RaizLayout />,
    errorElement: <ErrorPage code={500} />,
    children: [
      { index: true, element: <RedireccionInicial /> },
      ...RUTAS.map(([path, cargar]) => {
        const Pagina = lazy(cargar)
        return {
          path,
          element: (
            <Suspense fallback={<Cargando />}>
              <Pagina />
            </Suspense>
          ),
        }
      }),
      { path: '*', element: <Navigate to="/auth/404" replace /> },
    ],
  },
]

/** Router de la app; `router.navigate(url)` sirve para navegar fuera de componentes. */
export const router = createHashRouter(rutas)
