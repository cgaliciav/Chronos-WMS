import { useEffect, useState } from 'react'
import { Form, Button, Select, Input, Skeleton, InputNumber, Row } from 'antd'
import { mapeoOpciones } from 'helpers/funcionesExtras'
import AreaPeticiones from 'services/axios/areas'
import BodegaPeticiones from 'services/axios/bodegas'
import type { ElementoListado } from 'services/axios'
import type { Numerico } from 'types/api'
import { filtrarOpcion } from 'helpers/funcionesExtras'

const { TextArea } = Input

/**
 * Valores que entrega el formulario de artículo al validar (también lo usa `operaciones/componentes/formaAC` para
 * altas). `cantidad` y `precio` pueden llegar como texto: `limpiarNuevo` los fija a `'1'` y `''`, y en edición el
 * precio viene del API (columna `numeric`).
 */
export interface ValoresArticulo {
  /** Inventario actual que se edita; con `0` se muestra el esqueleto. */
  id?: number
  titulo: string
  descripcion: string
  cantidad: Numerico
  precio: Numerico
  moneda: string
  area: number
  bodega: number
}

export interface FormaEdicionArticuloProps {
  valoresIniciales?: Partial<ValoresArticulo>
  /** Sin valor (`null`/`undefined`) se muestra el esqueleto. */
  guardando?: boolean | null
  habilitado?: boolean
  /** Habilita cantidad y precio (alta de artículo). */
  esNuevo?: boolean
  handleFinish: (valores: ValoresArticulo) => void
  textoBoton?: string
  /** Contador: cada vez que aumenta se vacía el formulario para el siguiente artículo. */
  limpiarNuevo?: number
}

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

const FormaEdicionArticulo = ({
  valoresIniciales = { moneda: 'MXN' },
  guardando,
  habilitado,
  esNuevo,
  handleFinish,
  textoBoton,
  limpiarNuevo,
}: FormaEdicionArticuloProps) => {
  const [habilitadoInterno, setHabilitadoInterno] = useState(false)
  const [listadoBodegas, setListadoBodegas] = useState<ElementoListado[]>([])
  const [listadoAreas, setListadoAreas] = useState<ElementoListado[]>([])
  const [form] = Form.useForm<ValoresArticulo>()

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
            parser={value => (value ?? '').replace(/\$\s?|(,*)/g, '')}
            placeholder="Precio del producto"
            disabled={guardando || !habilitado || !esNuevo}
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
            options={[
              { label: 'MXN', value: 'MXN' },
              { label: 'USD', value: 'USD' },
            ]}
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
            showSearch={{ filterOption: filtrarOpcion }}
            placeholder="Selecciona el áreas asociada"
            allowClear
            disabled={guardando || !habilitado}
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
            showSearch={{ filterOption: filtrarOpcion }}
            placeholder="Selecciona el almacén asociado"
            allowClear
            disabled={guardando || !habilitado}
          >
            {mapeoOpciones(listadoBodegas)}
          </Select>
        </Form.Item>
        <Form.Item {...wrapperColBtn}>
          <Button
            type="primary"
            htmlType="submit"
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
