import { useEffect, useState } from 'react'

import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'
import { Form, Button, Checkbox, Select, Input, DatePicker, Divider, Tag, Spin } from 'antd'
import { mapeoOpciones } from 'helpers/funcionesExtras'
import AreaPeticiones from 'services/axios/areas'
import BodegaPeticiones from 'services/axios/bodegas'
import ProyectoPeticiones from 'services/axios/proyectos'
import type { ElementoListado } from 'services/axios'
import { ETIQUETA_PERFIL, OPCIONES_MODO_VISIBILIDAD, OPCIONES_PERFIL } from 'types/api'
import { useUsuarioStore } from 'stores/usuario.store'
import type { PropsForma, ValoresFormaUsuario } from '../../tipos'

const formItemLayout = {
  labelCol: {
    xs: { span: 24 },
    sm: { span: 8 },
    md: { span: 6 },
    lg: { span: 6 },
    xl: { span: 4 },
  },
  wrapperCol: {
    xs: { span: 24 },
    sm: { span: 16 },
    md: { span: 18 },
    lg: { span: 18 },
    xl: { span: 20 },
  },
}

/**
 * Búsqueda de los `Select`: compara con el nombre del catálogo. `mapeoOpciones` deja los hijos de cada opción como
 * `[nombre, ' ']`, y rc-select entrega la opción como datos (`{ value, children }`), no como elemento: el
 * `option.props.children[0]` anterior lanzaba un `TypeError` al escribir en la búsqueda.
 */
const filtrarOpcion = (entrada: string, opcion?: { children?: unknown }): boolean => {
  const hijos = opcion?.children
  const texto: unknown = Array.isArray(hijos) ? hijos[0] : hijos
  return typeof texto === 'string' && texto.toLowerCase().indexOf(entrada.toLowerCase()) >= 0
}

const busqueda = { filterOption: filtrarOpcion }

interface AvisoVencimiento {
  color: string
  texto: string
}

