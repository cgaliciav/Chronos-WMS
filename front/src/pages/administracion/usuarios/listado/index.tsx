import Titulo from 'components/Titulo'
import Encabezado from 'components/ui/Encabezado'
import Tarjeta from 'components/ui/Tarjeta'
import { Popconfirm, Tag, Tooltip } from 'antd'
import type { TableColumnsType } from 'antd'
import { EditOutlined, PoweroffOutlined, UserDeleteOutlined } from '@ant-design/icons'
import ACL from 'app/auth/ACL'
import {
  obtenerPropsBusquedaCheck,
  obtenerPropsBusquedaInput,
} from 'pages/componentes/filtrosTablas'
import TablaGeneral from 'pages/administracion/componentes/tablaGeneral'
import UsuarioPeticiones from 'services/axios/usuarios'
import type { UsuarioListado } from '../../tipos'
import AccionesTablaUsuarios from '../componentes/accionesTablaUsuarios'
import { Link } from 'react-router'

const UsuariosListado = () => {
  const columns: TableColumnsType<UsuarioListado> = [
    {
      title: 'Nombre',
      dataIndex: 'nombre',
      sorter: true,
      ...obtenerPropsBusquedaInput(),
    },
    {
      title: 'Email',
      dataIndex: 'correo',
      sorter: true,
      ...obtenerPropsBusquedaInput(),
    },
    {
      title: 'Estado',
      dataIndex: 'estatusExtendido',
      sorter: true,
      render: (estatusEx: UsuarioListado['estatusExtendido'], record) => {
        const estados = []
        if (estatusEx === 'inactivo')
          estados.push(
            <Tag color="orange" key={`t1${record.id}`}>
              {' '}
              INHABILITADO{' '}
            </Tag>,
          )
        else if (estatusEx === 'vencido')
          estados.push(
            <Tag color="magenta" key={`t2${record.id}`}>
              {' '}
              VENCIDO{' '}
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
      width: '15%',
      defaultFilteredValue: ['activo'],
      ...obtenerPropsBusquedaCheck([
        {
          text: 'Inhabilitado',
          value: 'inactivo',
        },
        {
          text: 'Activo',
          value: 'activo',
        },
        {
          text: 'Vencido',
          value: 'vencido',
        },
      ]),
    },
    {
      title: 'Acciones',
      dataIndex: 'id',
      render: (id: UsuarioListado['id'], record) => (
        <span>
          <Tooltip title="Editar usuario">
            <Tag color="blue">
              <Link to={`/usuarios/editar?uid=${id}`}>
                <EditOutlined />
              </Link>
            </Tag>
          </Tooltip>
          <Popconfirm
            title="¿Estas seguro que quieres cambiar la contraseña del usuario?"
            onConfirm={() => AccionesTablaUsuarios.regenerarUsuario(record.correo)}
            onCancel={() => {}}
            okText="Sí"
            cancelText="No"
          >
            <Tooltip title="Restablecer la contraseña">
              <Tag color="gold">
                <a href="#">
                  <PoweroffOutlined />
                </a>
              </Tag>
            </Tooltip>
          </Popconfirm>
          <Popconfirm
            title="¿Estas seguro que quieres inhabilidar al usuario?"
            onConfirm={() => AccionesTablaUsuarios.inhabilitarUsuario(id)}
            onCancel={() => {}}
            okText="Sí"
            cancelText="No"
          >
            <Tooltip title="Inhabilitar usuario">
              <Tag color="red">
                <a href="#">
                  <UserDeleteOutlined />
                </a>
              </Tag>
            </Tooltip>
          </Popconfirm>
        </span>
      ),
      width: '15%',
    },
  ]
  return (
    <ACL roles={['ADMINISTRACION-USUARIOSLISTADO', 'ADMINISTRADOR']} redirect>
      <Titulo texto="Usuarios" />
      <Encabezado>Lista de usuarios</Encabezado>
      <Tarjeta>
        <TablaGeneral<UsuarioListado>
          columns={columns}
          fnPeticion={UsuarioPeticiones.listado}
          titulo="Usuarios"
          filters={{ estatusExtendido: ['activo'] }}
        />
      </Tarjeta>
    </ACL>
  )
}

export default UsuariosListado
