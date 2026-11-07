import MagicBell, { FloatingNotificationInbox } from '@magicbell/magicbell-react'
import React, { useEffect, useState } from 'react'
import { connect } from 'react-redux'
import AutorizacionPeticiones from 'services/axios/autorizacion'
import { version } from '../../../../../package.json'
import UserMenu from './UserMenu'
import style from './style.module.scss'

const theme = {
  icon: { borderColor: '#ccc', width: '24px' },
  unseenBadge: { backgroundColor: '#DF4759' },
  header: {
    backgroundColor: '#4b7cf3',
    textColor: '#ffffff',
    borderRadius: '16px',
    fontFamily: 'Verdana',
  },
  footer: {
    backgroundColor: '#4b7cf3',
    textColor: '#ffffff',
    borderRadius: '16px',
    fontFamily: 'Verdana',
  },
  notification: {
    default: {
      textColor: '#595c97',
      borderRadius: '8px',
      backgroundColor: '#4b7cf3',
      fontFamily: 'Verdana',
    },
    unseen: {
      backgroundColor: '#4b7cf3',
      textColor: '#595c97',
      borderRadius: '8px',
      fontFamily: 'Verdana',
    },
    unread: {
      backgroundColor: '#4b7cf3',
      textColor: '#595c97',
      borderRadius: '8px',
      fontFamily: 'Verdana',
    },
  },
}

const mapStateToProps = ({ user }) => ({ usuario: user.nombre, correo: user.correo })

const TopBar = ({ usuario, correo }) => {
  const notificacion = notification => {
    console.log({ notification })

    const link = document.createElement('a')
    link.href = notification.actionUrl
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    // console.log("notificacion.....................",notification.actionUrl);
    // window.open(notificacion.actionUrl);
  }

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
      <div className="mr-4">
        {/* <FavPages /> */}
        <MagicBell
          apiKey={process.env.REACT_APP_MAGICBELL_API_KEY}
          userEmail={correo}
          userKey={process.env.REACT_APP_MAGICBELL_USER_KEY}
          locale={{
            name: 'es-US',
            translations: {
              header: {
                title: 'Notificaciones',
                'mark-all-read': 'Marcar todo como leído',
              },
              notification: {
                'mark-as-read': 'Marcar como leído',
                'mark-as-unread': 'Marcar como no leído',
                delete: 'Eliminar',
              },
              messages: {
                'empty-inbox': '¡No tiene notificaciones!<br>Le haremos saber cuando llegue una.',
                'server-error': 'No podemos mostrar sus notificaciones en este momento',
              },
            },
          }}
          theme={theme}
        >
          {props => (
            <FloatingNotificationInbox
              width={400}
              height={400}
              {...props}
              onNotificationClick={notificacion}
            />
          )}
        </MagicBell>
      </div>
      <div className="">
        <UserMenu />
      </div>
    </div>
  )
}

export default connect(mapStateToProps)(TopBar)
// export default TopBar
