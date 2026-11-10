// Forma para préstamo, devolución, baja y previo: básicamente un campo de texto con la clave.
import { Button, Form, Input, Row, Col, Radio } from 'antd'
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
      form.setFieldsValue({ clave: '' })
    }
  }

  return (
    <Form onFinish={manejoFinish} form={form} layout="horizontal">
      <Row gutter={6}>
        <Col {...colLayoutA}>
          <Form.Item label="Clave" name="clave">
            <Input placeholder="Ingresa un código" disabled={disable} />
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
