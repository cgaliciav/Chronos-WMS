import { Form, Button, Select, Skeleton, InputNumber, Row, DatePicker } from 'antd'
import type { Dayjs } from 'dayjs'
import { mapeoOpciones } from 'helpers/funcionesExtras'
import type { Numerico } from 'types/api'
import { filtrarOpcion } from 'helpers/funcionesExtras'

/** Valores del formulario de disponibilidad (`fechaDisponibilidad` es un objeto dayjs del `DatePicker`). */
export interface ValoresDisponibilidad {
  /** Con `0` se muestra el esqueleto. */
  id?: number
  cantidad?: Numerico
  cantidadAlmacen?: Numerico
  /** `disponible`, `no-disponible`, `cuarentena` o `baja`. */
  disponible?: string
  fechaDisponibilidad: Dayjs
}

export interface FormaEdicionDisponibilidadProps {
  valoresIniciales: ValoresDisponibilidad
  /** Sin valor (`null`/`undefined`) se muestra el esqueleto. */
  guardando?: boolean | null
  habilitado?: boolean
  handleFinish: (valores: ValoresDisponibilidad) => void
}

const formItemLayout = {
  labelCol: {
    xs: {
      span: 24,
    },
    sm: {
      span: 8,
    },
    md: {
      span: 6,
    },
    lg: {
      span: 6,
    },
    xl: {
      span: 4,
    },
  },
  wrapperCol: {
    xs: {
      span: 24,
    },
    sm: {
      span: 16,
    },
    md: {
      span: 18,
    },
    lg: {
      span: 18,
    },
    xl: {
      span: 20,
    },
  },
}

const wrapperColBtn = {
  wrapperCol: {
    xs: {
      span: 24,
      offset: 0,
    },
    sm: {
      span: 16,
      offset: 8,
    },
    md: {
      span: 18,
      offset: 6,
    },
    lg: {
      span: 18,
      offset: 6,
    },
    xl: {
      span: 20,
      offset: 4,
    },
  },
}

const FormaEdicionDisponibilidad = ({
  valoresIniciales,
  guardando,
  habilitado,
  handleFinish,
}: FormaEdicionDisponibilidadProps) => {
  const [form] = Form.useForm<ValoresDisponibilidad>()

  if (guardando === null || guardando === undefined || valoresIniciales.id === 0) {
    return (
      <Row style={{ width: '90%', margin: 'auto' }}>
        <Skeleton active />
      </Row>
    )
  }

  return (
    <Row style={{ width: '90%', margin: 'auto' }}>
      <Form
        {...formItemLayout}
        layout="horizontal"
        form={form}
        onFinish={handleFinish}
        initialValues={valoresIniciales}
        style={{ width: '100%' }}
      >
        <Form.Item
          label="Cantidad actual"
          name="cantidad"
          rules={[
            {
              required: true,
            },
          ]}
        >
          <InputNumber placeholder="Cantidad" step={1} disabled={guardando || !habilitado} />
        </Form.Item>
        <Form.Item
          label="Cantidad Total"
          name="cantidadAlmacen"
          rules={[
            {
              required: true,
            },
          ]}
        >
          <InputNumber placeholder="Cantidad" step={1} disabled={guardando || !habilitado} />
        </Form.Item>
        <Form.Item
          label="estado"
          name="disponible"
          rules={[
            {
              required: true,
            },
          ]}
        >
          <Select
            showSearch={{ filterOption: filtrarOpcion }}
            placeholder="Selecciona un estado"
            allowClear
            disabled={guardando || !habilitado}
          >
            {mapeoOpciones([
              { id: 'disponible', nombre: 'disponible' },
              { id: 'no-disponible', nombre: 'no-disponible' },
              { id: 'cuarentena', nombre: 'cuarentena' },
              { id: 'baja', nombre: 'baja' },
            ])}
          </Select>
        </Form.Item>
        <Form.Item
          label="Disponible para:"
          name="fechaDisponibilidad"
          extra="Visible al usuario cuando el estado es 'cuarentena'"
          rules={[
            {
              required: true,
              type: 'object',
            },
          ]}
        >
          <DatePicker format="DD/MMM/YY" disabled={guardando || !habilitado} />
        </Form.Item>
        <Form.Item {...wrapperColBtn}>
          <Button
            type="primary"
            htmlType="submit"
            disabled={guardando || !habilitado}
            loading={guardando}
          >
            Guardar
          </Button>
        </Form.Item>
      </Form>
    </Row>
  )
}

export default FormaEdicionDisponibilidad
