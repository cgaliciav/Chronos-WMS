import React, { useEffect } from 'react'

import dayjs from 'dayjs'
import { Form, Button, Select, Skeleton, InputNumber, Row, DatePicker } from 'antd'
import { mapeoOpciones } from 'helpers/funcionesExtras'

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

// sfc
const FormaEdicionDisponibilidad = ({
  valoresIniciales,
  guardando,
  habilitado,
  // esNuevo,
  handleFinish,
}) => {
  // const [habilitadoInterno, setHabilitadoInterno] = useState(false)
  // const [listadoBodegas, setListadoBodegas] = useState([])
  // const [listadoAreas, setListadoAreas] = useState([])
  // usf

  // uef
  useEffect(() => {
  }, [])

  const [form] = Form.useForm()

  if (guardando === null || guardando === undefined || valoresIniciales.id === 0) {
    return (
      <Row style={{ width: '90%', margin: 'auto' }}>
        <Skeleton active />
      </Row>
    )
  }
  // cantidad
  // cantidadAlmacen
  // fechaDisponibilidad
  // disponible

  // console.log('valoresIniciales', valoresIniciales)

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
            showSearch
            placeholder="Selecciona un estado"
            allowClear
            disabled={guardando || !habilitado}
            filterOption={(input, option) =>
              option.props.children[0].toLowerCase().indexOf(input.toLowerCase()) >= 0
            }
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
            className="mr-2"
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
