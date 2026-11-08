import type { ReactNode } from 'react'
import { Breadcrumb, Drawer, Flex, Layout, Menu, Typography, theme } from 'antd'
import { Link, useLocation } from 'react-router'
import { version } from '../../../package.json'
import ErrorBoundary from 'app/errors/ErrorBoundary'
import { useMenuItems } from 'app/menu/useMenuItems'
import NotificacionesCampana from 'app/notificaciones/NotificacionesCampana'
import { ANCHO_MENU, useUiStore } from 'stores/ui.store'
import { useUsuarioStore } from 'stores/usuario.store'
import Logo from './Logo'
import MenuUsuario from './MenuUsuario'
import PieDePagina from './PieDePagina'
import { useVersionApi } from './useVersionApi'

/**
 * Layout principal con antd puro (plan 01 fase 6): menú lateral (cajón en móvil), cabecera con versiones,
 * usuario y notificaciones, migas de pan desde el menú, contenido con límite de errores y pie.
 */
export default function MainLayout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const { items, seleccionadas, abiertas, camino } = useMenuItems(pathname)
  const { menuColapsado, esMovil, menuMovilAbierto, fijarMenuColapsado, alternarMenuMovil } = useUiStore()
  const nombre = useUsuarioStore(estado => estado.nombre)
  const versionApi = useVersionApi()
  const { token } = theme.useToken()

  const menu = (
    <Menu
      mode="inline"
      items={items}
      selectedKeys={seleccionadas}
      defaultOpenKeys={abiertas}
      // En móvil, elegir una opción cierra el cajón.
      onClick={() => esMovil && menuMovilAbierto && alternarMenuMovil()}
      style={{ borderInlineEnd: 0, background: 'transparent' }}
    />
  )

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {esMovil ? (
        <Drawer
          placement="left"
          open={menuMovilAbierto}
          onClose={alternarMenuMovil}
          size={ANCHO_MENU}
          closable={false}
          styles={{ body: { padding: 0 } }}
        >
          <Logo />
          {menu}
        </Drawer>
      ) : (
        <Layout.Sider
          width={ANCHO_MENU}
          collapsible
          collapsed={menuColapsado}
          onCollapse={fijarMenuColapsado}
          breakpoint="lg"
          theme="light"
          style={{ position: 'sticky', top: 0, height: '100vh', overflow: 'auto', borderInlineEnd: `1px solid ${token.colorBorderSecondary}` }}
        >
          <Logo soloIcono={menuColapsado} />
          {menu}
        </Layout.Sider>
      )}
      <Layout>
        <Layout.Header
          style={{
            background: token.colorBgContainer,
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
            padding: '0 24px',
            position: 'sticky',
            top: 0,
            zIndex: 10,
          }}
        >
          <Flex align="center" justify="space-between" style={{ height: '100%' }} gap={16}>
            <Flex align="center" gap={12} style={{ minWidth: 0 }}>
              {esMovil ? (
                <Typography.Link onClick={alternarMenuMovil} aria-label="Abrir menú">
                  ☰
                </Typography.Link>
              ) : null}
              <Typography.Text ellipsis>
                <strong>{`Ver. ${version} · API ${versionApi}`}</strong> · {nombre}
              </Typography.Text>
            </Flex>
            <Flex align="center" gap={16}>
              <NotificacionesCampana />
              <MenuUsuario />
            </Flex>
          </Flex>
        </Layout.Header>
        <Layout.Content style={{ padding: '16px 24px' }}>
          {camino.length ? (
            <Breadcrumb
              style={{ marginBottom: 16 }}
              items={[
                { key: 'inicio', title: <Link to="/">Inicio</Link> },
                ...camino.map(entrada => ({ key: entrada.key ?? entrada.title, title: entrada.title })),
              ]}
            />
          ) : null}
          {/* La clave reinicia el límite de errores al cambiar de ruta. */}
          <ErrorBoundary key={pathname}>{children}</ErrorBoundary>
        </Layout.Content>
        <Layout.Footer style={{ padding: '24px', background: 'transparent' }}>
          <PieDePagina />
        </Layout.Footer>
      </Layout>
    </Layout>
  )
}
