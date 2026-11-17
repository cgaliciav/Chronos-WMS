// Forma de una transformación (decisión 20): el artículo original, cuántas unidades se usan y los productos nuevos.
import { Button, Col, Form, Input, InputNumber, Row, Select, Space, Typography } from 'antd'
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons'
import { OPCIONES_PRODUCTO_TIPO } from 'types/api'

export interface ProductoTransformado {
  titulo: string
  descripcion?: string
  cantidad: number
  /** Sin valor, el producto nuevo es del mismo tipo que el original. */
  productoTipoId?: number
}

export interface ValoresTransformacion {
  clave: string
  cantidad: number
  productos: ProductoTransformado[]
}

export interface FormaTransformacionProps {
  /** Si devuelve (o resuelve) un valor verdadero, el formulario se vacía para la siguiente transformación. */
  handleFinish: (valores: ValoresTransformacion) => unknown
  cargando?: boolean
  habilitado?: boolean
}

const productoVacio = (): Partial<ProductoTransformado> => ({ cantidad: 1 })

const OPCIONES_TIPO = [{ value: 0, label: 'Igual que el original' }, ...OPCIONES_PRODUCTO_TIPO]

const FormaTransformacion = ({ handleFinish, cargando, habilitado }: FormaTransformacionProps) => {
  const [form] = Form.useForm<ValoresTransformacion>()
  const deshabilitado = !habilitado || cargando

  const manejoFinish = async (valores: ValoresTransformacion) => {
    if (await handleFinish(valores)) {
      form.resetFields()
    }
  }

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={manejoFinish}
      initialValues={{ cantidad: 1, productos: [productoVacio()] }}
    >
      <Typography.Title level={5}>Artículo que se transforma</Typography.Title>
      <Row gutter={12}>
        <Col xs={24} sm={14} md={10} lg={8}>
          <Form.Item
            label="Clave"
            name="clave"
            rules={[{ required: true, min: 4, message: 'Ingresa el código del artículo' }]}
          >
            <Input placeholder="Ingresa un código" disabled={deshabilitado} />
          </Form.Item>
        </Col>
        <Col>
          <Form.Item
            label="Unidades usadas"
            name="cantidad"
            tooltip="Unidades del artículo que la producción transformó. Se descuentan de lo que tiene pendiente."
            rules={[{ required: true, message: 'Indica cuántas unidades se usan' }]}
          >
            <InputNumber min={0.0001} step={1} disabled={deshabilitado} style={{ width: 130 }} />
          </Form.Item>
        </Col>
      </Row>

      <Typography.Title level={5}>Productos nuevos</Typography.Title>
      <Form.List name="productos">
        {(campos, { add, remove }) => (
          <>
            {campos.map(({ key, name, ...resto }) => (
              <Row gutter={12} key={key} align="top">
                <Col xs={24} md={8}>
                  <Form.Item
                    {...resto}
                    label="Título"
                    name={[name, 'titulo']}
                    rules={[
                      {
                        required: true,
                        min: 4,
                        message: 'El título debe tener al menos 4 caracteres',
                      },
                      { max: 255, message: 'El título no puede tener más de 255 caracteres' },
                    ]}
                  >
                    <Input placeholder="Nombre del producto nuevo" disabled={deshabilitado} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={7}>
                  <Form.Item {...resto} label="Descripción" name={[name, 'descripcion']}>
                    <Input placeholder="Opcional" disabled={deshabilitado} />
                  </Form.Item>
                </Col>
                <Col xs={10} md={3}>
                  <Form.Item
                    {...resto}
                    label="Cantidad"
                    name={[name, 'cantidad']}
                    rules={[{ required: true, message: 'Indica la cantidad' }]}
                  >
                    <InputNumber
                      min={0.0001}
                      step={1}
                      disabled={deshabilitado}
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
                <Col xs={10} md={4}>
                  <Form.Item
                    {...resto}
                    label="Tipo"
                    name={[name, 'productoTipoId']}
                    initialValue={0}
                  >
                    <Select disabled={deshabilitado} options={OPCIONES_TIPO} />
                  </Form.Item>
                </Col>
                <Col xs={4} md={2}>
                  <Form.Item label=" ">
                    <Button
                      type="text"
                      danger
                      icon={<MinusCircleOutlined />}
                      aria-label="Quitar producto"
                      disabled={deshabilitado || campos.length === 1}
                      onClick={() => remove(name)}
                    />
                  </Form.Item>
                </Col>
              </Row>
            ))}
            <Space>
              <Button
                icon={<PlusOutlined />}
                disabled={deshabilitado}
                onClick={() => add(productoVacio())}
              >
                Agregar producto
              </Button>
              <Button type="primary" htmlType="submit" disabled={deshabilitado} loading={cargando}>
                Transformar
              </Button>
            </Space>
          </>
        )}
      </Form.List>
    </Form>
  )
}

export default FormaTransformacion
