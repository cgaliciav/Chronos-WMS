import Titulo from 'components/Titulo'
import Encabezado from 'components/ui/Encabezado'
import Tarjeta from 'components/ui/Tarjeta'
import { Popconfirm, Tag, Tooltip } from 'antd'
import type { TableColumnsType } from 'antd'
import { EditOutlined, StopOutlined } from '@ant-design/icons'
import ACL from 'app/auth/ACL'
import AreasPeticiones from 'services/axios/areas'
import type { Area } from 'types/api'
import {
  obtenerPropsBusquedaCheck,
  obtenerPropsBusquedaInput,
} from '../../../componentes/filtrosTablas'
import TablaGeneral from '../../componentes/tablaGeneral'
import AccionesTablaAreas from '../componentes/accionesTablaAreas'

const columns: TableColumnsType<Area> = [
  {
    title: 'Nombre',
    dataIndex: 'nombre',
    sorter: true,
    ...obtenerPropsBusquedaInput(),
  },
  {
    title: 'Estado',
    dataIndex: 'estatus',
    sorter: true,
    render: (estatus: Area['estatus'], record) => {
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
    render: (id: Area['id']) => (
      <span>
        <Tooltip title="Editar area">
          <Tag color="blue">
            <a href={`#/areas/editar?uid=${id}`}>
              <EditOutlined />
            </a>
          </Tag>
        </Tooltip>
        <Popconfirm
          title="¿Estas seguro que quieres inhabilitar area?"
          onConfirm={() => AccionesTablaAreas.inhabilitarArea(id)}
          onCancel={() => {}}
          okText="Sí"
          cancelText="No"
        >
          <Tooltip title="Inhabilitar area">
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

const AreasListado = () => {
  return (
    <ACL roles={['AREA-LISTADO', 'ADMINISTRADOR']} redirect>
      <Titulo texto="Areas" />
      <Encabezado>Lista de areas</Encabezado>
      <Tarjeta>
        <TablaGeneral<Area> columns={columns} fnPeticion={AreasPeticiones.listado} titulo="Areas" />
      </Tarjeta>
    </ACL>
  )
}

export default AreasListado