// sfc
const FormaUsuario = ({
  valoresIniciales,
  valores,
  guardando,
  habilitado,
  handleFinish,
}: PropsForma<ValoresFormaUsuario>) => {
  const [habilitadoInterno, setHabilitadoInterno] = useState(false)
  const [listadoBodegas, setListadoBodegas] = useState<ElementoListado[]>([])
  const [listadoProyectos, setListadoProyectos] = useState<ElementoListado[]>([])
  const [listadoAreas, setListadoAreas] = useState<ElementoListado[]>([])
  const [vencimientoAviso, setVencimientoAviso] = useState<AvisoVencimiento>({
    color: 'green',
    texto: 'ACTIVO',
  })

  useEffect(() => {
    setHabilitadoInterno(false)
    Promise.all([
      BodegaPeticiones.listadoSimple(),
      ProyectoPeticiones.listadoSimple(),
      AreaPeticiones.listadoSimple(),
    ])
      .then(resp => {
        if (resp !== undefined) {
          const [bodegas, proyectos, areas] = resp
          setListadoAreas(areas)
          setListadoBodegas(bodegas)
          setListadoProyectos(proyectos)
        }
      })
      // El interceptor de axios ya mostró el error.
      .catch(() => {})
      .finally(() => {
        setHabilitadoInterno(true)
      })
  }, [])

  const handleVencimiento = (date: Dayjs | null) => {
    if (dayjs().isAfter(date)) {
      setVencimientoAviso({
        color: 'red',
        texto: 'VENCIDO',
      })
    } else {
      setVencimientoAviso({
        color: 'green',
        texto: 'ACTIVO',
      })
    }
  }

  const [form] = Form.useForm<ValoresFormaUsuario>()
  useEffect(() => {
    if (valores) form.setFieldsValue(valores)
    if (valores?.fechaVencimiento !== undefined) {
      handleVencimiento(valores.fechaVencimiento)
    }
  }, [form, valores])

  const sinCorreo = Form.useWatch('sinCorreo', form) === true
  // Solo un Superadministrador (el único con el permiso de Configuración) asigna ese perfil; el API también lo exige.
  const esSuperadministrador = useUsuarioStore(estado => estado.permisos.includes('CONFIGURACION-EDITAR'))
  const opcionesPerfil = [
    ...OPCIONES_PERFIL.map(opcion => ({
      ...opcion,
      disabled: opcion.value === 'superadministrador' && !esSuperadministrador,
    })),
    // Un usuario anterior a los perfiles conserva sus roles sueltos mientras no se le asigne otro perfil.
    ...(valores?.perfil === 'personalizado'
      ? [
          {
            value: 'personalizado' as const,
            label: ETIQUETA_PERFIL.personalizado,
            descripcion: 'Conserva los roles que tenía antes de los perfiles',
            disabled: false,
          },
        ]
      : []),
  ]

  const listadoProyectosInternos = listadoProyectos.filter(it => !it.esExterno)
  const listadoProyectosExternos = listadoProyectos.filter(it => it.esExterno)

  return (
    <Spin spinning={!habilitadoInterno}>
      <Form
        form={form}
        onFinish={handleFinish}
        initialValues={{ modoVisibilidad: 'general', ...valoresIniciales }}
        {...formItemLayout}
      >
        <Form.Item
          label="Nombre"
          name="nombre"
          rules={[
            {
              required: true,
              min: 4,
              message: 'El nombre debe tener de por lo menos 4 caracteres',
            },
            {
              max: 255,
              message: 'El nombre no puede tener mas de 255 caracteres',
            },
          ]}
        >
          <Input placeholder="Nombre" disabled={!habilitadoInterno || guardando || !habilitado} />
        </Form.Item>
        <Form.Item
          label="Sin correo"
          name="sinCorreo"
          valuePropName="checked"
          tooltip="Para personas que solo figuran como responsables de préstamos, devoluciones, etc. No entran al sistema y nunca reciben correos ni reportes."
        >
          <Checkbox disabled={!habilitadoInterno || guardando || !habilitado}>
            Solo existe en el sistema: no entra ni recibe correos
          </Checkbox>
        </Form.Item>
        {!sinCorreo && (
          <Form.Item
            label="Correo"
            name="correo"
            rules={[
              {
                required: true,
                type: 'email',
                message: 'Debe ser un correo electrónico válido',
              },
            ]}
          >
            <Input
              placeholder="Correo"
              type="email"
              disabled={!habilitadoInterno || guardando || !habilitado}
            />
          </Form.Item>
        )}
        <Form.Item label="Vencimiento">
          <Form.Item
            name="fechaVencimiento"
            noStyle
            rules={[
              {
                required: true,
                type: 'object',
                message: 'El usuario debe tener fecha de vencimineto',
              },
            ]}
          >
            <DatePicker
              format="DD/MMM/YY"
              onChange={handleVencimiento}
              disabled={!habilitadoInterno || guardando || !habilitado}
            />
          </Form.Item>
          <Divider orientation="vertical" />
          <Tag color={vencimientoAviso.color}> {vencimientoAviso.texto} </Tag>
        </Form.Item>
        {!sinCorreo && (
          <Form.Item
            label="Perfil"
            name="perfil"
            tooltip="Del perfil salen todos los permisos del usuario."
            rules={[{ required: true, message: 'Indica el perfil del usuario' }]}
          >
            <Select
              placeholder="Selecciona el perfil"
              disabled={!habilitadoInterno || guardando || !habilitado}
              options={opcionesPerfil}
              optionRender={opcion => (
                <div>
                  <div>{opcion.label}</div>
                  <div style={{ fontSize: 12, opacity: 0.65, whiteSpace: 'normal' }}>
                    {opcion.data.descripcion}
                  </div>
                </div>
              )}
            />
          </Form.Item>
        )}
        <Form.Item
          label="Areas"
          name="areas"
          rules={[
            {
              required: !sinCorreo,
              message: 'El usuario debe tener al menos un area asignada',
            },
          ]}
        >
          <Select
            showSearch={busqueda}
            placeholder="Selecciona las áreas asociadas"
            allowClear
            mode="multiple"
            disabled={!habilitadoInterno || guardando || !habilitado}
          >
            {mapeoOpciones(listadoAreas)}
          </Select>
        </Form.Item>
        <Form.Item
          label="Almacenes"
          name="bodegas"
          rules={[
            {
              required: !sinCorreo,
              message: 'El usuario debe tener al menos un almacén asignada',
            },
          ]}
        >
          <Select
            showSearch={busqueda}
            placeholder="Selecciona los almacenes asociadas"
            allowClear
            mode="multiple"
            disabled={!habilitadoInterno || guardando || !habilitado}
          >
            {mapeoOpciones(listadoBodegas)}
          </Select>
        </Form.Item>
        <Form.Item label="Proyectos Internos" name="proyectosInternos">
          <Select
            showSearch={busqueda}
            placeholder="Selecciona los proyectos asociados"
            allowClear
            mode="multiple"
            disabled={!habilitadoInterno || guardando || !habilitado}
          >
            {mapeoOpciones(listadoProyectosInternos)}
          </Select>
        </Form.Item>

        {!sinCorreo && (
          <Form.Item
            label="Visibilidad"
            name="modoVisibilidad"
            tooltip="Producción exclusiva: solo ve los artículos comprados por sus proyectos o cuyo último movimiento es de ellos. Usuario exclusivo: solo ve los artículos en cuyos movimientos es responsable o quien registró. Lo que no ve tampoco lo puede operar. Los administradores siempre ven todo."
            rules={[{ required: true, message: 'Indica qué artículos puede ver el usuario' }]}
          >
            <Select
              disabled={!habilitadoInterno || guardando || !habilitado}
              options={OPCIONES_MODO_VISIBILIDAD}
            />
          </Form.Item>
        )}

        <Form.Item label="Proyectos Externos" name="proyectosExternos">
          <Select
            showSearch={busqueda}
            placeholder="Selecciona los proyectos asociados"
            allowClear
            mode="multiple"
            disabled={!habilitadoInterno || guardando || !habilitado}
          >
            {mapeoOpciones(listadoProyectosExternos)}
          </Select>
        </Form.Item>

        <Form.Item label={' '}>
          <Button
            type="primary"
            htmlType="submit"
            disabled={!habilitadoInterno || guardando || !habilitado}
            loading={guardando}
          >
            {' '}
            Guardar{' '}
          </Button>
        </Form.Item>
      </Form>
    </Spin>
  )
}

export default FormaUsuario
