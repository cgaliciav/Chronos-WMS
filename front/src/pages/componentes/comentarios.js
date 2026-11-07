import React, { useState } from 'react'
import {
  Button,
  Comment,
  Divider,
  Empty,
  Row,
  Tooltip,
  Form,
  Input,
  notification,
  List,
} from 'antd'
import moment from 'moment'
import ACL from 'components/cleanui/system/ACL'
import ComentarioPeticiones from 'services/axios/comentarios'

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
};

const wrapperColBtn = {
  wrapperCol: {
    xs: {
      span: 24,
      offset: 0,
    },
    sm: {
      span: 16,
      offset: 8,
    },
    md:{
      span: 18,
      offset: 6,
    },
    lg:{
      span: 18,
      offset: 6,
    },
    xl:{
      span: 20,
      offset: 4,
    }
  }
}

const Comentarios = ({
  comentarios,
  loading,
  disabled,
  editar,
  relacion,
  relacionId,
  fnActualizar,
}) => {
  const [habilitadoInterno, setHabilitadoInterno] = useState(true)
  const [form] = Form.useForm()

  const handleEliminarComentario = async comentarioId => {
    // e.preventDefault();
    setHabilitadoInterno(false)
    const resp = await ComentarioPeticiones.quitar({
      relacion,
      id: relacionId,
      comentarioId,
    })

    if (resp !== undefined) {
      notification.success({ message: 'Comentario eliminado correctamente' })
      fnActualizar()
    }
    setHabilitadoInterno(true)
  }

  const handleFinish = async values => {
    setHabilitadoInterno(false)

    const resp = await ComentarioPeticiones.nuevo({
      comentario: values.nuevoComentario,
      relacion,
      id: relacionId,
    })
    form.resetFields()

    if (resp !== undefined) {
      notification.success({ message: 'Comentario agregado correctamente' })
      fnActualizar()
    }
    setHabilitadoInterno(true)
  }

  const componenteHabilitado = habilitadoInterno && !loading && !disabled

  // TODO definir correctamente los permisos de comentarios.
  return (
    <Row style={{ width: '90%', margin: 'auto' }}>
      {editar ? (
        <ACL roles={['COMENTARIOS','ADMINISTRADOR']}>
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
                className="mr-2"
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
      <Divider orientation="left"> Cometarios </Divider>
      <Row justify="center" style={{ margin: 'auto' }}>
        {comentarios?.length === 0 ? (
          <Empty description="Sin comentarios" />
        ) : (
          <List
            itemLayout="horizontal"
            dataSource={comentarios}
            renderItem={comentario => (
              <List.Item>
                <Comment
                  key={`cm${Math.random()}`}
                  author={comentario.sesion.usuario?.nombre}
                  content={comentario.comentario}
                  style={{ width: '100%' }}
                  actions={[
                    <ACL roles={['ADMINISTRADOR']}>
                      <Button
                        shape="circle"
                        size="small"
                        disabled={!componenteHabilitado}
                        onClick={e => {
                          e.preventDefault()
                          handleEliminarComentario(comentario.id)
                        }}
                      >
                        <i className="icmn-bin" />
                      </Button>
                    </ACL>,
                  ]}
                  datetime={
                    <Tooltip title={moment(comentario.fecha).format('DD/MMM/YYY  HH:mm:ss')}>
                      <span>{moment(comentario.fecha).fromNow()}</span>
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

// comentarios.map(comentario => {
//   const { usuario } = comentario.sesion
//     ? comentario.sesion
//     : { usuario: { nombre: 'Error al cargar usuario' } }
//   return (
//     <Comment
//       key={`cm${Math.random()}`}
//       author={usuario.nombre}
//       content={comentario.comentario}
//       style={{ width: '100%' }}
//       actions={[
//         <ACL roles={['ADMINISTRADOR']}>
//           <Button
//             shape="circle"
//             size="small"
//             disabled={!componenteHabilitado}
//             onClick={(e) => {
//               e.preventDefault();
//               handleEliminarComentario(comentario.id)
//             }}
//           >
//             <i className="icmn-bin" />
//           </Button>
//         </ACL>,
//       ]}
//       datetime={
//         <Tooltip title={moment(comentario.fecha).format('DD/MMM/YYY  HH:mm:ss')}>
//           <span>{moment(comentario.fecha).fromNow()}</span>
//         </Tooltip>
//       }
//     />
//   )
// })
