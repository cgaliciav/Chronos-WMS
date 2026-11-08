import { useEffect, useState } from 'react'
import { Button, Form, Input, Select, Row, Col } from 'antd'
import { mapeoOpciones } from 'helpers/funcionesExtras'
import { leerJSON } from 'helpers/storage'
import UsuarioPeticiones from 'services/axios/usuarios'
import type { ElementoListado } from 'services/axios'
import { filtrarOpcion } from 'helpers/funcionesExtras'
import type { BusquedaPorProyecto, FormaBusquedaProps } from '../../tipos'

const colLayoutA = {
  xs: 24,
  sm: 12,
  md: 12,
  lg: 5,
  xl: 5,
  xxl: 5,
}
const colLayoutB = {
  xs: 24,
  sm: 8,
  md: 8,
  lg: 5,
  xl: 5,
  xxl: 5,
}

const FormaBusquedaPorFactura = ({
  handleFinish,
  cargando,
}: FormaBusquedaProps<BusquedaPorProyecto>) => {
  // TODO QUITAR ÁREAS Y PONER PROVEEDOR COMO PARÁMETRO DE BÚSQUEDA.

  const [listadoBodegas, setListadoBodegas] = useState<ElementoListado[]>([])
  const [listadoAreas, setListadoAreas] = useState<ElementoListado[]>([])
  const [listadoProyectos, setListadoProyectos] = useState<ElementoListado[]>([])
  const [habilitadoInterno, setHabilitadoInterno] = useState(false)

  const [form] = Form.useForm<BusquedaPorProyecto>()

  useEffect(() => {
    setHabilitadoInterno(false)
    Promise.all([
      UsuarioPeticiones.obtenerAreas(),
      UsuarioPeticiones.obtenerBodegas(),
      UsuarioPeticiones.obtenerProyectos(),
    ])
      .then(resp => {
        if (resp !== undefined) {
          // Antes se desestructuraba `[bodegas, areas, proyectos]` y las listas salían cruzadas.
          const [areas, bodegas, proyectos] = resp
          setListadoAreas(areas)
          setListadoBodegas(bodegas)
          setListadoProyectos(proyectos)
        }
      })
      // El interceptor de axios ya mostró el error.
      .catch(() => {})
      .finally(() => {
        setHabilitadoInterno(true)
        const tempBusqueda = leerJSON<BusquedaPorProyecto | null>('catalogoFacturas.busqueda', null)
        if (tempBusqueda !== undefined && tempBusqueda !== null) {
          form.setFieldsValue(tempBusqueda)
        }
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // busqueda generica, por area, almacen o estado de inventario (excepto baja)

  return (
    <Form onFinish={handleFinish} form={form} layout="vertical">
      <Row gutter={6}>
        <Col {...colLayoutA}>
          <Form.Item label="# de Factura" name="textoBusqueda">
            <Input placeholder="# de Factura" disabled={!habilitadoInterno || cargando} />
          </Form.Item>
        </Col>
        <Col {...colLayoutA}>
          <Form.Item
            label="Areas"
            name="areas"
            rules={[
              {
                required: true,
                message: 'Selecciones al menos un area',
              },
            ]}
          >
            <Select
              style={{ width: '100%' }}
              showSearch={{ filterOption: filtrarOpcion }}
              placeholder="Selecciona las áreas asociadas"
              allowClear
              mode="multiple"
              disabled={!habilitadoInterno || cargando}
            >
              {mapeoOpciones(listadoAreas)}
            </Select>
          </Form.Item>
        </Col>
        <Col {...colLayoutA}>
          <Form.Item
            label="Almacenes"
            name="bodegas"
            rules={[
              {
                required: true,
                message: 'Selecciona al menos un almacén',
              },
            ]}
          >
            <Select
              style={{ width: '100%' }}
              showSearch={{ filterOption: filtrarOpcion }}
              placeholder="Selecciona los almacenes asociadas"
              allowClear
              mode="multiple"
              disabled={!habilitadoInterno || cargando}
            >
              {mapeoOpciones(listadoBodegas)}
            </Select>
          </Form.Item>
        </Col>
        <Col {...colLayoutB}>
          <Form.Item
            label="Proyecto"
            name="proyecto"
            rules={[
              {
                required: true,
                message: 'Selecciona el proyecto',
              },
            ]}
          >
            <Select
              style={{ width: '100%' }}
              showSearch={{ filterOption: filtrarOpcion }}
              placeholder="Selecciona el proyecto"
              allowClear
              disabled={!habilitadoInterno || cargando}
            >
              {mapeoOpciones(listadoProyectos)}
            </Select>
          </Form.Item>
        </Col>
        <Col>
          <Form.Item label={' '}>
            <Button type="primary" htmlType="submit" disabled={cargando} loading={cargando}>
              {' '}
              Buscar{' '}
            </Button>
          </Form.Item>
        </Col>
      </Row>
    </Form>
  )
}

export default FormaBusquedaPorFactura
