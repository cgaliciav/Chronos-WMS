import React, { useState } from 'react'
import { Form, Skeleton, Modal, Input, Radio } from 'antd'

// sfc
const ModalFormaClave = ({ mostrarModal, guardando, habilitado, handleCreate, cerrarModal }) => {
  // usf
  const [modo, setModo] = useState('autogenerada')

  // uef
  // useEffect(() => {}, [])

  const onModoChange = ({ modo: modoForma }) => {
    setModo(modoForma)
  }

  const [form] = Form.useForm()

  const cargandoForma = guardando === null || guardando === undefined

  return (
    <Modal
      visible={mostrarModal}
      onCancel={cerrarModal}
      onOk={() => {
        form
          .validateFields()
          .then(values => {
            form.resetFields()
            handleCreate(values)
          })
          .catch(() => {})
      }}
    >
      {cargandoForma ? (
        <Skeleton active />
      ) : (
        <Form
          layout="horizontal"
          form={form}
          initialValues={{ modo }}
          style={{ width: '100%' }}
          onValuesChange={onModoChange}
        >
          <Form.Item
            label="Modo"
            name="modo"
            rules={[
              {
                required: true,
              },
            ]}
          >
            <Radio.Group disabled={guardando || !habilitado}>
              <Radio.Button value="autogenerada">Autogenerada</Radio.Button>
              <Radio.Button value="manual">Manual</Radio.Button>
            </Radio.Group>
          </Form.Item>
          <Form.Item label="Código" name="clave">
            <Input
              placeholder="Nuevo Código"
              disabled={guardando || !habilitado || modo === 'autogenerada'}
            />
          </Form.Item>
        </Form>
      )}
    </Modal>
  )
}

export default ModalFormaClave
