import React, { useEffect, useState } from 'react'
import { Button, Form, Select, Row, Col } from 'antd'
import { mapeoOpciones } from 'helpers/funcionesExtras'
import UsuarioPeticiones from 'services/axios/usuarios'

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

const FormaInventario = ({
  handleFinish,
  cargando,
  //  user: { id:userId }
}) => {
  const [listadoBodegas, setListadoBodegas] = useState([])
  const [listadoAreas, setListadoAreas] = useState([])
  const [habilitadoInterno, setHabilitadoInterno] = useState(false)

  const [form] = Form.useForm()

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
        const tempBusqueda = JSON.parse(localStorage.getItem('catalogoValidaciones.busqueda'))
        if (tempBusqueda !== undefined && tempBusqueda !== null) {
          form.setFieldsValue(tempBusqueda)
        }
        // JSON.parse( localStorage.getItem('catalogoGeneral.busqueda') );
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  
  useEffect(()=>{
    const areas = listadoAreas.map(area=>area.id);
    console.log({ 
      uef: listadoAreas,
      areas })
    form.setFieldsValue({areas});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listadoAreas])

  // busqueda generica, por area, almacen o estado de inventario (excepto baja)

  // INVENTARIADOS
  // NO INVENTARIADOS
  // AREA Y ALMACEN

  // +12m sin movimiento

  
  return (
    <Form 
      onFinish={handleFinish} 
      form={form} 
      layout="vertical"
    //   initialValues={{ estado: ["disponible", "no-disponible","cuarentena"]}}
    >
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
              filterOption={(input, option) =>
                option.props.children[0].toLowerCase().indexOf(input.toLowerCase()) >= 0
              }
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
              filterOption={(input, option) =>
                option.props.children[0].toLowerCase().indexOf(input.toLowerCase()) >= 0
              }
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
            <Button
              type="primary"
              htmlType="submit"
              // className="mr-4"
              disabled={cargando}
              loading={cargando}
            >
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
