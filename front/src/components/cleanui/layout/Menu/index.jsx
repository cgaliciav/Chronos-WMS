import React, { useEffect } from 'react'
import { Drawer } from 'antd'
import { ANCHO_MENU, useUiStore } from 'stores/ui.store'
import MenuLeft from './MenuLeft'
// import MenuTop from './MenuTop'
import style from './style.module.scss'

let touchStartPrev = 0
let touchStartLocked = false

const Menu = () => {
  const isMobileMenuOpen = useUiStore(estado => estado.menuMovilAbierto)
  const isMobileView = useUiStore(estado => estado.esMovil)
  const toggleMobileMenu = useUiStore(estado => estado.alternarMenuMovil)
  const leftMenuWidth = ANCHO_MENU

  useEffect(() => {
    // mobile menu touch slide opener
    const unify = e => {
      return e.changedTouches ? e.changedTouches[0] : e
    }
    const alTocar = e => {
      const x = unify(e).clientX
      touchStartPrev = x
      touchStartLocked = x > 70
    }
    const alDeslizar = e => {
      const x = unify(e).clientX
      const prev = touchStartPrev
      if (x - prev > 50 && !touchStartLocked) {
        toggleMobileMenu()
        touchStartLocked = true
      }
    }
    document.addEventListener('touchstart', alTocar, { passive: false })
    document.addEventListener('touchmove', alDeslizar, { passive: false })
    // Antes los listeners nunca se quitaban (hallazgo F7).
    return () => {
      document.removeEventListener('touchstart', alTocar)
      document.removeEventListener('touchmove', alDeslizar)
    }
  }, [toggleMobileMenu])

  const GetMenu = () => {
    if (isMobileView) {
      return (
        <div>
          <div
            className={style.handler}
            onClick={toggleMobileMenu}
            onFocus={e => {
              e.preventDefault()
            }}
            onKeyPress={toggleMobileMenu}
            role="button"
            tabIndex="0"
          >
            <div className={style.handlerIcon} />
          </div>
          <Drawer
            closable={false}
            open={isMobileMenuOpen}
            placement="left"
            className={style.mobileMenu}
            onClose={toggleMobileMenu}
            maskClosable
            getContainer={null}
            width={leftMenuWidth}
          >
            <MenuLeft />
          </Drawer>
        </div>
      )
    }
    // if (menuLayoutType === 'top') {
    //   return <MenuTop />
    // }
    // if (menuLayoutType === 'nomenu') {
    //   return null
    // }
    return <MenuLeft />
  }

  return GetMenu()
}

export default Menu
