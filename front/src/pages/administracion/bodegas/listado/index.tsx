import Titulo from 'components/Titulo'
import Encabezado from 'components/ui/Encabezado'
import Tarjeta from 'components/ui/Tarjeta'
import { Popconfirm, Tag, Tooltip } from 'antd'
import type { TableColumnsType } from 'antd'
import { EditOutlined, StopOutlined } from '@ant-design/icons'
import ACL from 'app/auth/ACL'
import BodegaPeticiones from 'services/axios/bodegas'
import type { BodegaAdmin } from '../../tipos'
import {
  obtenerPropsBusquedaCheck,
  obtenerPropsBusquedaInput,
} from '../../../componentes/filtrosTablas'
import TablaGeneral from '../../componentes/tablaGeneral'
import AccionesTablaBodegas from '../componentes/accionesTablaBodegas'
import { Link } from 'react-router'

const columns: TableColumnsType<BodegaAdmin> = [
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
    render: (estatus: BodegaAdmin['estatus'], record) => {
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
    render: (id: BodegaAdmin['id']) => (
      <span>
        <Tooltip title="Editar almacén">
          <Tag color="blue">
            <Link to={`/bodegas/editar?uid=${id}`}>
              <EditOutlined />
            </Link>
          </Tag>
        </Tooltip>
        <Popconfirm
          title="¿Estas seguro que quieres inhabilitar area?"
          onConfirm={() => AccionesTablaBodegas.inhabilitarBodega(id)}
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

const AlmacenesListado = () => {
  return (
    <ACL roles={['BODEGA-LISTADO', 'ADMINISTRADOR']} redirect>
      <Titulo texto="Almacenes" />
      <Encabezado>Lista de almacenes</Encabezado>
      <Tarjeta>
        <TablaGeneral<BodegaAdmin>
          columns={columns}
          fnPeticion={BodegaPeticiones.listado}
          titulo="Almacenes"
        />
      </Tarjeta>
    </ACL>
  )
}

export default AlmacenesListado
