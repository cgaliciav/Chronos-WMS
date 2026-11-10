import { useEffect, useState } from 'react'
import { Button, Form, Input, Select, Row, Col } from 'antd'
import { mapeoOpciones } from 'helpers/funcionesExtras'
import { leerJSON } from 'helpers/storage'
import UsuarioPeticiones from 'services/axios/usuarios'
import type { ElementoListado } from 'services/axios'
import { filtrarOpcion } from 'helpers/funcionesExtras'
import type { BusquedaGeneral, FormaBusquedaProps } from '../../tipos'

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

const FormaBusquedaGeneral = ({ handleFinish, cargando }: FormaBusquedaProps<BusquedaGeneral>) => {
  const [listadoBodegas, setListadoBodegas] = useState<ElementoListado[]>([])
  const [listadoAreas, setListadoAreas] = useState<ElementoListado[]>([])
  const [habilitadoInterno, setHabilitadoInterno] = useState(false)

  const [form] = Form.useForm<BusquedaGeneral>()

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
        const tempBusqueda = leerJSON<BusquedaGeneral | null>('catalogoValidaciones.busqueda', null)
        if (tempBusqueda !== undefined && tempBusqueda !== null) {
          form.setFieldsValue({ ...tempBusqueda, bodegas: [1] })
        }
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const areas = listadoAreas.map(area => area.id)
    form.setFieldsValue({ areas })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listadoAreas])

  // busqueda generica, por area, almacen o estado de inventario (excepto baja)

  return (
    <Form
      onFinish={handleFinish}
      form={form}
      layout="vertical"
      initialValues={{ estado: ['disponible', 'no-disponible', 'cuarentena'], bodegas: [1] }}
    >
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
              disabled
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
        <Col {...colLayoutB}>
          <Form.Item
            label="Estado"
            name="estado"
            rules={[
              {
                required: true,
                message: 'selecciona al menos un estado',
              },
            ]}
          >
            <Select
              style={{ width: '100%' }}
              showSearch={{ filterOption: filtrarOpcion }}
              placeholder="Selecciona los estados"
              allowClear
              mode="multiple"
              disabled
            >
              <Option value="disponible">Disponible</Option>
              <Option value="no-disponible">No disponible</Option>
              <Option value="cuarentena">Cuarentena</Option>
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

export default FormaBusquedaGeneral
