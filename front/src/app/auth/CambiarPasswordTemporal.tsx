import { useState } from 'react'
import { Alert, Button, Card, Flex, Form, Input } from 'antd'
import { Navigate, useNavigate } from 'react-router'
import Titulo from 'components/Titulo'
import { notification } from 'helpers/feedback'
import {
  reglaConfirmacion,
  reglaDistintaDeActual,
  reglasPasswordNuevo,
} from 'helpers/reglasPassword'
import { guardarToken } from 'helpers/storage'
import UsuarioPeticiones from 'services/axios/usuarios'
import { useUsuarioStore } from 'stores/usuario.store'
import type { ValoresCambiarPassword } from 'pages/administracion/tipos'

/**
 * Cambio obligatorio de la contraseña temporal (hallazgo L2). Quien entra con la contraseña que le llegó por correo
 * no ve otra página hasta elegir la suya; el API le entrega entonces un token normal.
 */
export default function CambiarPasswordTemporal() {
  const autorizado = useUsuarioStore(estado => estado.autorizado)
  const completarCambioPassword = useUsuarioStore(estado => estado.completarCambioPassword)
  const logout = useUsuarioStore(estado => estado.logout)
  const [guardando, setGuardando] = useState(false)
  const navigate = useNavigate()

  if (!autorizado) return <Navigate to="/auth/login" replace />

  const alEnviar = async (valores: ValoresCambiarPassword) => {
    setGuardando(true)
    try {
      const respuesta = await UsuarioPeticiones.cambiarPassword({
        pa: valores.passwordAnterior,
        pn: valores.passwordNuevo,
      })
      if (respuesta?.t) guardarToken(respuesta.t)
      await completarCambioPassword()
      notification.success({
        title: 'Contraseña actualizada',
        description: 'Ya puedes usar el sistema.',
      })
      navigate('/')
    } catch {
      // El interceptor de axios ya mostró el error.
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Flex vertical gap={24}>
      <Titulo texto="Cambiar contraseña" />
      <Alert
        type="warning"
        showIcon
        message="Entraste con una contraseña temporal"
        description="Elige tu propia contraseña para continuar: de 8 a 20 caracteres, con al menos una mayúscula, una minúscula y un número."
      />
      <Card title="Nueva contraseña">
        <Form<ValoresCambiarPassword> layout="vertical" requiredMark={false} onFinish={alEnviar}>
          <Form.Item
            label="Contraseña temporal"
            name="passwordAnterior"
            rules={[
              { required: true, message: 'Coloca la contraseña temporal que te llegó por correo' },
            ]}
          >
            <Input.Password autoComplete="current-password" />
          </Form.Item>
          <Form.Item
            label="Contraseña nueva"
            name="passwordNuevo"
            dependencies={['passwordAnterior']}
            rules={[...reglasPasswordNuevo, reglaDistintaDeActual]}
          >
            <Input.Password autoComplete="new-password" />
          </Form.Item>
          <Form.Item
            label="Confirmar contraseña nueva"
            name="passwordNuevoConfirmacion"
            dependencies={['passwordNuevo']}
            rules={[{ required: true, message: 'Confirma la contraseña nueva' }, reglaConfirmacion]}
          >
            <Input.Password autoComplete="new-password" />
          </Form.Item>
          <Flex gap={8}>
            <Button type="primary" htmlType="submit" loading={guardando}>
              Guardar y continuar
            </Button>
            <Button onClick={() => void logout().then(() => navigate('/auth/login'))}>Salir</Button>
          </Flex>
        </Form>
      </Card>
    </Flex>
  )
}
