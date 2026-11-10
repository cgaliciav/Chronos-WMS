import { useEffect, useState } from 'react'
import {
  Alert,
  Button,
  Checkbox,
  Collapse,
  Divider,
  Flex,
  Form,
  Input,
  InputNumber,
  Skeleton,
  Switch,
  Typography,
} from 'antd'
import { notification } from 'helpers/feedback'
import ConfiguracionPeticiones from 'services/axios/configuracion'
import { useSeccion } from './useSeccion'

/** Tipos de plantilla y variables que admite el API (`api/src/esquemas/configuracion.ts`). */
export const TIPOS_PLANTILLA = {
  nuevoUsuario: 'Alta de usuario',
  nuevoPassword: 'Contraseña regenerada',
  reporteAnexo: 'Reporte anexo',
  reporteDescarga: 'Reporte para descarga',
  alerta: 'Alerta',
} as const
export const VARIABLES = [
  'nombreApp',
  'organizacion',
  'soporteCorreo',
  'correo',
  'clave',
  'horas',
  'archivo',
  'enlace',
  'alerta',
]

type TipoPlantilla = keyof typeof TIPOS_PLANTILLA
interface Plantilla {
  asunto?: string
  cuerpo?: string
}
/** Correo tal como lo devuelve `GET /config` (sin la contraseña). */
interface CorreoGuardado {
  transporte: {
    host: string
    puerto: number
    seguro: boolean
    usuario?: string
    cabeceras?: Record<string, string>
    tieneContrasena: boolean
  } | null
  remitente: { nombre: string; correo?: string }
  soporteCorreo?: string
  plantillas: Partial<Record<TipoPlantilla, Plantilla>>
}
interface ValoresForma {
  usarTransporte: boolean
  transporte?: {
    host?: string
    puerto?: number
    seguro?: boolean
    usuario?: string
    contrasena?: string
    borrarContrasena?: boolean
  }
  remitente: { nombre: string; correo?: string }
  soporteCorreo?: string
  plantillas: Partial<Record<TipoPlantilla, Plantilla>>
}

/** Lo que se envía en `PUT /config/correo`: la contraseña es solo de escritura (vacía = se conserva). */
export function correoParaGuardar(valores: ValoresForma, guardado: CorreoGuardado) {
  const t = valores.transporte ?? {}
  const contrasena = t.borrarContrasena ? null : t.contrasena ? t.contrasena : undefined
  const plantillas = Object.fromEntries(
    Object.entries(valores.plantillas ?? {}).filter(
      ([, p]) => p?.asunto?.trim() && p.cuerpo?.trim(),
    ),
  )
  return {
    transporte: valores.usarTransporte
      ? {
          host: t.host ?? '',
          puerto: t.puerto ?? 587,
          seguro: Boolean(t.seguro),
          ...(t.usuario ? { usuario: t.usuario } : {}),
          ...(guardado.transporte?.cabeceras ? { cabeceras: guardado.transporte.cabeceras } : {}),
          ...(contrasena !== undefined ? { contrasena } : {}),
        }
      : null,
    remitente: {
      nombre: valores.remitente.nombre,
      ...(valores.remitente.correo ? { correo: valores.remitente.correo } : {}),
    },
    ...(valores.soporteCorreo ? { soporteCorreo: valores.soporteCorreo } : {}),
    plantillas,
  }
}

