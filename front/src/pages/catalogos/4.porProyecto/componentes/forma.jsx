import React, { useEffect, useState } from 'react'
import { Button, Form, Input, Select, Row, Col } from 'antd'
import { mapeoOpciones } from 'helpers/funcionesExtras'
import UsuarioPeticiones from 'services/axios/usuarios'

// const { Option } = Select

const colLayoutA = {
  xs: 24,
  sm: 12,
  md: 12,
  lg: 5,
  xl: 5,
  xxl: 5,
}
// const colLayoutB = {
//   xs: 24,
//   sm: 8,
//   md: 8,
//   lg: 5,
//   xl: 5,
//   xxl: 5,
// }

const FormaBusquedaProyecto = ({
  handleFinish,
  cargando,
  //  user: { id:userId }
}) => {
  const [listadoBodegas, setListadoBodegas] = useState([])
  const [listadoAreas, setListadoAreas] = useState([])
  const [listadoProyectos, setListadoProyectos] = useState([])
  const [habilitadoInterno, setHabilitadoInterno] = useState(false)

  const [form] = Form.useForm()

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
        const tempBusqueda = JSON.parse(localStorage.getItem('catalogoProyecto.busqueda'))
        if (tempBusqueda !== undefined && tempBusqueda !== null) {
          form.setFieldsValue({ ...tempBusqueda, bodegas: [1] })
        }
        // JSON.parse( localStorage.getItem('catalogoProyecto.busqueda') );
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // busqueda generica, por area, almacen o estado de inventario (excepto baja)

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
        {/* <Col {...colLayoutA}> */}
        <Form.Item
          label="Almacenes"
          name="bodegas"
          hidden
          // rules={[
          //   {
          //     required: true,
          //     message: 'Selecciona al menos un almacén',
          //   },
          // ]}
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
        {/* </Col> */}
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
              showSearch
              placeholder="Selecciona la operacion"
              allowClear
              // mode="multiple"
              disabled={!habilitadoInterno || cargando}
              filterOption={(input, option) =>
                option.props.children[0].toLowerCase().indexOf(input.toLowerCase()) >= 0
              }
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
              showSearch
              placeholder="Selecciona el proyecto"
              allowClear
              // mode="multiple"
              disabled={!habilitadoInterno || cargando}
              filterOption={(input, option) =>
                option.props.children[0].toLowerCase().indexOf(input.toLowerCase()) >= 0
              }
            >
              {mapeoOpciones(listadoProyectos)}
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

export default FormaBusquedaProyecto
