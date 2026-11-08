import Titulo from 'components/Titulo'
import Encabezado from 'components/ui/Encabezado'
import Tarjeta from 'components/ui/Tarjeta'
import { Popconfirm, Tag, Tooltip } from 'antd'
import type { TableColumnsType } from 'antd'
import { EditOutlined, StopOutlined } from '@ant-design/icons'
import ACL from 'app/auth/ACL'
import ProveedoresPeticiones from 'services/axios/proveedores'
import {
  obtenerPropsBusquedaCheck,
  obtenerPropsBusquedaInput,
} from '../../../componentes/filtrosTablas'
import TablaGeneral from '../../componentes/tablaGeneral'
import type { ProveedorAdmin } from '../../tipos'
import AccionesTablaProveedores from '../componentes/accionesTablaProveedores'

const columns: TableColumnsType<ProveedorAdmin> = [
  {
    title: 'Nombre',
    dataIndex: 'nombre',
    sorter: true,
    ...obtenerPropsBusquedaInput(),
  },
  {
    title: 'RFC',
    dataIndex: 'RFCEmite',
    sorter: true,
    ...obtenerPropsBusquedaInput(),
  },
  {
    title: 'Estado',
    dataIndex: 'estatus',
    sorter: true,
    render: (estatus: ProveedorAdmin['estatus'], record) => {
      const estados = []
      if (estatus === 'inactivo')
        estados.push(
          <Tag color="orange" key={`t1${record.id}`}>
            {' '}
            INHABILITADO{' '}
          </Tag>,
        )
      else if (estatus === 'finalizado')
        estados.push(
          <Tag color="magenta" key={`t2${record.id}`}>
            {' '}
            FINALIZADO{' '}
          </Tag>,
        )
      else
        estados.push(
          <Tag color="green" key={`t3${record.id}`}>
            {' '}
            ACTIVO{' '}
          </Tag>,
        )
      return <span> {estados} </span>
    },
    ...obtenerPropsBusquedaCheck([
      {
        text: 'Inhabilitado',
        value: 'inactivo',
      },
      {
        text: 'Activo',
        value: 'activo',
      },
    ]),
    width: '15%',
  },
  {
    title: 'Acciones',
    dataIndex: 'id',
    render: (id: ProveedorAdmin['id']) => (
      <span>
        <Tooltip title="Editar proveedor">
          <Tag color="blue">
            <a href={`#/proveedores/editar?uid=${id}`}>
              <EditOutlined />
            </a>
          </Tag>
        </Tooltip>
        <Popconfirm
          title="¿Estas seguro que quieres inhabilitar proveedor?"
          onConfirm={() => AccionesTablaProveedores.inhabilitarProveedor(id)}
          onCancel={() => {}}
          okText="Sí"
          cancelText="No"
        >
          <Tooltip title="Inhabilitar proveedor">
            <Tag color="red">
              <a href="#">
                <StopOutlined />
              </a>
            </Tag>
          </Tooltip>
        </Popconfirm>
      </span>
    ),
    width: '15%',
  },
]

const ProveedoresListado = () => {
  return (
    <ACL roles={['PROVEEDOR-LISTADO', 'ADMINISTRADOR']} redirect>
      <Titulo texto="Proveedores" />
      <Encabezado>Lista de proveedores</Encabezado>
      <Tarjeta>
        <TablaGeneral<ProveedorAdmin>
          columns={columns}
          fnPeticion={ProveedoresPeticiones.listado}
          titulo="Proveedores"
        />
      </Tarjeta>
    </ACL>
  )
}

export default ProveedoresListado
