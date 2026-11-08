import React from 'react'
import Titulo from 'components/Titulo'
import { Popconfirm, Tag, Tooltip } from 'antd'
import ACL from 'components/cleanui/system/ACL'
import BodegaPeticiones from 'services/axios/bodegas'
import {
  obtenerPropsBusquedaCheck,
  obtenerPropsBusquedaInput,
} from '../../../componentes/filtrosTablas'
import TablaGeneral from '../../componentes/tablaGeneral'
import AccionesTablaAlmacenes from '../componentes/accionesTablaBodegas'

const columns = [
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
        <Tooltip title="Editar almacén">
          <Tag color="blue">
            <a href={`#/bodegas/editar?uid=${id}`}>
              <i className="icmn-pencil2" />
            </a>
          </Tag>
        </Tooltip>
        <Popconfirm
          title="¿Estas seguro que quieres inhabilitar area?"
          onConfirm={() => AccionesTablaAlmacenes.inhabilitarBodega(id)}
          onCancel={() => {}}
          okText="Sí"
          cancelText="No"
        >
          <Tooltip title="Inhabilitar area">
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

const AlmacenesListado = () => {
  return (
    <ACL roles={['BODEGA-LISTADO', 'ADMINISTRADOR']} redirect>
      <Titulo texto="Almacenes" />
      <div className="kit__utils__heading">
        <h5>
          <span className="mr-3">Lista de almacenes</span>
        </h5>
      </div>
      <div className="card">
        <div className="card-body">
          <TablaGeneral
            columns={columns}
            fnPeticion={BodegaPeticiones.listado}
            titulo="Almacenes"
          />
        </div>
      </div>
    </ACL>
  )
}

export default AlmacenesListado
