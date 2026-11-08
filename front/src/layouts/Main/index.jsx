import React from 'react'
import { Layout } from 'antd'
import { useLocation } from 'react-router'

import classNames from 'classnames'
import TopBar from 'components/cleanui/layout/TopBar'
import Breadcrumbs from 'components/cleanui/layout/Breadcrumbs'
import Menu from 'components/cleanui/layout/Menu'
import Footer from 'components/cleanui/layout/Footer'
import ManejandoErrores from './manejandoErrores'
// import SupportChat from 'components/cleanui/layout/SupportChat'



// Valores fijos de la plantilla (antes en `redux/settings`).
const AJUSTES = {
  isContentMaxWidth: false,
  isAppMaxWidth: false,
  isGrayBackground: true,
  isSquaredBorders: false,
  isCardShadow: true,
  isBorderless: false,
  isTopbarFixed: false,
  isGrayTopbar: false,
}

const MainLayout = ({ children }) => {
  const { pathname } = useLocation()
  const {
    isContentMaxWidth,
    isAppMaxWidth,
    isGrayBackground,
    isSquaredBorders,
    isCardShadow,
    isBorderless,
    isTopbarFixed,
    isGrayTopbar,
  } = AJUSTES
  return (
    <div className={classNames({ cui__layout__grayBackground: isGrayBackground })}>
      <Layout
        className={classNames({
          cui__layout__contentMaxWidth: isContentMaxWidth,
          cui__layout__appMaxWidth: isAppMaxWidth,
          cui__layout__grayBackground: isGrayBackground,
          cui__layout__squaredBorders: isSquaredBorders,
          cui__layout__cardsShadow: isCardShadow,
          cui__layout__borderless: isBorderless,
        })}
      >
        {/* <SupportChat /> */}
        <Menu />
        <Layout>
          <Layout.Header
            className={classNames('cui__layout__header', {
              cui__layout__fixedHeader: isTopbarFixed,
              cui__layout__headerGray: isGrayTopbar,
            })}
          >
            <TopBar />
          </Layout.Header>
          <Breadcrumbs />
          <Layout.Content style={{ height: '100%', position: 'relative' }}>
            {/* La clave reinicia el límite de errores al cambiar de ruta (antes quedaba en 503 para siempre). */}
            <ManejandoErrores key={pathname}>{children}</ManejandoErrores>
            {/* <div className="cui__utils__content">{children}</div> */}
          </Layout.Content>
          <Layout.Footer>
            <Footer />
          </Layout.Footer>
        </Layout>
      </Layout>
    </div>
  )
}

export default MainLayout
