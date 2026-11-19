import { Tag, Popconfirm, Typography, Badge } from 'antd'
import ACL from 'app/auth/ACL'
import { DeleteOutlined, DollarOutlined, EyeOutlined } from '@ant-design/icons'
import { conToken, urlDelApi } from 'services/axios'
import { obtenerPropsBusquedaInput } from 'pages/componentes/filtrosTablas'
import type { Archivo, ProductoClave } from 'types/api'
import type { ColumnaOperacion, FnQuitarMovimiento, MovimientoOperacion } from '../tipos'
import { Link } from 'react-router'

export type { ColumnaOperacion, ColumnasOperacion, FnQuitarMovimiento } from '../tipos'

/** Columnas comunes de las tablas de movimientos de las operaciones. */
export interface ColumnasOperacionesComunes {
  foto: (
    setArchivosImagenes: (archivos: Archivo[]) => void,
    setMostrarModalImagenes: (mostrar: boolean) => void,
  ) => ColumnaOperacion
  producto: ColumnaOperacion
  clave: ColumnaOperacion
  /** Unidades del movimiento; marca los expendables. */
  cantidad: ColumnaOperacion
  /** Unidades aún sin devolver de una salida (préstamos y rentas activas). */
  pendiente: ColumnaOperacion
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
        ruta = conToken(urlDelApi(`file/thumbnail/${archivos[0].id}`))
      else ruta = '/resources/images/no-photo-available.svg'
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
  cantidad: {
    title: 'Cantidad',
    dataIndex: 'cantidad',
    key: 'movimiento.cantidad',
    width: '110px',
    align: 'right',
    render: (cantidad: MovimientoOperacion['cantidad'], record: MovimientoOperacion) => (
      <>
        {Number(cantidad)}
        {record.consumible ? (
          <Tag color="gold" style={{ marginInlineStart: 6, marginInlineEnd: 0 }}>
            Expendable
          </Tag>
        ) : null}
      </>
    ),
  },
  pendiente: {
    title: 'Pendiente',
    dataIndex: 'saldoPendiente',
    key: 'saldoPendiente',
    width: '100px',
    align: 'right',
    render: (saldo: MovimientoOperacion['saldoPendiente'], record: MovimientoOperacion) => {
      // Los movimientos anteriores a la fase 3 no tienen saldo calculado: siguen pendientes por su cantidad.
      const pendiente =
        saldo === null || saldo === undefined ? Number(record.cantidad) : Number(saldo)
      return (
        <Typography.Text strong>
          {pendiente} de {Number(record.cantidad)}
        </Typography.Text>
      )
    },
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
        {/* Quien no puede abrir el detalle (perfil Visita) no ve el enlace. */}
        <ACL roles={['DETALLE-MOVIMIENTO', 'ADMINISTRADOR']}>
          <Tag color="blue">
            <Link to={`/movimientos/detalle?uid=${movimientoId}`}>
              <EyeOutlined />
            </Link>
          </Tag>
        </ACL>

        <ACL roles={['V-ARTICULOS-DETALLE', 'ADMINISTRADOR']}>
          <Tag>
            <Link to={`/articulos/detalle?uid=${record.inventarioActual?.id}`}>
              <EyeOutlined />
            </Link>
          </Tag>
        </ACL>

        {editarPrecio && (
          <ACL roles={['V-EDITAR-ARTICULOS-DETALLE', 'ADMINISTRADOR']}>
            <Tag color="green">
              <Link to={`/articulos/editar/detalle?uid=${record.inventarioActual?.id}&p=precios`}>
                <DollarOutlined />
              </Link>
            </Tag>
          </ACL>
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
