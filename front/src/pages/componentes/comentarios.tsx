import { useState } from 'react'
import { Button, Divider, Empty, Row, Tooltip, Form, Input, List } from 'antd'
import { DeleteOutlined } from '@ant-design/icons'
import Comentario from 'components/ui/Comentario'
import { notification } from 'helpers/feedback'
import dayjs from 'dayjs'
import ACL from 'app/auth/ACL'
import ComentarioPeticiones from 'services/axios/comentarios'
import type { Comentario as ComentarioApi } from 'types/api'

const { TextArea } = Input

const formItemLayout = {
  labelCol: {
    xs: { span: 24 },
    sm: { span: 8 },
    md: { span: 6 },
    lg: { span: 6 },
    xl: { span: 4 },
  },
  wrapperCol: {
    xs: { span: 24 },
    sm: { span: 16 },
    md: { span: 18 },
    lg: { span: 18 },
    xl: { span: 20 },
  },
}

const wrapperColBtn = {
  wrapperCol: {
    xs: { span: 24, offset: 0 },
    sm: { span: 16, offset: 8 },
    md: { span: 18, offset: 6 },
    lg: { span: 18, offset: 6 },
    xl: { span: 20, offset: 4 },
  },
}

interface ValoresFormaComentario {
  nuevoComentario: string
}

export interface ComentariosProps {
  comentarios?: ComentarioApi[]
  loading?: boolean
  disabled?: boolean
  /** Muestra el formulario para agregar comentarios. */
  editar?: boolean
  /** Entidad a la que pertenecen los comentarios (`"Producto"`, `"Grupo"`, `"Operacion"`…). */
  relacion?: string
  relacionId?: number
  /** Se llama tras agregar o borrar un comentario para recargar la lista. */
  fnActualizar?: () => void
  /** Sin efecto: lo pasan algunos consumidores heredados (el formulario depende de `editar`). */
  formVisible?: boolean
}

const Comentarios = ({
  comentarios,
  loading = false,
  disabled = false,
  editar = false,
  relacion,
  relacionId,
  fnActualizar,
}: ComentariosProps) => {
  const [habilitadoInterno, setHabilitadoInterno] = useState(true)
  const [form] = Form.useForm<ValoresFormaComentario>()

  const handleEliminarComentario = async (comentarioId: number) => {
    setHabilitadoInterno(false)
    try {
      const resp = await ComentarioPeticiones.quitar({
        relacion,
        id: relacionId,
        comentarioId,
      })

      if (resp !== undefined) {
        notification.success({ title: 'Comentario eliminado correctamente' })
        fnActualizar?.()
      }
    } catch {
      // El interceptor de axios ya mostró el error.
    }
    setHabilitadoInterno(true)
  }

  const handleFinish = async (values: ValoresFormaComentario) => {
    setHabilitadoInterno(false)

    let resp
    try {
      resp = await ComentarioPeticiones.nuevo({
        comentario: values.nuevoComentario,
        relacion,
        id: relacionId,
      })
    } catch {
      // El interceptor de axios ya mostró el error; se conserva el texto escrito para reintentar.
    }

    if (resp !== undefined) {
      form.resetFields()
      notification.success({ title: 'Comentario agregado correctamente' })
      fnActualizar?.()
    }
    setHabilitadoInterno(true)
  }

  const componenteHabilitado = habilitadoInterno && !loading && !disabled

  // TODO definir correctamente los permisos de comentarios.
  return (
    <Row style={{ width: '90%', margin: 'auto' }}>
      {editar ? (
        <ACL roles={['COMENTARIOS', 'ADMINISTRADOR']}>
          <Form
            form={form}
            onFinish={handleFinish}
            size="small"
            {...formItemLayout}
            style={{ width: '100%' }}
          >
            <Form.Item
              label="Comentario"
              name="nuevoComentario"
              rules={[
                {
                  required: true,
                  message: 'No puede estar vació el campo',
                },
              ]}
            >
              <TextArea
                rows={2}
                placeholder="Aqui puedes esribir un nuevo comentario"
                disabled={!componenteHabilitado}
              />
            </Form.Item>
            <Form.Item {...wrapperColBtn}>
              <Button
                type="primary"
                htmlType="submit"
                style={{ marginRight: 8 }}
                disabled={!componenteHabilitado}
                loading={loading}
              >
                {' '}
                Agregar{' '}
              </Button>
            </Form.Item>
          </Form>
        </ACL>
      ) : null}
      <Divider titlePlacement="start"> Comentarios </Divider>
      <Row justify="center" style={{ margin: 'auto' }}>
        {comentarios?.length === 0 ? (
          <Empty description="Sin comentarios" />
        ) : (
          <List
            itemLayout="horizontal"
            dataSource={comentarios}
            renderItem={comentario => (
              <List.Item>
                <Comentario
                  key={comentario.id}
                  author={comentario.sesion?.usuario?.nombre}
                  content={comentario.comentario}
                  style={{ width: '100%' }}
                  actions={[
                    <ACL key="borrar" roles={['ADMINISTRADOR']}>
                      <Button
                        shape="circle"
                        size="small"
                        disabled={!componenteHabilitado}
                        onClick={e => {
                          e.preventDefault()
                          void handleEliminarComentario(comentario.id)
                        }}
                      >
                        <DeleteOutlined />
                      </Button>
                    </ACL>,
                  ]}
                  datetime={
                    <Tooltip title={dayjs(comentario.fecha).format('DD/MMM/YYYY HH:mm:ss')}>
                      <span>{dayjs(comentario.fecha).fromNow()}</span>
                    </Tooltip>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Row>
    </Row>
  )
}

export default Comentarios
