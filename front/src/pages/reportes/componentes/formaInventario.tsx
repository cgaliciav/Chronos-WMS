import { useEffect, useState } from 'react'
import { Button, Form, Select, Row, Col } from 'antd'
import { mapeoOpciones } from 'helpers/funcionesExtras'
import { leerJSON } from 'helpers/storage'
import UsuarioPeticiones from 'services/axios/usuarios'
import type { ElementoListado } from 'services/axios'
import { filtrarOpcion } from 'helpers/funcionesExtras'

const { Option } = Select

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

export type ModoInventario = 'inventariado' | 'no-inventariado' | 'inventario-viejo'

/** Valores de la búsqueda por inventario. */
export interface ValoresFormaInventario {
  areas: number[]
  bodegas: number[]
  modoInventario: ModoInventario[]
}

export interface FormaInventarioProps {
  handleFinish: (valores: ValoresFormaInventario) => void
  cargando?: boolean
}

const FormaInventario = ({ handleFinish, cargando = false }: FormaInventarioProps) => {
  const [listadoBodegas, setListadoBodegas] = useState<ElementoListado[]>([])
  const [listadoAreas, setListadoAreas] = useState<ElementoListado[]>([])
  const [habilitadoInterno, setHabilitadoInterno] = useState(false)

  const [form] = Form.useForm<ValoresFormaInventario>()

  useEffect(() => {
    setHabilitadoInterno(false)
    Promise.all([UsuarioPeticiones.obtenerAreas(), UsuarioPeticiones.obtenerBodegas()])
      .then(resp => {
        if (resp !== undefined) {
          const [areas, bodegas] = resp
          setListadoAreas(areas)
          setListadoBodegas(bodegas)
        }
      })
      // El interceptor de axios ya mostró el error.
      .catch(() => {})
      .finally(() => {
        setHabilitadoInterno(true)
        const tempBusqueda = leerJSON<Partial<ValoresFormaInventario> | null>(
          'catalogoValidaciones.busqueda',
          null,
        )
        if (tempBusqueda !== undefined && tempBusqueda !== null) {
          form.setFieldsValue(tempBusqueda)
        }
      })
  }, [form])

  useEffect(() => {
    const areas = listadoAreas.map(area => area.id)
    form.setFieldsValue({ areas })
  }, [form, listadoAreas])

  // Búsqueda genérica por área, almacén o estado de inventario (excepto baja): inventariados, no inventariados
  // y +12 meses sin movimiento.

  return (
    <Form onFinish={handleFinish} form={form} layout="vertical">
      <Row gutter={6}>
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
              showSearch
              placeholder="Selecciona las áreas asociadas"
              allowClear
              mode="multiple"
              disabled={!habilitadoInterno || cargando}
              filterOption={filtrarOpcion}
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
              showSearch
              placeholder="Selecciona los almacenes asociadas"
              allowClear
              mode="multiple"
              disabled={!habilitadoInterno || cargando}
              filterOption={filtrarOpcion}
            >
              {mapeoOpciones(listadoBodegas)}
            </Select>
          </Form.Item>
        </Col>
        <Col {...colLayoutB}>
          <Form.Item
            label="Modo Inventario"
            name="modoInventario"
            rules={[
              {
                required: true,
                message: 'selecciona al menos un modo',
              },
            ]}
          >
            <Select
              style={{ width: '100%' }}
              placeholder="Selecciona Tipo Inventario"
              mode="multiple"
              disabled={!habilitadoInterno || cargando}
            >
              <Option value="inventariado">Inventariado</Option>
              <Option value="no-inventariado">No Inventariado</Option>
              <Option value="inventario-viejo">Inventario Viejo</Option>
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

export default FormaInventario
