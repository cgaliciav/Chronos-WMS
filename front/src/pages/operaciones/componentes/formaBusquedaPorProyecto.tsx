// Búsqueda de movimientos por proyecto, áreas y usuarios (listados por proyecto, activos y reporte por usuario).
import { useState, useEffect } from 'react'
import { Button, Form, Select, Row, Col, Spin } from 'antd'
import { mapeoOpciones } from 'helpers/funcionesExtras'
import type { ElementoListado } from 'services/axios'
import UsuarioPeticiones from 'services/axios/usuarios'
import { filtrarOpcion } from 'helpers/funcionesExtras'
import type {
  FormaBusquedaPorProyectoProps,
  ValorEtiquetado,
  ValoresBusquedaPorProyecto,
} from '../tipos'

export type { FormaBusquedaPorProyectoProps, ValoresBusquedaPorProyecto } from '../tipos'

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
  proyectoObligatorio = true,
  usuariosObligatorio = false,
}: FormaBusquedaPorProyectoProps) => {
  const [habilitadoInterno, setHabilitadoInterno] = useState(false)
  const [listadoProyectos, setListadoProyectos] = useState<ElementoListado[]>([])
  const [listadoAreas, setListadoAreas] = useState<ElementoListado[]>([])

  const [value, setValue] = useState<ValorEtiquetado[]>()
  const [fetching, setFetching] = useState(false)
  const [data, setData] = useState<ElementoListado[]>([])

  const [form] = Form.useForm<ValoresBusquedaPorProyecto>()

  useEffect(() => {
    setHabilitadoInterno(false)
    Promise.all([UsuarioPeticiones.obtenerProyectos(), UsuarioPeticiones.obtenerAreas()])
      .then(resp => {
        const [proyectos, areas] = resp
        setListadoProyectos(proyectos)
        setListadoAreas(areas)
      })
      .catch(() => {}) // El interceptor de axios ya mostró el error.
      .finally(() => {
        setHabilitadoInterno(true)
      })
  }, [])

  let lastFetchId = 0
  const fetchUser = (busqueda: string) => {
    if (busqueda.length < 3) {
      return
    }
    lastFetchId += 1
    const fetchId = lastFetchId
    setData([])
    setFetching(true)
    UsuarioPeticiones.listadoSimpleDinamico({
      busqueda,
    })
      .then(resp => {
        if (fetchId === lastFetchId) {
          setData(resp)
        }
      })
      .catch(() => {})
      .finally(() => {
        setFetching(false)
      })
  }

  const handleChange = (valor: ValorEtiquetado[]) => {
    setValue(valor)
    setData([])
    setFetching(false)
  }

  const disable = !habilitado || cargando || !habilitadoInterno

  const listadoProyectosInternos = listadoProyectos.filter(it => !it.esExterno)
  const listadoProyectosExternos = listadoProyectos.filter(it => it.esExterno)

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
                disabled={disable}
                filterOption={filtrarOpcion}
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
                disabled={disable}
                filterOption={filtrarOpcion}
              >
                {mapeoOpciones(listadoProyectosExternos)}
              </Select>
            </Form.Item>
          </Col>
        ) : null}

        {mostrarAreas ? (
          <Col {...colLayoutB}>
            <Form.Item label="Areas" name="areas">
              <Select
                showSearch
                placeholder="Selecciona las areas asociadas"
                allowClear
                mode="multiple"
                disabled={disable}
                filterOption={filtrarOpcion}
              >
                {mapeoOpciones(listadoAreas)}
              </Select>
            </Form.Item>
          </Col>
        ) : null}

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
            <Button type="primary" htmlType="submit" disabled={disable} loading={cargando}>
              Buscar
            </Button>
          </Form.Item>
        </Col>
      </Row>
    </Form>
  )
}

export default FormaBusquedaPorProyecto
