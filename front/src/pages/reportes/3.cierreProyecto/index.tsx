import { useEffect, useState } from 'react'
import { Button, Checkbox, Col, Form, Row, Select, Space, Spin, Tag, Typography } from 'antd'
import { notification } from 'helpers/feedback'
import Titulo from 'components/Titulo'
import Encabezado from 'components/ui/Encabezado'
import Tarjeta from 'components/ui/Tarjeta'
import ACL from 'app/auth/ACL'
import ReportePeticiones from 'services/axios/reportes'
import UsuarioPeticiones from 'services/axios/usuarios'
import type { ElementoListado } from 'services/axios'
import type { OpcionEtiquetada } from 'pages/componentes/tipos'

const colLayoutB = {
  xs: 24,
  sm: 24,
  md: 24,
  lg: 16,
  xl: 16,
  xxl: 14,
}

const colLayoutA = {
  xs: 24,
  sm: 24,
  md: 24,
  lg: 10,
  xl: 10,
  xxl: 10,
}

/** Valores del formulario del reporte de cierre. */
interface ValoresReporteCierre {
  proyectoId: number
  conFoto?: boolean
  areasId?: number[]
  usuariosIds?: OpcionEtiquetada[]
}

interface OpcionArea {
  label: string
  value: number
}

const ReporteDeCierre = () => {
  const [habilitadoInterno, setHabilitadoInterno] = useState(false)
  const [listadoProyectos, setListadoProyectos] = useState<ElementoListado[]>([])
  const [listadoAreas, setListadoAreas] = useState<OpcionArea[]>([])

  const [value, setValue] = useState<OpcionEtiquetada[]>([])
  const [fetching, setFetching] = useState(false)
  const [data, setData] = useState<ElementoListado[]>([])

  const [form] = Form.useForm<ValoresReporteCierre>()

  const handleFinish = (valores: ValoresReporteCierre) => {
    const { proyectoId, conFoto, usuariosIds, areasId } = valores

    ReportePeticiones.deCierre({
      proyectoId,
      conFoto: conFoto ?? false,
      areasId,
      usuariosIds: usuariosIds?.map(usr => usr.value),
    })
      .then(resp => {
        if (resp !== undefined) {
          notification.success({ title: resp.message })
        }
      })
      // El interceptor de axios ya mostró el error.
      .catch(() => {})
  }

  useEffect(() => {
    setHabilitadoInterno(false)
    Promise.all([UsuarioPeticiones.obtenerProyectos(), UsuarioPeticiones.obtenerAreas()])
      .then(resp => {
        if (resp !== undefined) {
          const [proyectos, areas] = resp
          setListadoProyectos(proyectos)
          setListadoAreas(areas?.map(area => ({ label: area.nombre ?? '', value: area.id })) || [])
        }
      })
      .catch(() => {})
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

  const handleChange = (valor: OpcionEtiquetada[]) => {
    setValue(valor)
    setData([])
    setFetching(false)
  }

  const mapeoOpciones = (listado: ElementoListado[]) =>
    listado.map(option => (
      <Select.Option key={option.id} value={option.id}>
        <Space>
          <Typography.Text>{option.nombre}</Typography.Text>
          <Tag color={option.esExterno ? 'cyan' : 'lime'}>
            {option.esExterno ? 'Externo' : 'Interno'}
          </Tag>

          <span style={{ float: 'right' }} />
        </Space>
      </Select.Option>
    ))

  return (
    <ACL roles={['ADMINISTRADOR']} redirect>
      <Titulo texto="Reporte de Cierre" />
      <Encabezado>Reporte de Cierre</Encabezado>
      <Tarjeta>
        <Form onFinish={handleFinish} form={form} layout="horizontal">
          <Row gutter={6}>
            <Col {...colLayoutB}>
              <Form.Item
                label="Proyecto"
                name="proyectoId"
                rules={[
                  {
                    required: true,
                  },
                ]}
              >
                <Select
                  showSearch
                  placeholder="Selecciona el proyecto"
                  allowClear
                  disabled={!habilitadoInterno}
                  filterOption={(input, option) =>
                    (listadoProyectos.find(proyecto => proyecto.id === option?.value)?.nombre ?? '')
                      .toLowerCase()
                      .indexOf(input.toLowerCase()) >= 0
                  }
                  tagRender={({ label, value: val }) => (
                    <Tag
                      color={
                        listadoProyectos.find(proj => proj.id === val)?.esExterno ? 'cyan' : 'lime'
                      }
                    >
                      {label}
                    </Tag>
                  )}
                >
                  {mapeoOpciones(listadoProyectos)}
                </Select>
              </Form.Item>
            </Col>

            {/* Columna con el Checkbox */}
            <Col>
              <Form.Item name="conFoto" valuePropName="checked">
                <Checkbox disabled={!habilitadoInterno}>¿Incluir foto?</Checkbox>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={6}>
            <Col {...colLayoutA}>
              <Form.Item label="Areas" name="areasId">
                <Select
                  showSearch
                  placeholder="Selecciona las areas asociadas"
                  allowClear
                  mode="multiple"
                  options={listadoAreas}
                  disabled={!habilitadoInterno}
                  filterOption={(input, option) =>
                    String(option?.label ?? '')
                      .toLowerCase()
                      .indexOf(input.toLowerCase()) >= 0
                  }
                />
              </Form.Item>
            </Col>
            <Col {...colLayoutA}>
              <Form.Item
                label="Usuarios"
                name="usuariosIds"
                rules={[
                  {
                    required: false,
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
                  disabled={!habilitadoInterno}
                  onSearch={fetchUser}
                  onChange={handleChange}
                  style={{ width: '100%' }}
                >
                  {mapeoOpciones(data)}
                </Select>
              </Form.Item>
            </Col>
            <Col>
              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  disabled={!habilitadoInterno}
                  loading={!habilitadoInterno}
                >
                  Buscar
                </Button>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Tarjeta>
    </ACL>
  )
}

export default ReporteDeCierre
