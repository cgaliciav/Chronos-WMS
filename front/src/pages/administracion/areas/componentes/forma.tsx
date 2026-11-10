import { useEffect } from 'react'
import { Button, Form, Input } from 'antd'
import type { PropsForma, ValoresFormaArea } from '../../tipos'

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

const FormaArea = ({
  handleFinish,
  guardando,
  habilitado,
  valoresIniciales,
  valores,
}: PropsForma<ValoresFormaArea>) => {
  const [form] = Form.useForm<ValoresFormaArea>()
  useEffect(() => {
    if (valores) form.setFieldsValue(valores)
  }, [form, valores])

  return (
    <Form {...formItemLayout} onFinish={handleFinish} initialValues={valoresIniciales} form={form}>
      <Form.Item
        label="Nombre del área"
        name="nombre"
        rules={[
          {
            required: true,
            min: 3,
            max: 255,
            message: 'El nombre debe ser de por lo menos 3 caracteres y hasta 255 carateres',
          },
        ]}
      >
        <Input placeholder="Nombre del área" disabled={guardando || !habilitado} />
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

export default FormaArea
