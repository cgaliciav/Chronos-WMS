import { useEffect, useState } from 'react'
import { useLocation, Link } from 'react-router'
import QueryString from 'query-string'
import { Button, Dropdown, Form, Select, Table, type TableProps } from 'antd'
import { DownOutlined, FileExcelOutlined } from '@ant-design/icons'
import { notification } from 'helpers/feedback'
import ReportePeticiones from 'services/axios/reportes'
import dayjs from 'dayjs'
import ACL from 'app/auth/ACL'
import Titulo from 'components/Titulo'
import Encabezado from 'components/ui/Encabezado'
import EncabezadoTabla from 'components/ui/EncabezadoTabla'
import Tarjeta from 'components/ui/Tarjeta'
import { filtrarOpcion, formatoMonedaMexico, mapeoOpciones } from 'helpers/funcionesExtras'
import type { ElementoListado } from 'services/axios'
import GrupoPeticiones from 'services/axios/grupos'
import ProveedorPeticiones from 'services/axios/proveedores'
import ProyectoPeticiones from 'services/axios/proyectos'
import ModalImagenes from 'pages/componentes/modalImagenes'
import ColumnasOperaciones from 'pages/operaciones/componentes/columnasTablaOperaciones'
import DetalleArticuloOperacionTabla from 'pages/operaciones/componentes/detalleArticuloOperacionTabla'
import type {
  ColumnasOperacion,
  MovimientoOperacion,
  PaginacionTabla,
} from 'pages/operaciones/tipos'
import type { Archivo, ParametrosTabla } from 'types/api'

interface Busqueda {
  proveedorId?: number
  /** Opcional: sin proyecto se listan las compras de todos. */
  proyectoId?: number
}

const ORDEN_INICIAL = { sortField: 'movimiento.id', sortOrder: 'descend' } as const

/**
 * Proveedores / Productos por proveedor: artículos comprados a un proveedor (las líneas de sus facturas),
 * opcionalmente de un solo proyecto. Con `?uid=` llega con el proveedor ya elegido (desde el listado de proveedores).
 */
