import React, { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router'
import { Menu, Layout } from 'antd'
import classNames from 'classnames'
import { guardarJSON, leerJSON } from 'helpers/storage'
import { ANCHO_MENU, useUiStore } from 'stores/ui.store'
import { useUsuarioStore } from 'stores/usuario.store'
import menuData from 'services/menu'
import PerfectScrollbar from 'react-perfect-scrollbar'
import { find } from 'lodash'
import style from './style.module.scss'

// Valores fijos de la plantilla (antes en `redux/settings`).
const MENU_SIN_FIJAR = false
const MENU_CON_SOMBRA = false
const COLOR_MENU = 'gray'
const LOGO = 'Sony Almacén México'

const MenuLeft = () => {
  const { pathname } = useLocation()
  const isMenuCollapsed = useUiStore(estado => estado.menuColapsado)
  const isMobileView = useUiStore(estado => estado.esMovil)
  const alternarMenuColapsado = useUiStore(estado => estado.alternarMenuColapsado)
  const roles = useUsuarioStore(estado => estado.permisos)
  const isMenuUnfixed = MENU_SIN_FIJAR
  const isMenuShadow = MENU_CON_SOMBRA
  const leftMenuWidth = ANCHO_MENU
  const menuColor = COLOR_MENU
  const logo = LOGO
  const [selectedKeys, setSelectedKeys] = useState(() => leerJSON('app.menu.selectedKeys', []))
  const [openedKeys, setOpenedKeys] = useState(() => leerJSON('app.menu.openedKeys', []))

  useEffect(() => {
    applySelectedKeys()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  const applySelectedKeys = () => {
    const flattenItems = (items, key) =>
      items.reduce((flattenedItems, item) => {
        flattenedItems.push(item)
        if (Array.isArray(item[key])) {
          return flattenedItems.concat(flattenItems(item[key], key))
        }
        return flattenedItems
      }, [])
    const selectedItem = find(flattenItems(menuData, 'children'), ['url', pathname])
    setSelectedKeys(selectedItem ? [selectedItem.key] : [])
  }

  const onCollapse = (value, type) => {
    if (type === 'responsive' && isMenuCollapsed) {
      return
    }
    alternarMenuColapsado()
    setOpenedKeys([])
  }

  const onOpenChange = keys => {
    guardarJSON('app.menu.openedKeys', keys)
    setOpenedKeys(keys)
  }

  const handleClick = e => {
    guardarJSON('app.menu.selectedKeys', [e.key])
    setSelectedKeys([e.key])
  }

  /** Contenido de una entrada: título, contador e icono de la plantilla (fuentes icmn/fe). */
  const etiqueta = (item, colapsable) => (
    <>
      <span className={style.title}>{item.title}</span>
      {item.count && <span className="badge badge-success ml-2">{item.count}</span>}
      {item.icon && (
        <span className={`${item.icon} ${style.icon}${colapsable ? ' icon-collapsed-hidden' : ''}`} />
      )}
    </>
  )

  const permitido = item => !roles || roles.includes('ADMINISTRADOR') || roles.includes(item?.role)

  /** Menú de la plantilla convertido a `items` de antd 5 (antes `Menu.Item`/`SubMenu` como hijos). */
  const generateMenuItems = (entradas = menuData) =>
    entradas.filter(permitido).map(item => {
      if (item.category) {
        // Clave estable (antes `Math.random()`, hallazgo F8).
        return { type: 'group', key: `grupo-${item.title}`, label: item.title }
      }
      if (item.children) {
        return { key: item.key, label: <span>{etiqueta(item, false)}</span>, children: generateMenuItems(item.children) }
      }
      let label = etiqueta(item, true)
      if (item.url && item.target) {
        label = (
          <a href={item.url} target={item.target} rel="noopener noreferrer">
            {label}
          </a>
        )
      } else if (item.url) {
        label = <Link to={item.url}>{label}</Link>
      }
      return { key: item.key, disabled: item.disabled, label }
    })

  const menuSettings = isMobileView
    ? {
        width: leftMenuWidth,
        collapsible: false,
        collapsed: false,
        onCollapse,
      }
    : {
        width: leftMenuWidth,
        collapsible: true,
        collapsed: isMenuCollapsed,
        onCollapse,
        breakpoint: 'lg',
      }

  return (
    <Layout.Sider
      {...menuSettings}
      className={classNames(`${style.menu}`, {
        [style.white]: menuColor === 'white',
        [style.gray]: menuColor === 'gray',
        [style.dark]: menuColor === 'dark',
        [style.unfixed]: isMenuUnfixed,
        [style.shadow]: isMenuShadow,
      })}
    >
      <div
        className={style.menuOuter}
        style={{
          width: isMenuCollapsed && !isMobileView ? 80 : leftMenuWidth,
          height: isMobileView || isMenuUnfixed ? 'calc(100% - 64px)' : 'calc(100% - 110px)',
        }}
      >
        <div className={style.logoContainer}>
          <div className={style.logo}>
            <img src="resources/images/logo.svg" className="mr-2" alt="Clean UI" />
            <div className={style.name}>{logo}</div>
            {logo === 'Clean UI Pro' && <div className={style.descr}>React</div>}
          </div>
        </div>
        <PerfectScrollbar>
          <Menu
            onClick={handleClick}
            selectedKeys={selectedKeys}
            openKeys={openedKeys}
            onOpenChange={onOpenChange}
            mode="inline"
            className={style.navigation}
            inlineIndent={15}
            items={generateMenuItems()}
          />
          {/* <div className={style.banner}>
            <p>More components, more style, more themes, and premium support!</p>
            <a
              href="https://themeforest.net/item/clean-ui-react-admin-template/21938700"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-sm btn-success btn-rounded px-3"
            >
              Buy Bundle
            </a>
          </div> */}
        </PerfectScrollbar>
      </div>
    </Layout.Sider>
  )
}

export default MenuLeft
