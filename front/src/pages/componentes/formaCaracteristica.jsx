import React, { useEffect } from 'react'
import { Form, Input, Skeleton, Modal } from 'antd'

// sfc
const ModalFormaCaracteristica = ({
  valoresIniciales,
  mostrarModal,
  guardando,
  habilitado,
  esNuevo,
  handleCreate,
  cerrarModal,
}) => {
  // usf

  // uef
  useEffect(() => {}, [])

  const [form] = Form.useForm()

  const cargandoForma =
    guardando === null ||
    guardando === undefined ||
    (!esNuevo && valoresIniciales.llave.length === 0)

  // console.log(guardando,esNuevo,valoresIniciales);

  // titulo
  // cantidad
  // precio
  // area
  // bodega
  // descripcion

  // console.log('valoresIniciales', valoresIniciales)
  if (!cargandoForma) {
    form.setFieldsValue(valoresIniciales)
  }

  return (
    <Modal
      open={mostrarModal}
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
          // initialValues={valoresIniciales}
          style={{ width: '100%' }}
        >
          <Form.Item
            label="Característica"
            name="llave"
            rules={[
              {
                required: true,
                min: 4,
                message: 'La característica debe tener de por lo menos 4 caracteres',
              },
              {
                max: 60,
                message: 'La característica no puede tener mas de 60 caracteres',
              },
            ]}
          >
            <Input placeholder="Característica" disabled={guardando || !habilitado} />
          </Form.Item>
          <Form.Item
            label="Valor"
            name="valor"
            rules={[
              {
                required: true,
                min: 4,
                message: 'La característica debe tener de por lo menos 4 caracteres',
              },
              {
                max: 255,
                message: 'La característica no puede tener mas de 255 caracteres',
              },
            ]}
          >
            <Input placeholder="Valor" disabled={guardando || !habilitado} />
          </Form.Item>
        </Form>
      )}
    </Modal>
  )
}

export default ModalFormaCaracteristica