const ProductosPorProveedor = () => {
  const [form] = Form.useForm<Busqueda>()
  const [proveedores, setProveedores] = useState<ElementoListado[]>([])
  const [proyectos, setProyectos] = useState<ElementoListado[]>([])
  const [cargandoListas, setCargandoListas] = useState(true)
  const [busqueda, setBusqueda] = useState<Busqueda>({})
  const [datos, setDatos] = useState<MovimientoOperacion[]>([])
  const [pagination, setPagination] = useState<PaginacionTabla>({ current: 1, pageSize: 20 })
  const [cargando, setCargando] = useState(false)
  // Orden y filtros de la tabla: el Excel se genera con los mismos.
  const [vista, setVista] = useState<ParametrosTabla>(ORDEN_INICIAL)
  const [pidiendoReporte, setPidiendoReporte] = useState(false)
  const [archivosImagenes, setArchivosImagenes] = useState<Archivo[]>([])
  const [mostrarModalImagenes, setMostrarModalImagenes] = useState(false)
  const location = useLocation()

  const pedirDatos = (filtro: Busqueda, parametros: ParametrosTabla) => {
    if (filtro.proveedorId === undefined) return
    setCargando(true)
    GrupoPeticiones.listadoPorProveedor({
      ...parametros,
      proveedorId: filtro.proveedorId,
      proyectoId: filtro.proyectoId,
    })
      .then(respuesta => {
        if (respuesta !== undefined) {
          setDatos(respuesta.results as MovimientoOperacion[])
          setPagination(respuesta.pagination)
        }
      })
      .catch(() => {}) // El interceptor de axios ya mostró el error.
      .finally(() => {
        setCargando(false)
      })
  }

  const buscar = (valores: Busqueda) => {
    setBusqueda(valores)
    setVista(ORDEN_INICIAL)
    pedirDatos(valores, { ...ORDEN_INICIAL, pagination: { ...pagination, current: 1 } })
  }

  useEffect(() => {
    Promise.all([ProveedorPeticiones.listadoSimple(), ProyectoPeticiones.listadoSimple()])
      .then(([listaProveedores, listaProyectos]) => {
        setProveedores(listaProveedores)
        setProyectos(listaProyectos)
        const { uid } = QueryString.parse(location.search.replace('?', ''))
        const proveedorId = typeof uid === 'string' ? Number(uid) : undefined
        if (proveedorId && listaProveedores.some(proveedor => proveedor.id === proveedorId)) {
          form.setFieldsValue({ proveedorId })
          buscar({ proveedorId })
        }
      })
      .catch(() => {}) // El interceptor de axios ya mostró el error.
      .finally(() => {
        setCargandoListas(false)
      })
    // Solo al entrar: las listas y el proveedor que venga en la URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const alCambiarTabla: TableProps<MovimientoOperacion>['onChange'] = (
    paginacion,
    filters,
    sorter,
  ) => {
    const { field = 'movimiento.id', order = 'descend' } = Array.isArray(sorter) ? {} : sorter
    const esClave = Array.isArray(field)
      ? field.includes('productoClaves')
      : String(field).includes('productoClaves')
    const sortField = (esClave ? 'inventarioActual.id' : field) as string
    setVista({ sortField, sortOrder: order, filters })
    pedirDatos(busqueda, { sortField, sortOrder: order, pagination: paginacion, filters })
  }

  /** Pide el Excel de lo que muestra la tabla; llega por notificación y por correo, como los demás reportes. */
  const pedirReporte = (conFoto: boolean) => {
    if (busqueda.proveedorId === undefined) return
    setPidiendoReporte(true)
    ReportePeticiones.porProveedor({
      proveedorId: busqueda.proveedorId,
      proyectoId: busqueda.proyectoId,
      conFoto,
      sortField: vista.sortField,
      sortOrder: vista.sortOrder,
      filters: vista.filters,
    })
      .then(respuesta => {
        if (respuesta !== undefined) notification.success({ title: respuesta.message })
      })
      .catch(() => {}) // El interceptor de axios ya mostró el error.
      .finally(() => {
        setPidiendoReporte(false)
      })
  }

  const columns: ColumnasOperacion = [
    ColumnasOperaciones.foto(setArchivosImagenes, setMostrarModalImagenes),
    ColumnasOperaciones.producto,
    ColumnasOperaciones.clave,
    ColumnasOperaciones.cantidad,
    {
      title: 'Precio',
      key: 'precio',
      align: 'right',
      render: (_: unknown, movimiento: MovimientoOperacion) =>
        formatoMonedaMexico(movimiento.inventarioActual?.producto?.productoPrecios?.[0]?.precio),
    },
    {
      title: 'Factura',
      key: 'factura',
      render: (_: unknown, movimiento: MovimientoOperacion) => {
        const factura = movimiento.grupos?.[0]
        return factura ? (
          <Link to={`/compras/operacion?uid=${factura.id}`}>{factura.nombre}</Link>
        ) : null
      },
    },
    {
      title: 'Proyecto',
      dataIndex: ['operacion', 'proyecto', 'nombre'],
      key: 'proyecto.nombre',
      sorter: true,
    },
    {
      title: 'Fecha',
      dataIndex: 'fecha',
      key: 'movimiento.fecha',
      render: (fecha?: string) => (fecha ? dayjs(fecha).format('D-MMM-YY') : ''),
    },
    ColumnasOperaciones.almacen,
    ColumnasOperaciones.funciones(),
  ]

  const proveedorNombre = proveedores.find(p => p.id === busqueda.proveedorId)?.nombre

  return (
    <ACL roles={['V-ADMINISTRACION-PROVEEDORESPRODUCTOS', 'ADMINISTRADOR']} redirect>
      <Titulo texto="Productos por proveedor" />
      <Encabezado>Productos por proveedor</Encabezado>
      <Tarjeta>
        <Form form={form} layout="inline" onFinish={buscar} style={{ marginBottom: 16, rowGap: 8 }}>
          <Form.Item
            label="Proveedor"
            name="proveedorId"
            rules={[{ required: true, message: 'Selecciona el proveedor' }]}
          >
            <Select
              style={{ width: 320 }}
              showSearch={{ filterOption: filtrarOpcion }}
              placeholder="Selecciona el proveedor"
              loading={cargandoListas}
              disabled={cargandoListas}
            >
              {mapeoOpciones(proveedores)}
            </Select>
          </Form.Item>
          <Form.Item label="Proyecto" name="proyectoId">
            <Select
              style={{ width: 320 }}
              showSearch={{ filterOption: filtrarOpcion }}
              placeholder="Todos los proyectos"
              allowClear
              loading={cargandoListas}
              disabled={cargandoListas}
            >
              {mapeoOpciones(proyectos)}
            </Select>
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={cargando} disabled={cargandoListas}>
              Buscar
            </Button>
          </Form.Item>
        </Form>
        <Table<MovimientoOperacion>
          columns={columns}
          dataSource={datos}
          rowKey={movimiento => `${movimiento.id}`}
          title={() => (
            <EncabezadoTabla
              titulo={proveedorNombre ? `Productos de ${proveedorNombre}` : 'Productos'}
              total={pagination.total}
              totalItems={pagination.totalItems}
              extra={
                <Dropdown
                  disabled={busqueda.proveedorId === undefined}
                  menu={{
                    items: [
                      { key: 'sinFoto', label: 'Excel sin foto', icon: <FileExcelOutlined /> },
                      { key: 'conFoto', label: 'Excel con foto', icon: <FileExcelOutlined /> },
                    ],
                    onClick: ({ key }) => pedirReporte(key === 'conFoto'),
                  }}
                >
                  <Button type="link" size="small" loading={pidiendoReporte}>
                    Reportes
                    <DownOutlined />
                  </Button>
                </Dropdown>
              }
            />
          )}
          expandable={{
            expandedRowRender: movimiento => (
              <DetalleArticuloOperacionTabla movimiento={movimiento} />
            ),
          }}
          pagination={{
            ...pagination,
            pageSizeOptions: ['10', '20', '50', '100', '500'],
            showSizeChanger: true,
          }}
          locale={{
            emptyText:
              busqueda.proveedorId === undefined
                ? 'Selecciona un proveedor y pulsa Buscar'
                : 'El proveedor no tiene productos comprados con ese filtro',
          }}
          loading={cargando}
          onChange={alCambiarTabla}
        />
      </Tarjeta>
      <ModalImagenes
        mostrarModal={mostrarModalImagenes}
        cerrarModal={() => setMostrarModalImagenes(false)}
        archivos={archivosImagenes}
      />
    </ACL>
  )
}

export default ProductosPorProveedor
