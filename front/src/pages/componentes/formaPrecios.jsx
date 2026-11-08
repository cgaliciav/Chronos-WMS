import React, { useEffect } from 'react'
import { Form, Skeleton, Modal, InputNumber, Select } from 'antd'

// sfc
const ModalFormaPrecios = ({
  valoresIniciales,
  mostrarModal,
  guardando,
  habilitado,
  handleCreate,
  cerrarModal,
}) => {
  // usf

  // uef
  useEffect(() => {}, [])

  const [form] = Form.useForm()

  const cargandoForma = guardando === null || guardando === undefined

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

  const { nombre: labelPrecio } = valoresIniciales.precioTipo

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
            label={labelPrecio}
            name="precio"
            rules={[
              {
                required: true,
                message: 'El precio debe estar definido',
              },
            ]}
          >
            <InputNumber
              step={0.01}
              formatter={value => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={value => value.replace(/\$\s?|(,*)/g, '')}
              placeholder="Precio del producto"
              disabled={guardando || !habilitado}
              // style={{ width: '100%' }}
            />
          </Form.Item>
          <Form.Item
            label="Moneda"
            name="moneda"
            rules={[
              {
                required: true,
                message: 'El artículo debe tener una moneda',
              },
            ]}
          >
            <Select
              placeholder="Selecciona la moneda"
              disabled={guardando || !habilitado}
              options={[
                { label: 'MXN', value: 'MXN' },
                { label: 'USD', value: 'USD' },
              ]}
            />
          </Form.Item>
        </Form>
      )}
    </Modal>
  )
}

export default ModalFormaPrecios
