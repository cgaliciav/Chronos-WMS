import React from 'react'
import { Helmet } from 'react-helmet'
import { Popconfirm, Tag, Tooltip } from 'antd'
import ACL from 'components/cleanui/system/ACL'
import {
  obtenerPropsBusquedaCheck,
  obtenerPropsBusquedaInput,
} from 'pages/componentes/filtrosTablas'
import TablaGeneral from 'pages/administracion/componentes/tablaGeneral'
import UsuarioPeticiones from 'services/axios/usuarios'
import AccionesTablaUsuarios from '../componentes/accionesTablaUsuarios'



const UsuariosListado = () => {
  const columns = [
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
      render: (estatusEx, record) => {
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
      // filters: [{ text: 'Male', value: 'male' }, { text: 'Female', value: 'female' }],
      width: '15%',
      filteredValue: ['activo'],
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
      render: (id, record) => (
        <span>
          <Tooltip title="Editar usuario">
            <Tag color="blue">
              <a href={`#/usuarios/editar?uid=${id}`}>
                <i className="icmn-pencil2" />
              </a>
            </Tag>
          </Tooltip>
          <Popconfirm
            title="¿Estas seguro que quieres cambiar la contraseña del usuario?"
            onConfirm={() => AccionesTablaUsuarios.regenerarUsuario(record.correo, id)}
            onCancel={() => { }}
            okText="Sí"
            cancelText="No"
          >
            <Tooltip title="Restablecer la contraseña">
              <Tag color="gold">
                <a href="#">
                  <i className="icmn-power" />
                </a>
              </Tag>
            </Tooltip>
          </Popconfirm>
          <Popconfirm
            title="¿Estas seguro que quieres inhabilidar al usuario?"
            onConfirm={() => AccionesTablaUsuarios.inhabilitarUsuario(id)}
            onCancel={() => { }}
            okText="Sí"
            cancelText="No"
          >
            <Tooltip title="Inhabilitar usuario">
              <Tag color="red">
                <a href="#">
                  <i className="icmn-user-minus" />
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
      <Helmet title="Usuarios" />
      <div className="kit__utils__heading">
        <h5>
          <span className="mr-3">Lista de usuarios</span>
        </h5>
      </div>
      <div className="card">
        <div className="card-body">
          <TablaGeneral
            columns={columns}
            fnPeticion={UsuarioPeticiones.listado}
            titulo="Usuarios"
            filters={{ estatusExtendido: ['activo']}}
          />
        </div>
      </div>
    </ACL>
  )
}

export default UsuariosListado
