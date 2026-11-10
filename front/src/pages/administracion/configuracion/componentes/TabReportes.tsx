import { useEffect } from 'react'
import { Button, Form, Input, Skeleton, Typography } from 'antd'
import SubirImagen from './SubirImagen'
import { useSeccion } from './useSeccion'

interface ValorReportes {
  logoId?: number | null
  encabezado?: string
}

/** Pestaña Reportes: logo de los Excel y texto de encabezado. */
export default function TabReportes() {
  const [form] = Form.useForm<ValorReportes>()
  const { datos, setDatos, cargando, guardando, guardar } = useSeccion<ValorReportes>(
    'reportes',
    form,
  )

  useEffect(() => {
    if (datos) form.setFieldsValue(datos.valor)
  }, [datos, form])

  if (cargando && !datos) return <Skeleton active />

  return (
    <Form<ValorReportes>
      form={form}
      layout="vertical"
      onFinish={({ encabezado }) =>
        void guardar({ ...datos?.valor, encabezado: encabezado || undefined })
      }
      style={{ maxWidth: 480 }}
    >
      <Form.Item label="Logo de los reportes Excel">
        <Typography.Paragraph type="secondary">
          {datos?.valor.logoId
            ? 'Logo propio configurado.'
            : 'Sin logo propio: se usa el de Chronos WMS.'}
        </Typography.Paragraph>
        <SubirImagen
          destino="reportes/logo"
          texto="Subir logo de reportes"
          alSubir={seccion => setDatos(seccion as never)}
        />
      </Form.Item>
      <Form.Item label="Encabezado (opcional)" name="encabezado" rules={[{ max: 120 }]}>
        <Input />
      </Form.Item>
      <Button type="primary" htmlType="submit" loading={guardando}>
        Guardar reportes
      </Button>
    </Form>
  )
}
