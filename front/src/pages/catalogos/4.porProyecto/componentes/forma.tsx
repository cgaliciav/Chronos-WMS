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

// Tipos de movimiento (ids fijos, docs/api/tipos-de-movimiento.md).
const listadoTipoMovimientos = [
  { id: 3, nombre: 'Préstamo' },
  { id: 4, nombre: 'Devolución' },
  { id: 13, nombre: 'Baja Justificada' },
  { id: 16, nombre: 'Baja Injustificada' },
  { id: 11, nombre: 'Renta Externa' },
  { id: 15, nombre: 'Compra' },
  { id: 7, nombre: 'Transferencia Origen' },
  { id: 12, nombre: 'Transferencia Destino' },
]

const FormaBusquedaProyecto = ({
  handleFinish,
  cargando,
}: FormaBusquedaProps<BusquedaPorProyecto>) => {
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
        const tempBusqueda = leerJSON<BusquedaPorProyecto | null>('catalogoProyecto.busqueda', null)
        if (tempBusqueda !== undefined && tempBusqueda !== null) {
          form.setFieldsValue({ ...tempBusqueda, bodegas: [1] })
        }
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // busqueda generica, por area, almacen o estado de inventario (excepto baja)

  return (
    <Form onFinish={handleFinish} form={form} layout="vertical" initialValues={{ bodegas: [1] }}>
      <Row gutter={6}>
        <Col {...colLayoutA}>
          <Form.Item label="Búsqueda" name="textoBusqueda">
            <Input placeholder="Texto de búsqueda " disabled={!habilitadoInterno || cargando} />
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
        <Form.Item label="Almacenes" name="bodegas" hidden>
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
        <Col {...colLayoutA}>
          <Form.Item
            label="Operacion"
            name="tipoMovimiento"
            rules={[
              {
                required: true,
                message: 'Selecciona al menos un tipo de operacion',
              },
            ]}
          >
            <Select
              style={{ width: '100%' }}
              showSearch={{ filterOption: filtrarOpcion }}
              placeholder="Selecciona la operacion"
              allowClear
              disabled={!habilitadoInterno || cargando}
            >
              {mapeoOpciones(listadoTipoMovimientos)}
            </Select>
          </Form.Item>
        </Col>
        <Col {...colLayoutA}>
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

export default FormaBusquedaProyecto
