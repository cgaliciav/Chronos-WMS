import { Tag, Popconfirm, Typography, Badge } from 'antd'
import { DeleteOutlined, DollarOutlined, EyeOutlined } from '@ant-design/icons'
import { apiURLBase, conToken } from 'services/axios'
import { obtenerPropsBusquedaInput } from 'pages/componentes/filtrosTablas'
import type { Archivo, ProductoClave } from 'types/api'
import type { ColumnaOperacion, FnQuitarMovimiento, MovimientoOperacion } from '../tipos'

export type { ColumnaOperacion, ColumnasOperacion, FnQuitarMovimiento } from '../tipos'

/** Columnas comunes de las tablas de movimientos de las operaciones. */
export interface ColumnasOperacionesComunes {
  foto: (
    setArchivosImagenes: (archivos: Archivo[]) => void,
    setMostrarModalImagenes: (mostrar: boolean) => void,
  ) => ColumnaOperacion
  producto: ColumnaOperacion
  clave: ColumnaOperacion
  proyecto: ColumnaOperacion
  almacen: ColumnaOperacion
  operacion: ColumnaOperacion
  almacenista: ColumnaOperacion
  /** Ver, ver artículo, editar precio (opcional) y quitar (solo si se pasa `quitarMovimiento`). */
  funciones: (
    quitarMovimiento?: FnQuitarMovimiento,
    editarPrecio?: boolean | null,
  ) => ColumnaOperacion
}

const ColumnasOperaciones: ColumnasOperacionesComunes = {
  foto: (setArchivosImagenes, setMostrarModalImagenes) => ({
    title: 'Foto',
    dataIndex: ['inventarioActual', 'producto', 'archivos'],
    key: 'thumbnail',
    render: (archivos: Archivo[] | undefined) => {
      let ruta
      if (archivos && archivos.length > 0)
        ruta = conToken(`${apiURLBase}/file/thumbnail/${archivos[0].id}`)
      else ruta = 'resources/images/no-photo-available.png'
      return (
        <a
          style={{
            display: 'inline-block',
            width: '64px',
            height: '64px',
            border: '1px solid #e4e9f0',
            background: '#fff',
            borderRadius: '3px',
          }}
          href="#"
          onClick={e => {
            e.preventDefault()
            setArchivosImagenes(archivos ?? [])
            setMostrarModalImagenes(true)
          }}
        >
          <img width="100%" src={ruta} alt="" />
        </a>
      )
    },
    width: '64px',
  }),
  producto: {
    title: 'Producto',
    dataIndex: ['inventarioActual', 'producto', 'titulo'],
    key: 'producto.titulo',
    sorter: true,
    render: (text: string | undefined) => (
      <Typography.Text ellipsis strong>
        {' '}
        {text}{' '}
      </Typography.Text>
    ),
    ...obtenerPropsBusquedaInput(),
  },

  clave: {
    title: 'Clave',
    dataIndex: ['inventarioActual', 'producto', 'productoClaves'],
    key: 'productoClaves.barras',
    sorter: true,
    ellipsis: true,
    render: (claves: ProductoClave[] | undefined) => (
      <div>
        {claves?.map(clave => (
          <p
            key={clave.barras}
            style={{ fontWeight: 700, color: 'var(--ant-color-primary, #4b7cf3)' }}
          >
            {clave.barras}
          </p>
        ))}
      </div>
    ),
    ...obtenerPropsBusquedaInput(),
  },
  proyecto: {
    title: 'Proyecto',
    dataIndex: ['operacion', 'proyecto', 'nombre'],
    key: 'proyecto.nombre',
    ellipsis: true,
    sorter: true,
    responsive: ['xl'],
  },
  almacen: {
    title: 'Almacén',
    dataIndex: ['inventarioActual', 'bodega', 'nombre'],
    key: 'bodega.nombre',
    ellipsis: true,
    sorter: true,
    responsive: ['xxl'],
  },
  operacion: {
    title: 'Operación',
    dataIndex: ['operacion', 'movimientoTipo', 'nombre'],
    key: 'operacion.nombre',
    ellipsis: true,
    responsive: ['xl'],
    ...obtenerPropsBusquedaInput(),
    render: (text: string | undefined, record: MovimientoOperacion) => (
      <Badge dot={record.estatus === 'finalizado'}>
        <Typography.Text strong>{text}</Typography.Text>
      </Badge>
    ),
  },
  almacenista: {
    title: 'Almacenista',
    dataIndex: ['sesion', 'usuario', 'nombre'],
    key: 'usuario.nombre',
    sorter: true,
    ellipsis: true,
    ...obtenerPropsBusquedaInput(),
  },
  funciones: (quitarMovimiento, editarPrecio = null) => ({
    title: '',
    dataIndex: 'id',
    key: 'action',
    width: '20%',
    render: (movimientoId: number, record: MovimientoOperacion) => (
      <span>
        <Tag color="blue">
          <a href={`#/movimientos/detalle?uid=${movimientoId}`}>
            <EyeOutlined />
          </a>
        </Tag>

        <Tag>
          <a href={`#/articulos/detalle?uid=${record.inventarioActual?.id}`}>
            <EyeOutlined />
          </a>
        </Tag>

        {editarPrecio && (
          <Tag color="green">
            <a href={`#/articulos/editar/detalle?uid=${record.inventarioActual?.id}&p=precios`}>
              <DollarOutlined />
            </a>
          </Tag>
        )}

        {quitarMovimiento ? (
          <Popconfirm
            title="¿Estas seguro que quieres borrar el movimiento?"
            onConfirm={() => {
              quitarMovimiento(movimientoId)
            }}
            onCancel={() => {}}
            okText="Sí"
            cancelText="No"
          >
            <Tag color="red">
              <a href="#">
                <DeleteOutlined />
              </a>
            </Tag>
          </Popconfirm>
        ) : null}
      </span>
    ),
  }),
}

export default ColumnasOperaciones
