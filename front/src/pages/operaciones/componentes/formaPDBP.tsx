// Forma para préstamo, devolución, baja y previo: básicamente un campo de texto con la clave.
import { Button, Form, Input, InputNumber, Row, Col, Radio } from 'antd'
import type { FormaBusquedaPDBPProps, ValoresBusquedaPDBP } from '../tipos'

export type { FormaBusquedaPDBPProps, ValoresBusquedaPDBP } from '../tipos'

const colLayoutA = {
  xs: 24,
  sm: 12,
  md: 12,
  lg: 8,
  xl: 6,
  xxl: 6,
}
const colLayoutB = {
  xs: 24,
  sm: 8,
  md: 8,
  lg: 6,
  xl: 6,
  xxl: 6,
}

const FormaBusquedaPDBP = ({
  handleFinish,
  cargando,
  habilitado,
  mostrarBajas,
}: FormaBusquedaPDBPProps) => {
  const [form] = Form.useForm<ValoresBusquedaPDBP>()

  const disable = !habilitado || cargando

  const manejoFinish = async (valores: ValoresBusquedaPDBP) => {
    if (await handleFinish(valores)) {
      form.setFieldsValue({ clave: '', cantidad: 1 })
    }
  }

  return (
    <Form onFinish={manejoFinish} form={form} layout="horizontal" initialValues={{ cantidad: 1 }}>
      <Row gutter={3}>
        <Col {...colLayoutA}>
          <Form.Item label="Clave" name="clave">
            <Input placeholder="Ingresa un código" disabled={disable} />
          </Form.Item>
        </Col>
        <Col>
          <Form.Item
            label="Cantidad"
            name="cantidad"
            rules={[{ required: true, message: 'Indica la cantidad' }]}
          >
            <InputNumber min={0.0001} step={1} disabled={disable} style={{ width: 90 }} />
          </Form.Item>
        </Col>
        {mostrarBajas ? (
          <Col {...colLayoutB}>
            <Form.Item
              name="tipoBaja"
              rules={[
                {
                  required: true,
                },
              ]}
            >
              <Radio.Group disabled={disable}>
                <Radio.Button value="13">Justificada</Radio.Button>
                <Radio.Button value="16">Injustificada</Radio.Button>
              </Radio.Group>
            </Form.Item>
          </Col>
        ) : null}

        <Col>
          <Form.Item>
            <Button type="primary" htmlType="submit" disabled={disable} loading={cargando}>
              Buscar
            </Button>
          </Form.Item>
        </Col>
      </Row>
    </Form>
  )
}

export default FormaBusquedaPDBP
