import { useEffect } from 'react'
import { Form, Button, Input, DatePicker, Select } from 'antd'
import type { PropsForma, ValoresFormaProyecto } from '../../tipos'

const { Option } = Select
const { TextArea } = Input

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

const FormaProyecto = ({
  handleFinish,
  guardando,
  habilitado,
  valoresIniciales,
  valores,
}: PropsForma<ValoresFormaProyecto>) => {
  const [form] = Form.useForm<ValoresFormaProyecto>()
  useEffect(() => {
    if (valores) form.setFieldsValue(valores)
  }, [form, valores])

  return (
    <Form {...formItemLayout} onFinish={handleFinish} initialValues={valoresIniciales} form={form}>
      <Form.Item
        label="Nombre del proyecto"
        name="nombre"
        rules={[
          {
            required: true,
            min: 3,
            max: 255,
            message: 'El nombre debe ser de tener 3 y hasta 255 caracteres',
          },
        ]}
      >
        <Input placeholder="Nombre del proyecto" disabled={guardando || !habilitado} />
      </Form.Item>

      <Form.Item
        label="Productor"
        name="productor"
        rules={[
          {
            required: true,
            max: 200,
            message: 'El nombre del productor solo puede ser de 200 caracteres',
          },
        ]}
      >
        <Input placeholder="Nombre del productor" disabled={guardando || !habilitado} />
      </Form.Item>

      <Form.Item
        label="Fecha de inicio"
        name="fecha"
        rules={[
          {
            type: 'object',
            required: true,
            message: 'El proyecto debe tener una fecha de inicio',
          },
        ]}
      >
        <DatePicker disabled={guardando || !habilitado} format="DD/MMM/YY" />
      </Form.Item>

      <Form.Item
        label="Descripción"
        name="descripcion"
        rules={[
          {
            required: true,
          },
        ]}
      >
        <TextArea disabled={guardando || !habilitado} rows={4} />
      </Form.Item>

      <Form.Item label="Tipo de Proyecto" name="tipoProyecto">
        <Select disabled={guardando || !habilitado}>
          <Option value="interno"> Interno </Option>
          <Option value="externo"> Externo </Option>
        </Select>
      </Form.Item>

      <Form.Item label="" {...wrapperColBtn}>
        <Button
          type="primary"
          htmlType="submit"
          disabled={guardando || !habilitado}
          loading={guardando}
        >
          {' '}
          Guardar{' '}
        </Button>
      </Form.Item>
    </Form>
  )
}

export default FormaProyecto
