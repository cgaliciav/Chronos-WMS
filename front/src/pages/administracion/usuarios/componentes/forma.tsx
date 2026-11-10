import { useEffect, useState } from 'react'

import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'
import { Form, Button, Select, Input, DatePicker, Divider, Tag, Spin } from 'antd'
import { mapeoOpciones } from 'helpers/funcionesExtras'
import AreaPeticiones from 'services/axios/areas'
import RolPeticiones from 'services/axios/roles'
import BodegaPeticiones from 'services/axios/bodegas'
import ProyectoPeticiones from 'services/axios/proyectos'
import type { ElementoListado } from 'services/axios'
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
  const [listadoRoles, setListadoRoles] = useState<ElementoListado[]>([])
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
      RolPeticiones.listadoSimple(),
      BodegaPeticiones.listadoSimple(),
      ProyectoPeticiones.listadoSimple(),
      AreaPeticiones.listadoSimple(),
    ])
      .then(resp => {
        if (resp !== undefined) {
          const [roles, bodegas, proyectos, areas] = resp
          setListadoAreas(areas)
          setListadoBodegas(bodegas)
          setListadoProyectos(proyectos)
          setListadoRoles(roles)
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

  const listadoProyectosInternos = listadoProyectos.filter(it => !it.esExterno)
  const listadoProyectosExternos = listadoProyectos.filter(it => it.esExterno)

  return (
    <Spin spinning={!habilitadoInterno}>
      <Form
        form={form}
        onFinish={handleFinish}
        initialValues={valoresIniciales}
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
        <Form.Item
          label="Roles"
          name="roles"
          rules={[
            {
              required: true,
              message: 'El usuario debe tener al menos un rol asignado',
            },
          ]}
        >
          <Select
            showSearch={busqueda}
            placeholder="Selecciona los roles asociados"
            allowClear
            mode="multiple"
            disabled={!habilitadoInterno || guardando || !habilitado}
          >
            {mapeoOpciones(listadoRoles)}
          </Select>
        </Form.Item>
        <Form.Item
          label="Areas"
          name="areas"
          rules={[
            {
              required: true,
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
              required: true,
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
