import React, { useEffect, useState } from 'react'

import dayjs from 'dayjs'
import { Form, Button, Select, Input, Skeleton, InputNumber, Row } from 'antd'
import { mapeoOpciones } from 'helpers/funcionesExtras'
import AreaPeticiones from 'services/axios/areas'
import BodegaPeticiones from 'services/axios/bodegas'

const { TextArea } = Input

const formItemLayout = {
  labelCol: {
    xs: {
      span: 24,
    },
    sm: {
      span: 8,
    },
    md: {
      span: 6,
    },
    lg: {
      span: 6,
    },
    xl: {
      span: 4,
    },
  },
  wrapperCol: {
    xs: {
      span: 24,
    },
    sm: {
      span: 16,
    },
    md: {
      span: 18,
    },
    lg: {
      span: 18,
    },
    xl: {
      span: 20,
    },
  },
}

const wrapperColBtn = {
  wrapperCol: {
    xs: {
      span: 24,
      offset: 0,
    },
    sm: {
      span: 16,
      offset: 8,
    },
    md: {
      span: 18,
      offset: 6,
    },
    lg: {
      span: 18,
      offset: 6,
    },
    xl: {
      span: 20,
      offset: 4,
    },
  },
}

// sfc
const FormaEdicionArticulo = ({
  valoresIniciales={moneda:'MXN'},
  guardando,
  habilitado,
  esNuevo,
  handleFinish,
  textoBoton,
  limpiarNuevo,
}) => {
  const [habilitadoInterno, setHabilitadoInterno] = useState(false)
  const [listadoBodegas, setListadoBodegas] = useState([])
  const [listadoAreas, setListadoAreas] = useState([])
  // usf

  // uef
  useEffect(() => {
    setHabilitadoInterno(false)
    Promise.all([BodegaPeticiones.listadoSimple(), AreaPeticiones.listadoSimple()])
      .then(resp => {
        if (resp !== undefined) {
          const [bodegas, areas] = resp
          setListadoAreas(areas)
          setListadoBodegas(bodegas)
        }
      })
      // El interceptor de axios ya mostró el error.
      .catch(() => {})
      .finally(() => {
        setHabilitadoInterno(true)
      })
  }, [])

  useEffect(() => {
    const valor = limpiarNuevo ?? 0
    if (valor > 0) {
      form.setFieldsValue({
        titulo: '',
        cantidad: '1',
        precio: '',
        descripcion: '',
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limpiarNuevo])

  const [form] = Form.useForm()

  if (
    guardando === null ||
    guardando === undefined ||
    !habilitadoInterno ||
    valoresIniciales?.id === 0
  ) {
    return (
      <Row style={{ width: '90%', margin: 'auto' }}>
        <Skeleton active />
      </Row>
    )
  }
  // titulo
  // cantidad
  // precio
  // area
  // bodega
  // descripcion

  // console.log('valoresIniciales', valoresIniciales)

  return (
    <Row style={{ width: '90%', margin: 'auto' }}>
      <Form
        {...formItemLayout}
        layout="horizontal"
        form={form}
        onFinish={handleFinish}
        initialValues={valoresIniciales}
        style={{ width: '100%' }}
      >
        <Form.Item
          label="Titulo"
          name="titulo"
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
          <Input placeholder="Nombre" disabled={guardando || !habilitado} />
        </Form.Item>
        <Form.Item
          label="Descripción"
          name="descripcion"
          rules={[
            {
              required: true,
            },
          ]}
        >
          <TextArea disabled={guardando || !habilitado} rows={4} />
        </Form.Item>
        <Form.Item
          label="Cantidad"
          name="cantidad"
          rules={[
            {
              required: true,
            },
          ]}
        >
          <InputNumber
            placeholder="Cantidad"
            step={1}
            disabled={guardando || !habilitado || !esNuevo}
          />
        </Form.Item>
        <Form.Item
          label="Precio Unitario"
          name="precio"
          rules={[
            {
              required: true,
              message: 'El artículo debe tener un precio unitario',
            },
          ]}
        >
          <InputNumber
            step={0.01}
            formatter={value => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            parser={value => value.replace(/\$\s?|(,*)/g, '')}
            placeholder="Precio del producto"
            disabled={guardando || !habilitado || !esNuevo}
            // style={{ width: '100%' }}
          />
        </Form.Item>
        <Form.Item
          label="Moneda"
          name="moneda"
          rules={[
            {
              required: true,
              message: 'El artículo debe tener una moneda',
            },
          ]}
        >
          <Select
            placeholder="Selecciona la moneda"
            disabled={guardando || !habilitado}
            options={[{label: 'MXN', value: 'MXN'}, {label: 'USD', value: 'USD'}]}
          />
        </Form.Item>
        <Form.Item
          label="Area"
          name="area"
          rules={[
            {
              required: true,
              message: 'El artículo debe tener un area asignada',
            },
          ]}
        >
          <Select
            showSearch
            placeholder="Selecciona el áreas asociada"
            allowClear
            disabled={guardando || !habilitado}
            filterOption={(input, option) =>
              option.props.children[0].toLowerCase().indexOf(input.toLowerCase()) >= 0
            }
          >
            {mapeoOpciones(listadoAreas)}
          </Select>
        </Form.Item>
        <Form.Item
          label="Almacén"
          name="bodega"
          rules={[
            {
              required: true,
              message: 'El artículo debe tener un almacén asociado',
            },
          ]}
        >
          <Select
            showSearch
            placeholder="Selecciona el almacén asociado"
            allowClear
            disabled={guardando || !habilitado}
            filterOption={(input, option) =>
              option.props.children[0].toLowerCase().indexOf(input.toLowerCase()) >= 0
            }
          >
            {mapeoOpciones(listadoBodegas)}
          </Select>
        </Form.Item>
        <Form.Item {...wrapperColBtn}>
          <Button
            type="primary"
            htmlType="submit"
            className="mr-2"
            disabled={guardando || !habilitado}
            loading={guardando}
          >
            {textoBoton ?? 'Guardar'}
          </Button>
        </Form.Item>
      </Form>
    </Row>
  )
}

export default FormaEdicionArticulo
