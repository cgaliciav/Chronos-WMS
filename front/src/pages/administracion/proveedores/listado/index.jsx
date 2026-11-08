import React from 'react'
import Titulo from 'components/Titulo'
import { Popconfirm, Tag, Tooltip } from 'antd'
import ACL from 'components/cleanui/system/ACL'
import ProveedoresPeticiones from 'services/axios/proveedores'
import {
  obtenerPropsBusquedaCheck,
  obtenerPropsBusquedaInput,
} from '../../../componentes/filtrosTablas'
import TablaGeneral from '../../componentes/tablaGeneral'
import AccionesTablaProveedores from '../componentes/accionesTablaProveedores'
// import AccionesTablaUsuarios from "../../componentes/accionesTablaUsuarios";

const columns = [
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
    // render: fechaInicio => dayjs(fechaInicio).format("DD/MMM/YY")
    ...obtenerPropsBusquedaInput(),
  },
  {
    title: 'Estado',
    dataIndex: 'estatus',
    sorter: true,
    render: (estatus, record) => {
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
    // filters: [{ text: 'Male', value: 'male' }, { text: 'Female', value: 'female' }],
    width: '15%',
  },
  {
    title: 'Acciones',
    dataIndex: 'id',
    render: id => (
      <span>
        <Tooltip title="Editar proveedor">
          <Tag color="blue">
            <a href={`#/proveedores/editar?uid=${id}`}>
              <i className="icmn-pencil2" />
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
                <i className="icmn-blocked" />
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
      <div className="kit__utils__heading">
        <h5>
          <span className="mr-3">Lista de proveedores</span>
        </h5>
      </div>
      <div className="card">
        <div className="card-body">
          <TablaGeneral
            columns={columns}
            fnPeticion={ProveedoresPeticiones.listado}
            titulo="Proveedores"
          />
        </div>
      </div>
    </ACL>
  )
}

export default ProveedoresListado