/** Pestaña Correo: servidor SMTP, remitente, plantillas y correo de prueba. */
export default function TabCorreo() {
  const [form] = Form.useForm<ValoresForma>()
  const { datos, cargando, guardando, guardar } = useSeccion<CorreoGuardado>('correo', form)
  const [probando, setProbando] = useState(false)
  const usarTransporte = Form.useWatch('usarTransporte', form)

  useEffect(() => {
    if (!datos) return
    const { transporte, ...resto } = datos.valor
    form.setFieldsValue({
      ...resto,
      usarTransporte: transporte !== null,
      transporte: transporte
        ? { ...transporte, contrasena: '', borrarContrasena: false }
        : { puerto: 587, seguro: false },
    })
  }, [datos, form])

  if (cargando && !datos) return <Skeleton active />

  const probar = () => {
    setProbando(true)
    ConfiguracionPeticiones.probarCorreo()
      .then(r =>
        notification.success({
          title: 'Correo de prueba enviado',
          description: `A ${r.destino} (transporte: ${r.transporte})`,
        }),
      )
      .catch(() => {})
      .finally(() => setProbando(false))
  }

  return (
    <Form<ValoresForma>
      form={form}
      layout="vertical"
      onFinish={valores => datos && void guardar(correoParaGuardar(valores, datos.valor) as never)}
      style={{ maxWidth: 720 }}
    >
      <Form.Item
        label="Usar un servidor SMTP propio"
        name="usarTransporte"
        valuePropName="checked"
        extra="Si no, se usa el del servidor (variables SMTP_*)."
      >
        <Switch />
      </Form.Item>
      {usarTransporte && (
        <>
          <Flex gap={16} wrap>
            <Form.Item
              label="Servidor"
              name={['transporte', 'host']}
              rules={[{ required: true }]}
              style={{ flex: 2, minWidth: 200 }}
            >
              <Input placeholder="smtp.ejemplo.com" />
            </Form.Item>
            <Form.Item label="Puerto" name={['transporte', 'puerto']} rules={[{ required: true }]}>
              <InputNumber min={1} max={65535} />
            </Form.Item>
            <Form.Item label="TLS directo" name={['transporte', 'seguro']} valuePropName="checked">
              <Switch />
            </Form.Item>
          </Flex>
          <Form.Item label="Usuario" name={['transporte', 'usuario']}>
            <Input autoComplete="off" />
          </Form.Item>
          <Form.Item
            label="Contraseña"
            name={['transporte', 'contrasena']}
            extra={
              datos?.valor.transporte?.tieneContrasena
                ? 'Hay una contraseña guardada: déjalo vacío para conservarla.'
                : 'Sin contraseña guardada.'
            }
          >
            <Input.Password
              autoComplete="new-password"
              placeholder={datos?.valor.transporte?.tieneContrasena ? '•••••••• (guardada)' : ''}
            />
          </Form.Item>
          {datos?.valor.transporte?.tieneContrasena && (
            <Form.Item name={['transporte', 'borrarContrasena']} valuePropName="checked">
              <Checkbox>Borrar la contraseña guardada</Checkbox>
            </Form.Item>
          )}
        </>
      )}

      <Divider titlePlacement="start">Remitente</Divider>
      <Flex gap={16} wrap>
        <Form.Item
          label="Nombre"
          name={['remitente', 'nombre']}
          rules={[{ required: true, max: 80 }]}
          style={{ flex: 1, minWidth: 200 }}
        >
          <Input />
        </Form.Item>
        <Form.Item
          label="Correo"
          name={['remitente', 'correo']}
          rules={[{ type: 'email' }]}
          style={{ flex: 1, minWidth: 200 }}
          extra="Vacío: SMTP_FROM del servidor."
        >
          <Input />
        </Form.Item>
      </Flex>
      <Form.Item
        label="Correo de soporte en los mensajes"
        name="soporteCorreo"
        rules={[{ type: 'email' }]}
        extra="Vacío: el de la marca."
      >
        <Input />
      </Form.Item>

      <Divider titlePlacement="start">Plantillas</Divider>
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="Deja asunto y cuerpo vacíos para usar el texto del producto."
        description={
          <Typography.Text>
            Variables:{' '}
            {VARIABLES.map(v => (
              <Typography.Text code key={v}>{`{{${v}}}`}</Typography.Text>
            ))}
          </Typography.Text>
        }
      />
      <Collapse
        items={(Object.keys(TIPOS_PLANTILLA) as TipoPlantilla[]).map(tipo => ({
          key: tipo,
          label: TIPOS_PLANTILLA[tipo],
          forceRender: true,
          children: (
            <>
              <Form.Item
                label="Asunto"
                name={['plantillas', tipo, 'asunto']}
                rules={[{ max: 200 }]}
              >
                <Input />
              </Form.Item>
              <Form.Item
                label="Cuerpo"
                name={['plantillas', tipo, 'cuerpo']}
                rules={[{ max: 10000 }]}
              >
                <Input.TextArea rows={6} />
              </Form.Item>
            </>
          ),
        }))}
      />

      <Flex gap={8} style={{ marginTop: 24 }}>
        <Button type="primary" htmlType="submit" loading={guardando}>
          Guardar correo
        </Button>
        <Button onClick={probar} loading={probando}>
          Enviar correo de prueba
        </Button>
      </Flex>
    </Form>
  )
}
