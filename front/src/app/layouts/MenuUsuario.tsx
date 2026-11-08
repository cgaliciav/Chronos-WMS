import { Avatar, Dropdown, Typography } from 'antd'
import { KeyOutlined, LogoutOutlined, UserOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router'
import { useUsuarioStore } from 'stores/usuario.store'

/** Avatar con el menú del usuario: datos, cambiar contraseña y salir (antes `cleanui/layout/TopBar/UserMenu`). */
export default function MenuUsuario() {
  const { nombre, correo, logout } = useUsuarioStore()
  const navigate = useNavigate()
  return (
    <Dropdown
      trigger={['click']}
      menu={{
        selectable: false,
        items: [
          {
            key: 'usuario',
            label: (
              <>
                <Typography.Text strong>Hola, {nombre || '???'}</Typography.Text>
                <div>
                  <Typography.Text type="secondary">{correo || '—'}</Typography.Text>
                </div>
              </>
            ),
          },
          { type: 'divider' },
          {
            key: 'cambiarClave',
            icon: <KeyOutlined />,
            label: 'Cambiar contraseña',
            onClick: () => navigate('/usuarios/cambiar-password'),
          },
          { type: 'divider' },
          // Al quedar sin sesión, el layout raíz redirige al login.
          { key: 'salir', icon: <LogoutOutlined />, label: 'Salir', onClick: () => void logout() },
        ],
      }}
    >
      <Avatar shape="square" size="large" icon={<UserOutlined />} style={{ cursor: 'pointer' }} aria-label="Usuario" />
    </Dropdown>
  )
}
