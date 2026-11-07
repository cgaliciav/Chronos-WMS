import React from 'react'
import style from './style.module.scss'

const Footer = () => {
  return (
    <div className={style.footer}>
      <div className={style.footerInner}>
        <a
          href="https://exogrid.io/software"
          target="_blank"
          rel="noopener noreferrer"
          className={style.logo}
        >
          EXOGRID TECHNOLOGY
          {/* <span /> */}
        </a>
        <br />
        <p className="mb-0">
          Aviso de privacidad |{' '}
          <a href="mailto:cesar.gv@exogrid.io" target="_blank" rel="noopener noreferrer">
            Soporte técnico
          </a>
        </p>
      </div>
    </div>
  )
}

export default Footer
