import React /* , { useState } */ from 'react'
import { useNavigate } from 'react-router'
import { UserOutlined } from '@ant-design/icons'
import { Menu, Dropdown, Avatar /* , Badge */ } from 'antd'
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

  const menu = (
    <Menu selectable={false}>
      <Menu.Item>
        <strong>
          Hola, {user.nombre || '???'}
        </strong>
        {/* <div>
          <strong className="mr-1">
            Pagos:{' '}
          </strong>
          Professional
        </div> */}
        {/* <div>
          <strong>
            Rol:{' '}
          </strong>
          {user.role || '—'}
        </div> */}
        {/* </Menu.Item>
        <Menu.Divider />
        <Menu.Item> */}
        <div>
          <strong>
            Email:{' '}
          </strong>
          {user.correo || '—'}
          <br />
          {/* <strong>
            Teléfono:{' '}
          </strong>
          {user.phone || '—'} */}
        </div>
      </Menu.Item>
      <Menu.Divider />
      <Menu.Item>
        <a href="#" onClick={cambiarClave}>
          <i className="fe fe-user mr-2" />
          Cambiar contraseña
        </a>
      </Menu.Item>
      <Menu.Divider />
      <Menu.Item>
        <a href="#" onClick={logout}>
          <i className="fe fe-log-out mr-2" />
          Salir
        </a>
      </Menu.Item>
    </Menu>
  )
  return (
    <Dropdown overlay={menu} trigger={['click']}>
      <div className={styles.dropdown}>
        {/* <Badge count={count}> */}
        <Avatar className={styles.avatar} shape="square" size="large" icon={<UserOutlined />} />
        {/* </Badge> */}
      </div>
    </Dropdown>
  )
}

export default ProfileMenu
