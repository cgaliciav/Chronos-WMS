import React, { useEffect } from 'react'
import { Button, Form, Input, Row, Col } from 'antd'

const { TextArea } = Input

const colLayoutA = {
  xs: 12,
  sm: 12,
  md: 8,
  lg: 6,
  xl: 6,
  xxl: 4,
}

const FormaBusquedaPorCodigo = ({ handleFinish, cargando }) => {
  const [form] = Form.useForm()

  useEffect(() => {
    const tempBusqueda = JSON.parse(localStorage.getItem('catalogoPorCodigo.busqueda'))
    if (tempBusqueda !== undefined && tempBusqueda !== null) {
      form.setFieldsValue(tempBusqueda)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Form onFinish={handleFinish} form={form} layout="vertical">
      <Row gutter={6}>
        <Col {...colLayoutA}>
          <Form.Item
            label="Búsqueda"
            name="codigosBusqueda"
            extra="Un código por línea"
            rules={[
              {
                required: true,
                message: 'No puede estar vació el campo',
              },
            ]}
          >
            <TextArea rows={3} placeholder="Códigos de busqueda" disabled={cargando} />
          </Form.Item>
        </Col>
        <Col>
          <Form.Item label={' '}>
            <Button
              type="primary"
              htmlType="submit"
              // className="mr-4"
              disabled={cargando}
              loading={cargando}
            >
              {' '}
              Buscar{' '}
            </Button>
          </Form.Item>
        </Col>
      </Row>
    </Form>
  )
}

export default FormaBusquedaPorCodigo
