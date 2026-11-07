// forma para prestamo devolucion baja y previo...
// que es básicamente un campo de texto
import React, { useState, useEffect } from 'react'
import { Button, Form, Select, Row, Col, Spin } from 'antd'

import { mapeoOpciones } from 'helpers/funcionesExtras'
import UsuarioPeticiones from 'services/axios/usuarios'

// const colLayoutA = {
//   xs: 24,
//   sm: 12,
//   md: 12,
//   lg: 8,
//   xl: 6,
//   xxl: 6,
// }
const colLayoutB = {
  xs: 24,
  sm: 12,
  md: 7,
  lg: 7,
  xl: 7,
  xxl: 5,
}

const FormaBusquedaPorProyecto = ({
  handleFinish,
  cargando,
  habilitado,
  mostrarProyectosInternos,
  mostrarProyectosExternos,
  mostrarUsuarios,
  mostrarAreas,
  mostrarBodegas,
  proyectoObligatorio = true,
  usuariosObligatorio = false,
}) => {
  const [habilitadoInterno, setHabilitadoInterno] = useState(false)
  const [listadoProyectos, setListadoProyectos] = useState([])
  // const [listadoBodegas, setListadoBodegas] = useState([])
  const [listadoAreas, setListadoAreas] = useState([])

  const [value, setValue] = useState('')
  const [fetching, setFetching] = useState(false)
  const [data, setData] = useState([])

  const [form] = Form.useForm()
  console.log('mostrarBodegas', mostrarBodegas)

  useEffect(() => {
    setHabilitadoInterno(false)
    Promise.all([
      // UsuarioPeticiones.obtenerBodegas(),
      UsuarioPeticiones.obtenerProyectos(),
      UsuarioPeticiones.obtenerAreas(),
    ])
      .then(resp => {
        if (resp !== undefined) {
          const [/* bodegas, */ proyectos, areas] = resp
          setListadoProyectos(proyectos)
          setListadoAreas(areas)
          // setListadoBodegas(bodegas)
        }
      })
      .finally(() => {
        setHabilitadoInterno(true)
      })
  }, [])

  let lastFetchId = 0
  const fetchUser = busqueda => {
    if (busqueda.length < 3) {
      return
    }
    lastFetchId += 1
    const fetchId = lastFetchId
    setData([])
    setFetching(true)
    // this.setState({ data: [], fetching: true });
    UsuarioPeticiones.listadoSimpleDinamico({
      busqueda,
    })
      .then(resp => {
        if (fetchId === lastFetchId) {
          setData(resp)
        }
      })
      .finally(() => {
        setFetching(false)
      })
  }

  const handleChange = valor => {
    setValue(valor)
    setData([])
    setFetching(false)
  }

  const disable = !habilitado || cargando || !habilitadoInterno

  // console.log("*******disable",{habilitado,cargando,habilitadoInterno})

  const listadoProyectosInternos = listadoProyectos.filter(it => !it.esExterno)
  const listadoProyectosExternos = listadoProyectos.filter(it => it.esExterno)

  // proyectoInterno, proyectoExterno, areas, bodegas,usuarios
  return (
    <Form onFinish={handleFinish} form={form} layout="horizontal" initialValues={{ bodegas: [1] }}>
      <Row gutter={6}>
        {mostrarProyectosInternos ? (
          <Col {...colLayoutB}>
            <Form.Item
              label="Proyecto"
              name="proyectoInterno"
              rules={[
                {
                  required: proyectoObligatorio,
                },
              ]}
            >
              <Select
                showSearch
                placeholder="Selecciona el proyecto asociado"
                allowClear
                // mode="multiple"
                disabled={disable}
                filterOption={(input, option) =>
                  option.props.children[0].toLowerCase().indexOf(input.toLowerCase()) >= 0
                }
              >
                {mapeoOpciones(listadoProyectosInternos)}
              </Select>
            </Form.Item>
          </Col>
        ) : null}

        {mostrarProyectosExternos ? (
          <Col {...colLayoutB}>
            <Form.Item
              label="Proyecto Externo"
              name="proyectoInterno"
              rules={[
                {
                  required: proyectoObligatorio,
                },
              ]}
            >
              <Select
                showSearch
                placeholder="Selecciona el proyecto asociado"
                allowClear
                // mode="multiple"
                disabled={disable}
                filterOption={(input, option) =>
                  option.props.children[0].toLowerCase().indexOf(input.toLowerCase()) >= 0
                }
              >
                {mapeoOpciones(listadoProyectosExternos)}
              </Select>
            </Form.Item>
          </Col>
        ) : null}

        {mostrarAreas ? (
          <Col {...colLayoutB}>
            <Form.Item
              label="Areas"
              name="areas"
              // rules={[
              //   {
              //     required: true,
              //   },
              // ]}
            >
              <Select
                showSearch
                placeholder="Selecciona las areas asociadas"
                allowClear
                mode="multiple"
                disabled={disable}
                filterOption={(input, option) =>
                  option.props.children[0].toLowerCase().indexOf(input.toLowerCase()) >= 0
                }
              >
                {mapeoOpciones(listadoAreas)}
              </Select>
            </Form.Item>
          </Col>
        ) : null}

        {/* {mostrarBodegas ? (
          <Col {...colLayoutB}>
            <Form.Item
              label="Almacenes"
              name="bodegas"
              // rules={[
              //   {
              //     required: true,
              //   },
              // ]}
            >
              <Select
                showSearch
                placeholder="Selecciona los almacenes asociados"
                allowClear
                mode="multiple"
                disabled
                filterOption={(input, option) =>
                  option.props.children[0].toLowerCase().indexOf(input.toLowerCase()) >= 0
                }
              >
                {mapeoOpciones(listadoBodegas)}
              </Select>
            </Form.Item>
          </Col>
        ) : null} */}

        {mostrarUsuarios ? (
          <Col {...colLayoutB}>
            <Form.Item
              label="Usuarios"
              name="usuarios"
              rules={[
                {
                  required: usuariosObligatorio,
                },
              ]}
            >
              <Select
                mode="multiple"
                labelInValue
                value={value}
                placeholder="Selecciona usuarios"
                notFoundContent={fetching ? <Spin size="small" /> : null}
                filterOption={false}
                disabled={disable}
                onSearch={fetchUser}
                onChange={handleChange}
                style={{ width: '100%' }}
              >
                {mapeoOpciones(data)}
              </Select>
            </Form.Item>
          </Col>
        ) : null}

        <Col>
          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              // className="mr-4"
              disabled={disable}
              loading={cargando}
            >
              Buscar
            </Button>
          </Form.Item>
        </Col>
      </Row>
    </Form>
  )
}

export default FormaBusquedaPorProyecto
