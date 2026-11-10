import { useState } from 'react'
import { Form, Skeleton, Modal, Input, Radio } from 'antd'

export type ModoClave = 'autogenerada' | 'manual'

/** Valores del formulario de clave: `clave` solo aplica en modo manual. */
export interface ValoresFormaClave {
  modo: ModoClave
  clave?: string
}

export interface ModalFormaClaveProps {
  mostrarModal: boolean
  /** Sin valor (`undefined`/`null`) se muestra un esqueleto en lugar del formulario. */
  guardando?: boolean | null
  habilitado?: boolean
  handleCreate: (valores: ValoresFormaClave) => void
  cerrarModal: () => void
}

const ModalFormaClave = ({
  mostrarModal,
  guardando,
  habilitado = false,
  handleCreate,
  cerrarModal,
}: ModalFormaClaveProps) => {
  const [modo, setModo] = useState<ModoClave>('autogenerada')

  const onModoChange = ({ modo: modoForma }: Partial<ValoresFormaClave>) => {
    // Solo cuando cambia el modo (antes también se borraba al escribir la clave).
    if (modoForma !== undefined) setModo(modoForma)
  }

  const [form] = Form.useForm<ValoresFormaClave>()

  const cargandoForma = guardando === null || guardando === undefined

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
