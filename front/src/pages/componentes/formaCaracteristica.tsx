import { Form, Input, Skeleton, Modal } from 'antd'
import type { ProductoCaracteristica } from 'types/api'

/** Valores del formulario de característica (`llave`: nombre; `valor`: descripción). */
export type ValoresFormaCaracteristica = Pick<ProductoCaracteristica, 'llave' | 'valor'>

export interface ModalFormaCaracteristicaProps {
  valoresIniciales: ValoresFormaCaracteristica
  mostrarModal: boolean
  /** Sin valor (`undefined`/`null`) se muestra un esqueleto en lugar del formulario. */
  guardando?: boolean | null
  habilitado?: boolean
  esNuevo?: boolean
  handleCreate: (valores: ValoresFormaCaracteristica) => void
  cerrarModal: () => void
}

const ModalFormaCaracteristica = ({
  valoresIniciales,
  mostrarModal,
  guardando,
  habilitado = false,
  esNuevo = false,
  handleCreate,
  cerrarModal,
}: ModalFormaCaracteristicaProps) => {
  const [form] = Form.useForm<ValoresFormaCaracteristica>()

  const cargandoForma =
    guardando === null ||
    guardando === undefined ||
    (!esNuevo && valoresIniciales.llave.length === 0)

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
        <Form layout="horizontal" form={form} style={{ width: '100%' }}>
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
