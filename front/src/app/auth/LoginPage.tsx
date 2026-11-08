import { Button, Card, Flex, Form, Input, Space, Typography } from 'antd'
import { useNavigate } from 'react-router'
import { version } from '../../../package.json'
import Titulo from 'components/Titulo'
import { limpiarCache } from 'helpers/limpiarCache'
import { useVersionApi } from 'app/layouts/useVersionApi'
import { NOMBRE_APP } from 'app/layouts/Logo'
import { useUsuarioStore } from 'stores/usuario.store'

interface DatosAcceso {
  email: string
  password: string
}

/** Inicio de sesión (sustituye a `pages/auth/login` + `cleanui/system/Auth/Login`). Envía `{ c, p }` sin `ip`. */
export default function LoginPage() {
  const login = useUsuarioStore(estado => estado.login)
  const cargando = useUsuarioStore(estado => estado.cargando)
  const navigate = useNavigate()
  const versionApi = useVersionApi()

  const alEnviar = async ({ email, password }: DatosAcceso) => {
    if (await login(email, password)) {
      // Vuelve a la última ruta visitada (la guarda el layout raíz) o al inicio.
      navigate(localStorage.getItem('ultimaVisitada') ?? '/')
    }
  }

  return (
    <Flex vertical gap={24}>
      <Titulo texto="Acceso" />
      <Typography.Title level={2} style={{ textAlign: 'center', margin: 0 }}>
        Bienvenido a {NOMBRE_APP}
      </Typography.Title>
      <Card title="Información de acceso">
        <Form<DatosAcceso> layout="vertical" requiredMark={false} onFinish={alEnviar}>
          <Form.Item
            name="email"
            rules={[{ required: true, message: 'Por favor introduce tu correo electrónico' }]}
          >
            <Input size="large" placeholder="Correo electrónico" autoComplete="username" />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: 'Por favor introduce tu contraseña' }]}>
            <Input.Password size="large" placeholder="Contraseña" autoComplete="current-password" />
          </Form.Item>
          <Button type="primary" size="large" htmlType="submit" block loading={cargando}>
            Acceso
          </Button>
        </Form>
      </Card>
      <Flex vertical align="center" gap={8}>
        <Typography.Text type="secondary" style={{ textAlign: 'center' }}>
          Si no recuerda su acceso, por favor comuníquese con el administrador del sistema
        </Typography.Text>
        <Space>
          <Typography.Text>{`Versión: ${version}`}</Typography.Text>
          <Button onClick={() => void limpiarCache()}>Actualizar</Button>
        </Space>
        <Typography.Text strong>{`Versión API: ${versionApi}`}</Typography.Text>
      </Flex>
    </Flex>
  )
}
