import React, { lazy, Suspense } from 'react'
import { Route, Redirect, Switch } from 'react-router-dom'
import { ConnectedRouter } from 'connected-react-router'
import { CSSTransition, SwitchTransition } from 'react-transition-group'
import { connect } from 'react-redux'

import Layout from 'layouts'

const routes = [
  // *******************************************
  // ADMINISTRACION

  // ->USUARIOS
  {
    path: '/usuarios/listado',
    Component: lazy(() => import('pages/administracion/usuarios/listado')),
    exact: true,
  },
  {
    path: '/usuarios/cambiar-password',
    Component: lazy(() => import('pages/administracion/usuarios/cambiarPassword')),
    exact: true,
  },
  {
    path: '/usuarios/nuevo',
    Component: lazy(() => import('pages/administracion/usuarios/nuevo')),
    exact: true,
  },
  {
    path: '/usuarios/editar',
    Component: lazy(() => import('pages/administracion/usuarios/editar')),
    exact: true,
  },

  // ->PROYECTOS
  {
    path: '/proyectos/listado',
    Component: lazy(() => import('pages/administracion/proyectos/listado')),
    exact: true,
  },
  {
    path: '/proyectos/nuevo',
    Component: lazy(() => import('pages/administracion/proyectos/nuevo')),
    exact: true,
  },
  {
    path: '/proyectos/editar',
    Component: lazy(() => import('pages/administracion/proyectos/editar')),
    exact: true,
  },

  // ->PROVEEDORES

  {
    path: '/proveedores/listado',
    Component: lazy(() => import('pages/administracion/proveedores/listado')),
    exact: true,
  },
  {
    path: '/proveedores/nuevo',
    Component: lazy(() => import('pages/administracion/proveedores/nuevo')),
    exact: true,
  },
  {
    path: '/proveedores/editar',
    Component: lazy(() => import('pages/administracion/proveedores/editar')),
    exact: true,
  },

  // ->Areas
  {
    path: '/areas/listado',
    Component: lazy(() => import('pages/administracion/areas/listado')),
    exact: true,
  },
  {
    path: '/areas/nuevo',
    Component: lazy(() => import('pages/administracion/areas/nuevo')),
    exact: true,
  },
  {
    path: '/areas/editar',
    Component: lazy(() => import('pages/administracion/areas/editar')),
    exact: true,
  },

  // ->Bodegas / Almacenes
  {
    path: '/bodegas/listado',
    Component: lazy(() => import('pages/administracion/bodegas/listado')),
    exact: true,
  },
  {
    path: '/bodegas/nuevo',
    Component: lazy(() => import('pages/administracion/bodegas/nuevo')),
    exact: true,
  },
  {
    path: '/bodegas/editar',
    Component: lazy(() => import('pages/administracion/bodegas/editar')),
    exact: true,
  },

  // *******************************************
  // CATALOGOS
  {
    path: '/catalogo/general',
    Component: lazy(() => import('pages/catalogos/1.general')),
    exact: true,
  },
  {
    path: '/catalogo/por-codigos',
    Component: lazy(() => import('pages/catalogos/2.porCodigos')),
    exact: true,
  },
  {
    path: '/catalogo/bajas',
    Component: lazy(() => import('pages/catalogos/3.bajas')),
    exact: true,
  },
  {
    path: '/catalogo/por-proyecto',
    Component: lazy(() => import('pages/catalogos/4.porProyecto')),
    exact: true,
  },
  {
    path: '/catalogo/por-facturas',
    Component: lazy(() => import('pages/catalogos/5.porFacturas')),
    exact: true,
  },
  {
    path: '/catalogo/validaciones',
    Component: lazy(() => import('pages/catalogos/6.validaciones')),
    exact: true,
  },
  {
    path: '/articulos/detalle',
    Component: lazy(() => import('pages/catalogos/articulos/detalle')),
    exact: true,
  },
  {
    path: '/articulos/editar/detalle',
    Component: lazy(() => import('pages/catalogos/articulos/editarDetalle')),
    exact: true,
  },
  {
    path: '/articulos/validado',
    Component: lazy(() => import('pages/catalogos/articulos/detalleValidaciones')),
    exact: true,
  },

  {
    path: '/catalogo/inventario',
    Component: lazy(() => import('pages/catalogos/7.inventarioVisual')),
    exact: true,
  },


  // *******************************************
  // OPERACIONES
  // *******************************************
  {
    path: '/prestamos/nuevo',
    Component: lazy(() => import('pages/operaciones/1.prestamos/nuevo')),
    exact: true,
  },
  {
    path: '/prestamos/por-grupo',
    Component: lazy(() => import('pages/operaciones/1.prestamos/listado/porGrupo')),
    exact: true,
  },
  {
    path: '/prestamos/por-proyecto',
    Component: lazy(() => import('pages/operaciones/1.prestamos/listado/porProyecto')),
    exact: true,
  },
  {
    path: '/prestamos/operacion',
    Component: lazy(() => import('pages/operaciones/1.prestamos/operacion')),
    exact: true,
  },
  {
    path: '/prestamos/activos',
    Component: lazy(() => import('pages/operaciones/1.prestamos/listado/porActivos')),
    exact: true,
  },

  {
    path: '/devoluciones/nuevo',
    Component: lazy(() => import('pages/operaciones/2.devoluciones/nuevo')),
    exact: true,
  },
  {
    path: '/devoluciones/nuevo-externa',
    Component: lazy(() => import('pages/operaciones/2.devoluciones/nuevoExterno')),
    exact: true,
  },
  {
    path: '/devoluciones/por-grupo',
    Component: lazy(() => import('pages/operaciones/2.devoluciones/listado/porGrupo')),
    exact: true,
  },
  {
    path: '/devoluciones/por-proyecto',
    Component: lazy(() => import('pages/operaciones/2.devoluciones/listado/porProyecto')),
    exact: true,
  },
  {
    path: '/devoluciones/operacion',
    Component: lazy(() => import('pages/operaciones/2.devoluciones/operacion')),
    exact: true,
  },

  {
    path: '/bajas/nuevo',
    Component: lazy(() => import('pages/operaciones/3.bajas/nuevo')),
    exact: true,
  },
  {
    path: '/bajas/por-grupo',
    Component: lazy(() => import('pages/operaciones/3.bajas/listado/porGrupo')),
    exact: true,
  },
  {
    path: '/bajas/por-proyecto',
    Component: lazy(() => import('pages/operaciones/3.bajas/listado/porProyecto')),
    exact: true,
  },
  {
    path: '/bajas/operacion',
    Component: lazy(() => import('pages/operaciones/3.bajas/operacion')),
    exact: true,
  },

  {
    path: '/bajas/sin-proyecto/nuevo',
    Component: lazy(() => import('pages/operaciones/3.bajas/deAdministrador/nuevo')),
    exact: true,
  },
  {
    path: '/bajas/sin-proyecto/por-grupo',
    Component: lazy(() => import('pages/operaciones/3.bajas/deAdministrador/listado/porGrupo')),
    exact: true,
  },
  {
    path: '/bajas/sin-proyecto/operacion',
    Component: lazy(() => import('pages/operaciones/3.bajas/deAdministrador/operacion')),
    exact: true,
  },

  {
    path: '/compras/nuevo',
    Component: lazy(() => import('pages/operaciones/4.compras/nuevo')),
    exact: true,
  },
  {
    path: '/compras/por-factura',
    Component: lazy(() => import('pages/operaciones/4.compras/listado/porGrupo')),
    exact: true,
  },
  {
    path: '/compras/por-proyecto',
    Component: lazy(() => import('pages/operaciones/4.compras/listado/porProyecto')),
    exact: true,
  },
  {
    path: '/compras/operacion',
    Component: lazy(() => import('pages/operaciones/4.compras/operacion')),
    exact: true,
  },
  {
    path: '/compras/editar',
    Component: lazy(() => import('pages/operaciones/4.compras/editarGrupo')),
    exact: true,
  },


  {
    path: '/altas/nuevo',
    Component: lazy(() => import('pages/operaciones/5.altas/nuevo')),
    exact: true,
  },
  {
    path: '/altas/por-grupo',
    Component: lazy(() => import('pages/operaciones/5.altas/listado/porGrupo')),
    exact: true,
  },
  {
    path: '/altas/operacion',
    Component: lazy(() => import('pages/operaciones/5.altas/operacion')),
    exact: true,
  },


  {
    path: '/renta-externa/nuevo',
    Component: lazy(() => import('pages/operaciones/6.rentasExternas/nuevo')),
    exact: true,
  },
  {
    path: '/renta-externa/por-grupo',
    Component: lazy(() => import('pages/operaciones/6.rentasExternas/listado/porGrupo')),
    exact: true,
  },
  {
    path: '/renta-externa/por-proyecto',
    Component: lazy(() => import('pages/operaciones/6.rentasExternas/listado/porProyecto')),
    exact: true,
  },
  {
    path: '/renta-externa/operacion',
    Component: lazy(() => import('pages/operaciones/6.rentasExternas/operacion')),
    exact: true,
  },
  {
    path: '/renta-externa/activos',
    Component: lazy(() => import('pages/operaciones/6.rentasExternas/listado/porActivos')),
    exact: true,
  },

  {
    path: '/previo/nuevo',
    Component: lazy(() => import('pages/operaciones/8.previo/nuevo')),
    exact: true,
  },
  {
    path: '/previo/por-grupo',
    Component: lazy(() => import('pages/operaciones/8.previo/listado/porGrupo')),
    exact: true,
  },
  {
    path: '/previo/operacion',
    Component: lazy(() => import('pages/operaciones/8.previo/operacion')),
    exact: true,
  },





  {
    path: '/movimientos/detalle',
    Component: lazy(() => import('pages/operaciones/movimiento')),
    exact: true,
  },



  {
    path: '/reportes/por-usuario',
    Component: lazy(() => import('pages/reportes/6.porUsuario')),
    exact: true,
  },

  {
    path: '/reportes/de-cierre',
    Component: lazy(() => import('pages/reportes/3.cierreProyecto')),
    exact: true,
  },


  // *******************************************
  // Auth Pages
  {
    path: '/auth/login',
    Component: lazy(() => import('pages/auth/login')),
    exact: true,
  },
  {
    path: '/auth/401',
    Component: lazy(() => import('pages/auth/401')),
    exact: true,
  },
  {
    path: '/auth/404',
    Component: lazy(() => import('pages/auth/404')),
    exact: true,
  },
  {
    path: '/auth/500',
    Component: lazy(() => import('pages/auth/500')),
    exact: true,
  },
  {
    path: '/auth/503',
    Component: lazy(() => import('pages/auth/503')),
    exact: true,
  },
]

