import React, { useEffect, useState } from 'react'

import {
  Button,
  Checkbox,
  Col,
  Form,
  notification,
  Row,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
} from 'antd'
import { Helmet } from 'react-helmet'
import 'moment/locale/es'
import ACL from 'components/cleanui/system/ACL'
import ReportePeticiones from 'services/axios/reportes'
import UsuarioPeticiones from 'services/axios/usuarios'

// import AccionesTablasGrupos from 'pages/operaciones/componentes/accionesTablasGrupos'

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

const ReporteDeCierre = () => {
  //   const [proyectoId, setProyectoId] = useState(0)
  const [habilitadoInterno, setHabilitadoInterno] = useState(false)
  const [listadoProyectos, setListadoProyectos] = useState([])
  // const [listaUsuarios, setListaUsuarios] = useState([])
  const [listadoAreas, setListadoAreas] = useState([])

  const [value, setValue] = useState('')
  const [fetching, setFetching] = useState(false)
  const [data, setData] = useState([])

  const [form] = Form.useForm()

  //   return projects?.map(project => ({ label: project.name ?? '', value: project.id, project_type: project.project_type })) || [];

  const handleFinish = valores => {
    console.log(valores)
    const { proyectoId, conFoto, usuariosIds, areasId } = valores

    // reporte
    ReportePeticiones.deCierre({ 
      proyectoId, 
      conFoto: conFoto ?? false,
      areasId,
      usuariosIds: usuariosIds?.map(usr => usr.value) }).then(resp => {
      if (resp !== undefined) {
        notification.success({ message: resp.message })
      }
    })
    // setProyectoId(proyectoId)
  }

  useEffect(() => {
    setHabilitadoInterno(false)
    Promise.all([
      UsuarioPeticiones.obtenerProyectos(),
      UsuarioPeticiones.obtenerAreas(),
    ])
      .then(resp => {
        if (resp !== undefined) {
          const [proyectos,areas] = resp
          setListadoProyectos(
            proyectos,
            // proyectos?.map(project => ({
            //   label: project.nombre ?? '',
            //   value: project.id,
            //   //   isExternal: project.esExterno,
            // })) || [],
          )
          setListadoAreas( areas?.map(area => ({ label: area.nombre ?? '', value: area.id })) || [])
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

  const mapeoOpciones = listado => {
    console.log('listado', listado)
    return listado.map(option => (
      <Select.Option key={`${option.name}${option.id}`} value={option.id}>
        <Space>
          <Typography.Text>{option.nombre}</Typography.Text>
          {/* {option.name} */}
          <Tag color={option.esExterno ? 'cyan' : 'lime'}>
            {option.esExterno ? 'Externo' : 'Interno'}
          </Tag>

          <span style={{ float: 'right' }} />
        </Space>
      </Select.Option>
    ))
  }

  return (
    <ACL roles={['ADMINISTRADOR']} redirect>
      <Helmet title="Reporte de Cierre" />
      <div className="kit__utils__heading">
        <h5>
          <span className="mr-3">Reporte de Cierre</span>
        </h5>
      </div>
      <div className="card">
        <div className="card-body">
          <Form
            onFinish={handleFinish}
            form={form}
            layout="horizontal"
            // initialValues={{ bodegas: [1] }}
          >
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
                    // mode="multiple"
                    disabled={!habilitadoInterno}
                    filterOption={(input, option) =>
                      option.props.children[0].toLowerCase().indexOf(input.toLowerCase()) >= 0
                    }
                    // options={listadoProyectos}
                    // optionRender={option => {
                    //   const projectType = listadoProyectos.find(proj => proj.id === option.value)
                    //     ?.esExterno
                    //   return (
                    //     <Space>
                    //       {option.label}
                    //       <Tag color={projectType ? 'cyan' : 'lime'}>
                    //         {projectType ? 'Interno' : 'Externo'}
                    //       </Tag>

                    //       <span style={{ float: 'right' }} />
                    //     </Space>
                    //   )
                    // }}
                    tagRender={({ label, value: val }) => (
                      <Tag
                        color={
                          listadoProyectos.find(proj => proj.id === val)?.esExterno
                            ? 'cyan'
                            : 'lime'
                        }
                        // closable={closable}
                        // onClose={onClose}
                      >
                        {label}
                      </Tag>
                    )}
                  >
                    {mapeoOpciones(listadoProyectos)}
                    {}
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
                <Form.Item
                  label="Areas"
                  name="areasId"
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
                    options={listadoAreas}
                    disabled={!habilitadoInterno}
                    filterOption={(input, option) =>
                      option.props.children[0].toLowerCase().indexOf(input.toLowerCase()) >= 0
                    }
                  >
                    {/* {mapeoOpciones(listadoAreas)} */}
                  </Select>
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
                    // className="mr-4"
                    disabled={!habilitadoInterno}
                    loading={!habilitadoInterno}
                  >
                    Buscar
                  </Button>
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </div>
      </div>
    </ACL>
  )
}

export default ReporteDeCierre
