import { Form, Skeleton, Modal, InputNumber, Select } from 'antd'
import type { Numerico, PrecioTipo } from 'types/api'

/** Valores del formulario de precio. */
export interface ValoresFormaPrecio {
  precio: Numerico | ''
  moneda?: string
}

/** Valores con los que se abre el formulario (el nombre del tipo de precio es la etiqueta del campo). */
export interface ValoresInicialesPrecio extends ValoresFormaPrecio {
  precioTipo: Pick<PrecioTipo, 'nombre'>
}

export interface ModalFormaPreciosProps {
  valoresIniciales: ValoresInicialesPrecio
  mostrarModal: boolean
  /** Sin valor (`undefined`/`null`) se muestra un esqueleto en lugar del formulario. */
  guardando?: boolean | null
  habilitado?: boolean
  handleCreate: (valores: ValoresFormaPrecio) => void
  cerrarModal: () => void
}

const ModalFormaPrecios = ({
  valoresIniciales,
  mostrarModal,
  guardando,
  habilitado = false,
  handleCreate,
  cerrarModal,
}: ModalFormaPreciosProps) => {
  const [form] = Form.useForm<ValoresFormaPrecio>()

  const cargandoForma = guardando === null || guardando === undefined

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
        <Form layout="horizontal" form={form} style={{ width: '100%' }}>
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
              parser={value => (value ?? '').replace(/\$\s?|(,*)/g, '')}
              placeholder="Precio del producto"
              disabled={guardando || !habilitado}
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