const mapStateToProps = ({ settings, user }) => ({
  routerAnimation: settings.routerAnimation,
  permisos: user.permisos,

})

const Router = ({ history, routerAnimation, permisos }) => {
  const destinoInicial = permisos.includes('VALIDACIONES') ? "/catalogo/validaciones" : "/catalogo/general";
  return (
    <ConnectedRouter history={history}>
      <Layout>
        <Route
          render={state => {
            const { location } = state
            // console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>",location);
            if(!location.pathname.includes('auth')){
              localStorage.setItem("ultimaVisitada",location.pathname+location.search);
            }
            return (
              <SwitchTransition>
                <CSSTransition
                  key={location.pathname}
                  appear
                  classNames={routerAnimation}
                  timeout={routerAnimation === 'none' ? 0 : 300}
                >
                  <Switch location={location}>
                    <Route exact path="/" render={() => <Redirect to={destinoInicial} />} />
                    {routes.map(({ path, Component, exact }) => (
                      <Route
                        path={path}
                        key={path}
                        exact={exact}
                        render={() => {
                          return (
                            <div className={routerAnimation}>
                              <Suspense fallback={null}>
                                <Component />
                              </Suspense>
                            </div>
                          )
                        }}
                      />
                    ))}
                    <Redirect to="/auth/404" />
                  </Switch>
                </CSSTransition>
              </SwitchTransition>
            )
          }}
        />
      </Layout>
    </ConnectedRouter>
  )
}

export default connect(mapStateToProps)(Router)
