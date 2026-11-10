import { useEffect } from 'react'
import { Button, ColorPicker, Divider, Form, Input, InputNumber, Skeleton, Switch } from 'antd'
import type { Color } from 'antd/es/color-picker'
import type { Marca } from 'app/marca'
import { useMarcaStore } from 'stores/marca.store'
import SubirImagen from './SubirImagen'
import { useSeccion } from './useSeccion'

type ValorMarca = Marca & { logoId?: number | null; faviconId?: number | null }

const aHex = (valor: Color | string) => (typeof valor === 'string' ? valor : valor.toHexString())

/** Pestaña Marca: nombre, textos, soporte, crédito, tema e imágenes. */
export default function TabMarca() {
  const [form] = Form.useForm<ValorMarca>()
  const { datos, setDatos, cargando, guardando, guardar } = useSeccion<ValorMarca>('marca', form)
  const logo = useMarcaStore(estado => estado.logo)
  const favicon = useMarcaStore(estado => estado.favicon)

  useEffect(() => {
    if (datos) form.setFieldsValue(datos.valor)
  }, [datos, form])

  if (cargando && !datos) return <Skeleton active />

  const alGuardar = (valores: ValorMarca) => {
    const { tema } = valores
    void guardar({
      ...datos?.valor,
      ...valores,
      soporteTelefono: valores.soporteTelefono || undefined,
      avisoPrivacidadUrl: valores.avisoPrivacidadUrl || undefined,
      tema: {
        ...tema,
        colorPrimario: aHex(tema.colorPrimario),
        colorEnlaceHover: aHex(tema.colorEnlaceHover),
      },
    })
  }

  return (
    <Form<ValorMarca> form={form} layout="vertical" onFinish={alGuardar} style={{ maxWidth: 640 }}>
      <Form.Item
        label="Nombre de la aplicación"
        name="nombreApp"
        rules={[{ required: true, max: 60 }]}
      >
        <Input />
      </Form.Item>
      <Form.Item
        label="Nombre corto (pestaña del navegador)"
        name="nombreCorto"
        rules={[{ required: true, max: 30 }]}
      >
        <Input />
      </Form.Item>
      <Form.Item label="Organización" name="organizacion" rules={[{ max: 120 }]}>
        <Input />
      </Form.Item>
      <Form.Item label="Texto de bienvenida (login)" name="textoBienvenida" rules={[{ max: 200 }]}>
        <Input />
      </Form.Item>
      <Form.Item label="Texto de ayuda (login)" name="textoAyudaLogin" rules={[{ max: 300 }]}>
        <Input.TextArea rows={2} />
      </Form.Item>
      <Form.Item
        label="Correo de soporte"
        name="soporteCorreo"
        rules={[{ required: true, type: 'email' }]}
      >
        <Input />
      </Form.Item>
      <Form.Item label="Teléfono de soporte" name="soporteTelefono" rules={[{ max: 40 }]}>
        <Input />
      </Form.Item>
      <Form.Item
        label="URL del aviso de privacidad"
        name="avisoPrivacidadUrl"
        rules={[{ type: 'url' }]}
      >
        <Input placeholder="https://…" />
      </Form.Item>

      <Divider titlePlacement="start">Crédito del proveedor (pie de página)</Divider>
      <Form.Item label="Texto" name={['creditoProveedor', 'texto']} rules={[{ max: 80 }]}>
        <Input />
      </Form.Item>
      <Form.Item
        label="URL"
        name={['creditoProveedor', 'url']}
        rules={[{ required: true, type: 'url' }]}
      >
        <Input />
      </Form.Item>
      <Form.Item label="Visible" name={['creditoProveedor', 'visible']} valuePropName="checked">
        <Switch />
      </Form.Item>

      <Divider titlePlacement="start">Tema</Divider>
      <Form.Item
        label="Color primario"
        name={['tema', 'colorPrimario']}
        rules={[{ required: true }]}
      >
        <ColorPicker showText disabledAlpha />
      </Form.Item>
      <Form.Item
        label="Color de enlace al pasar el cursor"
        name={['tema', 'colorEnlaceHover']}
        rules={[{ required: true }]}
      >
        <ColorPicker showText disabledAlpha />
      </Form.Item>
      <Form.Item label="Fuente" name={['tema', 'fuente']} rules={[{ required: true, max: 60 }]}>
        <Input />
      </Form.Item>
      <Form.Item
        label="Radio de las esquinas (px)"
        name={['tema', 'radio']}
        rules={[{ required: true }]}
      >
        <InputNumber min={0} max={16} />
      </Form.Item>

      <Divider titlePlacement="start">Imágenes</Divider>
      <Form.Item label="Logo">
        <SubirImagen
          destino="marca/logo"
          texto="Subir logo"
          vistaPrevia={logo}
          alSubir={seccion => setDatos(seccion as never)}
        />
      </Form.Item>
      <Form.Item label="Favicon">
        <SubirImagen
          destino="marca/favicon"
          texto="Subir favicon"
          vistaPrevia={favicon}
          alSubir={seccion => setDatos(seccion as never)}
        />
      </Form.Item>

      <Button type="primary" htmlType="submit" loading={guardando}>
        Guardar marca
      </Button>
    </Form>
  )
}
