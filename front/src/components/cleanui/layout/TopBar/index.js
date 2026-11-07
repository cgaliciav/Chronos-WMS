import React, { useEffect, useState } from 'react'
import { connect } from 'react-redux'
import AutorizacionPeticiones from 'services/axios/autorizacion'
import { version } from '../../../../../package.json'
import UserMenu from './UserMenu'
import style from './style.module.scss'

const mapStateToProps = ({ user }) => ({ usuario: user.nombre })

const TopBar = ({ usuario }) => {
  const [apiVersion, setApiVersion] = useState('')

  useEffect(() => {
    AutorizacionPeticiones.version()
      .then(resp => {
        // console.log("-------------------->",resp)
        if (resp?.version !== undefined) {
          setApiVersion(resp.version)
          localStorage.setItem('apiVersion', resp.version)
          if (resp.version !== version) {
            // setNuevaVersion(true);
            console.log({ version })
          }
        }
      })
      .catch(error => {
        console.error('<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<', error)
      })
  }, [])

  return (
    <div className={style.topbar}>
      <div className="mr-auto">
        <strong>{`Ver. ${version} -- API ${apiVersion}  -- `}</strong> {/* <Search /> */}
        <span>{usuario}</span>
      </div>
      <div className="mr-4 d-none d-md-block">{/* <IssuesHistory /> */}</div>
      <div className="mb-0 mr-auto d-xl-block d-none">{/* <ProjectManagement /> */}</div>
      <div className="mr-4 d-none d-sm-block">{/* <LanguageSwitcher /> */}</div>
      <div className="mr-4 d-none d-sm-block">{/* <Actions /> */}</div>
      {/* Campana de notificaciones propia: plan 01 D14 (NotificacionesCampana, fase 6) */}
      <div className="">
        <UserMenu />
      </div>
    </div>
  )
}

export default connect(mapStateToProps)(TopBar)
// export default TopBar
