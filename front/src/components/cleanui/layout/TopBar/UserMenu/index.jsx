import React /* , { useState } */ from 'react'
import { useNavigate } from 'react-router'
import { UserOutlined } from '@ant-design/icons'
import { Dropdown, Avatar } from 'antd'
import { useUsuarioStore } from 'stores/usuario.store'
import styles from './style.module.scss'

const ProfileMenu = () => {
  const user = useUsuarioStore()
  const navigate = useNavigate()
  // const [count, setCount] = useState(7)

  const logout = e => {
    e.preventDefault()
    // Al quedar sin autorizar, el layout redirige al login.
    user.logout()
  }

  const cambiarClave = e =>{
    e.preventDefault();
    // const {history}=props
    navigate('/usuarios/cambiar-password')
  }

  // const addCount = () => {
  //   setCount(count + 1)
  // }

  // `items` de antd 5 (antes `Menu.Item` como hijos y `Dropdown overlay`).
  const items = [
    {
      key: 'usuario',
      label: (
        <>
          <strong>Hola, {user.nombre || '???'}</strong>
          <div>
            <strong>Email: </strong>
            {user.correo || '—'}
          </div>
        </>
      ),
    },
    { type: 'divider' },
    {
      key: 'cambiarClave',
      label: (
        <a href="#" onClick={cambiarClave}>
          <i className="fe fe-user mr-2" />
          Cambiar contraseña
        </a>
      ),
    },
    { type: 'divider' },
    {
      key: 'salir',
      label: (
        <a href="#" onClick={logout}>
          <i className="fe fe-log-out mr-2" />
          Salir
        </a>
      ),
    },
  ]
  return (
    <Dropdown menu={{ items, selectable: false }} trigger={['click']}>
      <div className={styles.dropdown}>
        {/* <Badge count={count}> */}
        <Avatar className={styles.avatar} shape="square" size="large" icon={<UserOutlined />} />
        {/* </Badge> */}
      </div>
    </Dropdown>
  )
}

export default ProfileMenu
