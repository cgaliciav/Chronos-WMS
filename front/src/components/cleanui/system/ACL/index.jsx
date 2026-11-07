import React, { Fragment, useEffect } from 'react'
import { connect } from 'react-redux'
import { notification } from 'antd'
import history from 'redux/history'

const mapStateToProps = ({ user }) => ({ user })

const ACL = ({
  user: { permisos },
  redirect = false,
  defaultRedirect = '/auth/401',
  roles = [],
  children,
}) => {
  useEffect(() => {
    const authorized = permisos.some(r => roles.indexOf(r) >= 0)

    if (!authorized && redirect) {
      const url = typeof redirect === 'boolean' ? defaultRedirect : redirect
      notification.error({
        message: 'Sin autorización',
        description: 'No tienes los permisos para acceder a esta página.',
      })
      history.push(url)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const authorized = permisos.some(r => roles.indexOf(r) >= 0)
  const AuthorizedChildren = () => {
    if (!authorized) {
      return null
    }

    return <Fragment>{children}</Fragment>
  }

  return AuthorizedChildren()
}

export default connect(mapStateToProps)(ACL)
