import Titulo from 'components/Titulo'
import Encabezado from 'components/ui/Encabezado'
import Tarjeta from 'components/ui/Tarjeta'
import { Popconfirm, Tag, Tooltip } from 'antd'
import type { TableColumnsType } from 'antd'
import { EditOutlined, StopOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import ACL from 'app/auth/ACL'
import ProyectosPeticiones from 'services/axios/proyectos'
import {
  obtenerPropsBusquedaCheck,
  obtenerPropsBusquedaInput,
} from '../../../componentes/filtrosTablas'
import TablaGeneral from '../../componentes/tablaGeneral'
import type { ProyectoAdmin } from '../../tipos'
import AccionesTablaProyectos from '../componentes/accionesTablaProyectos'

const columns: TableColumnsType<ProyectoAdmin> = [
  {
    title: 'Nombre',
    dataIndex: 'nombre',
    sorter: true,
    ...obtenerPropsBusquedaInput(),
  },
  {
    title: 'Fecha Inicio',
    dataIndex: 'fechaInicio',
    sorter: true,
    render: (fechaInicio: ProyectoAdmin['fechaInicio']) => dayjs(fechaInicio).format('DD/MMM/YY'),
  },
  {
    title: 'Tipo',
    dataIndex: 'esExterno',
    sorter: true,
    render: (esExterno: ProyectoAdmin['esExterno'], record) => {
      const estados = []
      if (esExterno) {
        estados.push(
          <Tag color="purple" key={`ee1${record.id}`}>
            {' '}
            EXTERNO{' '}
          </Tag>,
        )
      } else {
        estados.push(
          <Tag color="cyan" key={`ee1${record.id}`}>
            {' '}
            INTERNO{' '}
          </Tag>,
        )
      }
      return <span> {estados} </span>
    },
    ...obtenerPropsBusquedaCheck([
      {
        text: 'Interno',
        value: false,
      },
      {
        text: 'Externo',
        value: true,
      },
    ]),
  },
  {
    title: 'Estado',
    dataIndex: 'estatus',
    sorter: true,
    render: (estatus: ProyectoAdmin['estatus'], record) => {
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
    render: (id: ProyectoAdmin['id']) => (
      <span>
        <Tooltip title="Editar proyecto">
          <Tag color="blue">
            <a href={`#/proyectos/editar?uid=${id}`}>
              <EditOutlined />
            </a>
          </Tag>
        </Tooltip>
        <Popconfirm
          title="¿Estas seguro que quieres inhabilitar el proyecto?"
          onConfirm={() => AccionesTablaProyectos.inhabilitarProyecto(id)}
          onCancel={() => {}}
          okText="Sí­"
          cancelText="No"
        >
          <Tooltip title="Inhabilitar proyecto">
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

const ProyectosListado = () => {
  return (
    <ACL roles={['PROYECTO-LISTADO', 'ADMINISTRADOR']} redirect>
      <Titulo texto="Proyectos" />
      <Encabezado>Lista de proyectos</Encabezado>
      <Tarjeta>
        <TablaGeneral<ProyectoAdmin>
          columns={columns}
          fnPeticion={ProyectosPeticiones.listado}
          titulo="Proyectos"
        />
      </Tarjeta>
    </ACL>
  )
}

export default ProyectosListado
