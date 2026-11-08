import React, { useEffect, useState } from 'react'

import dayjs from 'dayjs'
import { Form, Button, Select, Input, Spin, Row, Col, DatePicker, Typography } from 'antd'
import { mapeoOpciones, normalizeAndFilterOptions } from 'helpers/funcionesExtras'
// import ProyectoPeticiones from 'services/axios/proyectos'
import UsuarioPeticiones from 'services/axios/usuarios'
import ProveedorPeticiones from 'services/axios/proveedores'
import FacturaTipoPeticiones from 'services/axios/facturaTipos'
import GrupoPeticiones from 'services/axios/grupos'

const formItemLayout = {
  labelCol: {
    xs: { span: 24 },
    sm: { span: 8 },
    md: { span: 6 },
    lg: { span: 6 },
    xl: { span: 4 },
  },
  wrapperCol: {
    xs: { span: 24 },
    sm: { span: 16 },
    md: { span: 18 },
    lg: { span: 18 },
    xl: { span: 20 },
  },
}

// sfc
const FormaConfiguracionGrupo = ({
  handleFinish,
  guardando,
  valoresIniciales,
  mostrarProyectosInternos,
  mostrarProyectosExternos,
  mostrarUsuarios,
  mostrarProveedores,
  mostrarTipoFactura,
  mostrarFechaInicial,
  mostrarFechaFinal,
  mostrarBodega,
  botonTexto,
  fechaInicialTexto,
  textoNombre,
  prefijoMovimiento = '',
}) => {
  const [habilitadoInterno, setHabilitadoInterno] = useState(false)
  const [listadoProyectos, setListadoProyectos] = useState([])
  const [listadoBodegas, setListadoBodegas] = useState([])
  const [listadoTipoFactura, setListadoTipoFactura] = useState([])
  const [listadoAreas, setListadoAreas] = useState([])
  const [selectedValue, setSelectedValue] = useState('')

  const [value, setValue] = useState('')
  const [fetching, setFetching] = useState(false)
  const [data, setData] = useState([])

  const [valueProveedor, setValueProveedor] = useState('')
  const [fetchingProveedor, setFetchingProveedor] = useState(false)
  const [dataProveedor, setDataProveedor] = useState([])
  // usf

  // uef
  useEffect(() => {
    setHabilitadoInterno(false)
    Promise.all([
      UsuarioPeticiones.obtenerBodegas(),
      UsuarioPeticiones.obtenerProyectos(),
      UsuarioPeticiones.obtenerAreas(),
      FacturaTipoPeticiones.listadoSimple(),
    ])
      .then(resp => {
        if (resp !== undefined) {
          // console.log(".....................",resp)
          const [bodegas, proyectos, areas, tiposFactura] = resp
          setListadoBodegas(bodegas)
          setListadoProyectos(proyectos)
          setListadoTipoFactura(tiposFactura)
          setListadoAreas(areas.map(area => ({ label: area.nombre ?? '', value: area.id })))
        }
      })
      .catch(() => {})
      .finally(() => {
        setHabilitadoInterno(true)
      })
    // ProyectoPeticiones.listadoSimple()
    //   .then(resp => {
    //     if (resp !== undefined) {
    //       setListadoProyectos(resp)
    //     }
    //   })
  }, [])

  // Antes del return temprano: los hooks deben llamarse en el mismo orden en cada render.
  const [form] = Form.useForm()

  if (valoresIniciales.nombre === undefined) {
    return (
      <Row>
        <Col span={24}>
          <Spin spinning />
        </Col>
      </Row>
    )
  }

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
      .catch(() => {})
      .finally(() => {
        setFetching(false)
      })
  }

  const handleChange = valor => {
    setValue(valor)
    setData([])
    setFetching(false)
  }

  // let lastFetchId = 0
  const fetchSupplier = busqueda => {
    if (busqueda.length < 3) {
      return
    }
    lastFetchId += 1
    const fetchId = lastFetchId
    setDataProveedor([])
    setFetchingProveedor(true)

    ProveedorPeticiones.listadoSimpleDinamico({
      busqueda,
    })
      .then(resp => {
        if (fetchId === lastFetchId) {
          setDataProveedor(resp)
        }
      })
      .catch(() => {})
      .finally(() => {
        setFetchingProveedor(false)
      })
  }

  const handleChangeSupplier = valor => {
    setValueProveedor(valor)
    setDataProveedor([])
    setFetchingProveedor(false)
  }


  const listadoProyectosInternos = listadoProyectos
    .filter(it => !it.esExterno)
    .map(it => ({ label: it.nombre, value: it.id }))
  const listadoProyectosExternos = listadoProyectos
    .filter(it => it.esExterno)
    .map(it => ({ label: it.nombre, value: it.id }))

  const habilitado = habilitadoInterno && !guardando
  // nombre,proyectoInterno,proyectoExterno,bodega,proveedor,tipoFactura,fechaInicio,fechaFin,usuariosResponsables

  return (
    <Spin spinning={!habilitado}>
      <Form
        form={form}
        onFinish={handleFinish}
        {...formItemLayout}
        initialValues={{ ...valoresIniciales, bodega: 1 }}
      >
        {prefijoMovimiento !== 'C' && (
          <Row>
            <Col {...formItemLayout.labelCol}>
              <Row justify="end">
                <Typography.Text style={{ marginRight: '0.5rem' }}>Area :</Typography.Text>
              </Row>
            </Col>
            <Col {...formItemLayout.wrapperCol}>
              <Select
                showSearch
                placeholder="Selecciona un área"
                allowClear
                options={listadoAreas}
                disabled={!habilitadoInterno}
                loading={!habilitadoInterno}
                filterOption={normalizeAndFilterOptions}
                value={selectedValue}
                onChange={valueChage => {
                  setSelectedValue(valueChage)
                }}
                style={{
                  width: '100%',
                  marginBottom: '2rem',
                }}
              />
            </Col>
          </Row>
        )}

        {mostrarProyectosInternos ? (
          <Form.Item
            label="Proyecto Interno"
            name="proyectoInterno"
            rules={[
              {
                required: true,
              },
            ]}
          >
            <Select
              showSearch
              placeholder="Selecciona el proyecto asociado"
              allowClear
              options={listadoProyectosInternos}
              // mode="multiple"
              disabled={!habilitado}
              filterOption={(input, option) =>
                option.props.children[0].toLowerCase().indexOf(input.toLowerCase()) >= 0
              }
            >
              {/* {mapeoOpciones(listadoProyectosInternos)} */}
            </Select>
          </Form.Item>
        ) : null}

        {mostrarProyectosExternos ? (
          <Form.Item
            label="Proyecto Externo"
            name="proyectoExterno"
            rules={[
              {
                required: true,
              },
            ]}
          >
            <Select
              showSearch
              placeholder="Selecciona el proyecto asociado"
              allowClear
              // mode="multiple"
              options={listadoProyectosExternos}
              disabled={!habilitado}
              filterOption={(input, option) =>
                option.props.children[0].toLowerCase().indexOf(input.toLowerCase()) >= 0
              }
            >
              {/* {mapeoOpciones(listadoProyectosExternos)} */}
            </Select>
          </Form.Item>
        ) : null}

        {mostrarBodega ? (
          <Form.Item
            label="Almacén"
            name="bodega"
            rules={[
              {
                required: true,
              },
            ]}
          >
            <Select
              showSearch
              placeholder="Selecciona el almacén asociado"
              allowClear
              // mode="multiple"
              disabled
              filterOption={(input, option) =>
                option.props.children[0].toLowerCase().indexOf(input.toLowerCase()) >= 0
              }
            >
              {mapeoOpciones(listadoBodegas)}
            </Select>
          </Form.Item>
        ) : null}

        {mostrarProveedores ? (
          <Form.Item
            label="Proveedor"
            name="proveedor"
            rules={[
              {
                required: true,
                message: 'Debe existir un proveedor asociado',
              },
            ]}
          >
            <Select
              // mode="multiple"
              labelInValue
              showSearch
              value={valueProveedor}
              placeholder="Selecciona el proveedor"
              notFoundContent={fetchingProveedor ? <Spin size="small" /> : null}
              filterOption={false}
              disabled={!habilitado}
              onSearch={fetchSupplier}
              onChange={handleChangeSupplier}
              style={{ width: '100%' }}
            >
              {mapeoOpciones(dataProveedor)}
            </Select>
          </Form.Item>
        ) : null}

        {mostrarTipoFactura ? (
          <Form.Item
            label="Tipo Factura"
            name="tipoFactura"
            rules={[
              {
                required: true,
              },
            ]}
          >
            <Select
              showSearch
              placeholder="Selecciona el tipo de factura"
              allowClear
              disabled={!habilitado}
              filterOption={(input, option) =>
                option.props.children[0].toLowerCase().indexOf(input.toLowerCase()) >= 0
              }
            >
              {mapeoOpciones(listadoTipoFactura)}
            </Select>
          </Form.Item>
        ) : null}

        {mostrarFechaInicial ? (
          <Form.Item
            label={fechaInicialTexto ?? 'Fecha Inicio'}
            name="fechaInicio"
            rules={[
              {
                required: true,
                type: 'object',
                message: 'La fecha de inicio debe estar definida',
              },
            ]}
          >
            <DatePicker format="DD/MMM/YY" disabled={!habilitado} />
          </Form.Item>
        ) : null}

        {mostrarFechaFinal ? (
          <Form.Item
            label="Fecha Fin"
            name="fechaFin"
            rules={[
              {
                required: true,
                type: 'object',
                message: 'La fecha de inicio debe estar definida|',
              },
            ]}
          >
            <DatePicker format="DD/MMM/YY" disabled={!habilitado} />
          </Form.Item>
        ) : null}
        <Row>
          <Col span={20}>
            <Form.Item
              label={textoNombre ?? 'Nombre listado'}
              name="nombre"
              rules={[
                {
                  required: true,
                  min: 4,
                  message: 'El nombre debe tener de por lo menos 4 caracteres',
                },
                {
                  max: 255,
                  message: 'El nombre no puede tener mas de 255 caracteres',
                },
              ]}
            >
              <Input placeholder="Nombre de listado" disabled={!habilitado} />
            </Form.Item>
          </Col>
          {prefijoMovimiento !== 'C' && (
            <Col span={4}>
              <Button
                type="primary"
                ghost
                htmlType="button"
                className="mr-2"
                disabled={!habilitadoInterno}
                loading={!habilitadoInterno}
                onClick={async () => {
                  const selectedArea = listadoAreas.find(area => area.value === selectedValue)
                  const areaName = selectedArea?.label ?? ''
                  const proyectValue =
                    form.getFieldValue('proyectoInterno') ??
                    form.getFieldValue('proyectoExterno') ??
                    0
                  const projectName =
                    listadoProyectos.find(proyecto => proyecto.id === proyectValue)?.nombre ?? ''

                  const projectNameParts = projectName.trim().split(' ')
                  const lastPart = projectNameParts[projectNameParts.length - 1]
                  let initials
                  if (projectNameParts.length <= 1) {
                    initials = projectName
                  } else {
                    initials = Number.isNaN(Number(lastPart))
                      ? projectNameParts.map(word => word[0]).join('')
                      : projectNameParts
                          .slice(0, -1)
                          .map(word => word[0])
                          .join('') + lastPart
                  }

                  const proposalName = [initials, areaName, prefijoMovimiento]
                    .filter(frag => frag.length > 0)
                    .join('-')
                  const nombre = proposalName
                  setHabilitadoInterno(false)

                  try {
                    const conteoNombresSimilares = await GrupoPeticiones.obtenerConteoNombresSimilares(
                      { nombre },
                    )

                    form.setFieldsValue({
                      nombre: `${proposalName}${conteoNombresSimilares.conteo + 1}`,
                    })
                  } catch {
                    // El interceptor de axios ya mostró el error.
                  } finally {
                    setHabilitadoInterno(true)
                  }
                }}
              >
                Crear Nombre
              </Button>
            </Col>
          )}
        </Row>

        {mostrarUsuarios ? (
          <Form.Item
            label="Usuarios Responsables"
            name="usuariosResponsables"
            rules={[
              {
                required: true,
                message: 'El listado debe tener al menos un usuario responsable',
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
              disabled={!habilitado}
              onSearch={fetchUser}
              onChange={handleChange}
              style={{ width: '100%' }}
            >
              {mapeoOpciones(data)}
            </Select>
          </Form.Item>
        ) : null}

        <Form.Item label={' '}>
          <Button
            type="primary"
            htmlType="submit"
            className="mr-2"
            disabled={!habilitado}
            loading={guardando}
          >
            {botonTexto}
          </Button>
        </Form.Item>
      </Form>
    </Spin>
  )
}

export default FormaConfiguracionGrupo
