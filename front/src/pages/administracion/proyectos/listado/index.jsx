import React from 'react'
import Titulo from 'components/Titulo'
import { Popconfirm, Tag, Tooltip } from 'antd'
import moment from 'moment'
import ACL from 'components/cleanui/system/ACL'
import ProyectosPeticiones from 'services/axios/proyectos'
import {
  obtenerPropsBusquedaCheck,
  obtenerPropsBusquedaInput,
} from '../../../componentes/filtrosTablas'
import TablaGeneral from '../../componentes/tablaGeneral'
import AccionesTablaProyectos from '../componentes/accionesTablaProyectos'
// import AccionesTablaUsuarios from "../../componentes/accionesTablaUsuarios";

const columns = [
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
    render: fechaInicio => moment(fechaInicio).format('DD/MMM/YY'),
    // ...obtenerPropsBusquedaInput(),
  },
  {
    title: 'Tipo',
    dataIndex: 'esExterno',
    sorter: true,
    render: (esExterno, record) => {
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
        <Tooltip title="Editar proyecto">
          <Tag color="blue">
            <a href={`#/proyectos/editar?uid=${id}`}>
              <i className="icmn-pencil2" />
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

const ProyectosListado = () => {
  return (
    <ACL roles={['PROYECTO-LISTADO', 'ADMINISTRADOR']} redirect>
      <Titulo texto="Proyectos" />
      <div className="kit__utils__heading">
        <h5>
          <span className="mr-3">Lista de proyectos</span>
        </h5>
      </div>
      <div className="card">
        <div className="card-body">
          <TablaGeneral
            columns={columns}
            fnPeticion={ProyectosPeticiones.listado}
            titulo="Proyectos"
          />
        </div>
      </div>
    </ACL>
  )
}

export default ProyectosListado
