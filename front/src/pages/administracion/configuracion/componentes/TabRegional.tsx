import { useEffect } from 'react'
import { Button, Form, Input, Select, Skeleton } from 'antd'
import type { Regional } from 'services/axios/configuracion'
import { useSeccion } from './useSeccion'

/** Pestaña Regional: monedas, idioma y zona horaria. */
export default function TabRegional() {
  const [form] = Form.useForm<Regional>()
  const { datos, cargando, guardando, guardar } = useSeccion<Regional>('regional', form)
  const monedas = Form.useWatch('monedas', form) ?? []

  useEffect(() => {
    if (datos) form.setFieldsValue(datos.valor)
  }, [datos, form])

  if (cargando && !datos) return <Skeleton active />

  return (
    <Form<Regional>
      form={form}
      layout="vertical"
      onFinish={valores => void guardar(valores)}
      style={{ maxWidth: 480 }}
    >
      <Form.Item
        label="Monedas"
        name="monedas"
        rules={[{ required: true, message: 'Al menos una moneda' }]}
      >
        <Select mode="tags" tokenSeparators={[',', ' ']} placeholder="MXN, USD…" />
      </Form.Item>
      <Form.Item label="Moneda por defecto" name="monedaPorDefecto" rules={[{ required: true }]}>
        <Select options={monedas.map(m => ({ label: m, value: m }))} />
      </Form.Item>
      <Form.Item
        label="Idioma y país (locale)"
        name="locale"
        rules={[{ required: true, pattern: /^[a-z]{2}(-[A-Z]{2})?$/ }]}
      >
        <Input placeholder="es-MX" />
      </Form.Item>
      <Form.Item label="Zona horaria" name="zonaHoraria" rules={[{ required: true }]}>
        <Input placeholder="America/Mexico_City" />
      </Form.Item>
      <Button type="primary" htmlType="submit" loading={guardando}>
        Guardar regional
      </Button>
    </Form>
  )
}
