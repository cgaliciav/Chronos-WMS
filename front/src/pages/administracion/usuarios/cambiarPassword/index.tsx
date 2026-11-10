import { Button, Col, Form, Input, Row, Typography } from 'antd'
import type { FormItemProps } from 'antd'
import { notification } from 'helpers/feedback'
import { useState } from 'react'
import type { ChangeEvent } from 'react'
import Titulo from 'components/Titulo'
import Tarjeta from 'components/ui/Tarjeta'
import { useNavigate } from 'react-router'
import UsuarioPeticiones from 'services/axios/usuarios'
import type { ValoresCambiarPassword } from '../../tipos'

const FormItem = Form.Item

/** Columna de cada campo: ancho completo en móvil, un tercio desde `lg` (antes `col-lg-4`). */
const columnaCampo = { xs: 24, lg: 8 }

const UsuarioCambiarPassword = () => {
  const [habilitado, setHabilitado] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [validacionPassNuevoConfirmacion, setValidacionPassNuevoConfirmacion] =
    useState<FormItemProps['validateStatus']>('error')
  const [ayudaPassNuevoConfirmacion, setAyudaPassNuevoConfirmacion] = useState('')

  const [form] = Form.useForm<ValoresCambiarPassword>()
  const navigate = useNavigate()

  const handleFinish = async (values: ValoresCambiarPassword) => {
    try {
      setGuardando(true)
      setHabilitado(false)
      const respuesta = await UsuarioPeticiones.cambiarPassword({
        pa: values.passwordAnterior,
        pn: values.passwordNuevo,
      })

      if (respuesta !== undefined) {
        navigate(-1)
        notification.success({
          title: 'Password actualizado',
          description: 'Tu acceso será con el nuevo password.',
        })
      }
    } catch {
      // El interceptor de axios ya mostró el error.
    } finally {
      setGuardando(false)
      setHabilitado(true)
    }
  }

  const handleValidacionPassNuevoConfirmacion = (e: ChangeEvent<HTMLInputElement>) => {
    const valoresForma = { ...form.getFieldsValue() }
    if (valoresForma.passwordNuevo === valoresForma.passwordAnterior) {
      setAyudaPassNuevoConfirmacion('El password nuevo no debe ser igual al password anterior')
      setValidacionPassNuevoConfirmacion('error')
    } else if (valoresForma.passwordNuevo !== e.target.value) {
      setAyudaPassNuevoConfirmacion('La confirmacion no es igual al password nuevo')
      setValidacionPassNuevoConfirmacion('error')
    } else {
      setAyudaPassNuevoConfirmacion('')
      setValidacionPassNuevoConfirmacion('success')
    }
  }

  return (
    <div>
      <Titulo texto="Editar usuario" />
      <Tarjeta title="Cambiar Password">
        <Typography.Paragraph>
          Los password deben der de por lo menos 8 caracteres y un máximo de 20, deben tener al
          menos una minúscula, una mayúscula y un número
        </Typography.Paragraph>
        <Form form={form} layout="vertical" onFinish={handleFinish}>
          <Row gutter={30}>
            <Col {...columnaCampo}>
              <FormItem
                label="Password actual"
                name="passwordAnterior"
                rules={[
                  {
                    required: true,
                    message: 'Coloca el password actual',
                  },
                ]}
              >
                <Input.Password placeholder="password actual" disabled={!habilitado} />
              </FormItem>
            </Col>
          </Row>
          <Row gutter={30}>
            <Col {...columnaCampo}>
              <FormItem
                label="Password nuevo"
                name="passwordNuevo"
                rules={[
                  {
                    required: true,
                    message: 'Coloca el password nuevo',
                  },
                  {
                    min: 8,
                    message: 'Mínimo 8 caracteres',
                  },
                  {
                    max: 20,
                    message: 'Máximo 20 caracteres',
                  },
                  {
                    pattern: /([A-Z])/g,
                    message: 'Debe contener al menos una mayúscula',
                  },
                  {
                    pattern: /([a-z])/g,
                    message: 'Debe contener al menos una minúscula',
                  },
                  {
                    pattern: /([\d])/g,
                    message: 'Debe contener al menos un número',
                  },
                ]}
              >
                <Input.Password placeholder="password nuevo" disabled={!habilitado} />
              </FormItem>
            </Col>
            <Col {...columnaCampo}>
              <FormItem
                label="Confirmar password nuevo"
                name="passwordNuevoConfirmacion"
                validateStatus={validacionPassNuevoConfirmacion}
                help={ayudaPassNuevoConfirmacion}
                dependencies={['passwordNuevo']}
                rules={[
                  {
                    required: true,
                    message: 'Confirma el password nuevo',
                  },
                  ({ getFieldValue }) => ({
                    validator(_regla, value: unknown) {
                      if (value !== getFieldValue('passwordNuevo')) {
                        return Promise.reject(new Error('Confirmación y nuevo deben ser iguales'))
                      }
                      return Promise.resolve()
                    },
                  }),
                ]}
              >
                <Input.Password
                  placeholder="confirmar password nuevo"
                  disabled={!habilitado}
                  onChange={handleValidacionPassNuevoConfirmacion}
                />
              </FormItem>
            </Col>
          </Row>
          <Row>
            <Col span={8}>
              <Button type="primary" htmlType="submit" disabled={!habilitado} loading={guardando}>
                {' '}
                Guardar{' '}
              </Button>
            </Col>
          </Row>
        </Form>
      </Tarjeta>
    </div>
  )
}

export default UsuarioCambiarPassword
