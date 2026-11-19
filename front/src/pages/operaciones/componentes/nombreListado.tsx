import { useState } from 'react'
import { Button, Form, Input, Modal, Tooltip, Typography } from 'antd'
import { EditOutlined } from '@ant-design/icons'
import ACL from 'app/auth/ACL'
import { notification } from 'helpers/feedback'
import GrupoPeticiones from 'services/axios/grupos'

interface NombreListadoProps {
  grupoId?: number | string
  nombre?: string
  /** Se llama tras cambiar el nombre, para recargar el listado. */
  alRenombrar: () => void
}

/**
 * Nombre del listado en la cabecera de las pantallas de operación. Los administradores (perfiles Superadministrador
 * y Administrador) pueden cambiarlo (decisión 24); en una compra el nombre es el número de la factura.
 */
const NombreListado = ({ grupoId, nombre, alRenombrar }: NombreListadoProps) => {
  const [abierto, setAbierto] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [form] = Form.useForm<{ nombre: string }>()

  const abrir = () => {
    form.setFieldsValue({ nombre: nombre ?? '' })
    setAbierto(true)
  }

  const guardar = async ({ nombre: nuevo }: { nombre: string }) => {
    if (grupoId === undefined || grupoId === 0) return
    try {
      setGuardando(true)
      await GrupoPeticiones.renombrar({ grupoId, nombre: nuevo.trim() })
      notification.success({ title: 'Nombre del listado actualizado' })
      setAbierto(false)
      alRenombrar()
    } catch {
      // El interceptor de axios ya mostró el error (p. ej. nombre repetido).
    } finally {
      setGuardando(false)
    }
  }

  return (
    <>
      <Typography.Title style={{ margin: '0', color: 'mediumpurple' }} level={4}>
        {nombre}
        <ACL roles={['ADMINISTRADOR']}>
          <Tooltip title="Cambiar el nombre del listado">
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              aria-label="Cambiar el nombre del listado"
              onClick={abrir}
            />
          </Tooltip>
        </ACL>
      </Typography.Title>
      <Modal
        open={abierto}
        title="Cambiar el nombre del listado"
        okText="Guardar"
        cancelText="Cancelar"
        confirmLoading={guardando}
        onOk={() => form.submit()}
        onCancel={() => setAbierto(false)}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={guardar}>
          <Form.Item
            label="Nombre"
            name="nombre"
            rules={[
              { required: true, whitespace: true, message: 'Escribe el nombre del listado' },
              { min: 3, message: 'El nombre debe tener al menos 3 caracteres' },
              { max: 255, message: 'El nombre no puede tener más de 255 caracteres' },
            ]}
          >
            <Input autoFocus maxLength={255} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}

export default NombreListado
