import React, { useState } from 'react'
import Titulo from 'components/Titulo'
import { Popconfirm, Tag, Tooltip } from 'antd'
import { notification } from 'helpers/feedback'
import dayjs from 'dayjs'
import ACL from 'app/auth/ACL'
import GrupoPeticiones from 'services/axios/grupos'
import {
  obtenerPropsBusquedaInput,
} from 'pages/componentes/filtrosTablas'
// import UsuarioPeticiones from 'services/axios/usuarios'
import TablaListados from 'pages/operaciones/componentes/tablaListados'

// import AccionesTablasGrupos from 'pages/operaciones/componentes/accionesTablasGrupos'



const PrevioListado = () => {
  const [conteoRefresh, setConteoRefresh] = useState(0);

  const columns = [
    {
      title: 'Nombre',
      dataIndex: 'nombre',
      key: 'grupo.nombre',
      sorter: true,
      ...obtenerPropsBusquedaInput(),
    },
    {
      title: 'Fecha',
      dataIndex: 'fecha',
      key: 'grupo.fecha',
      sorter: true,
      render: fecha=>{
        return dayjs(fecha).format('D-MMM-YY HH:mm:ss')
      }
      // ...obtenerPropsBusquedaInput(),
    },
    {
      title: 'Proyecto',
      dataIndex: ['grupoDetalle','proyecto','nombre'],
      key: 'proyecto.nombre',
      sorter: true,
      ...obtenerPropsBusquedaInput(),
    },
    {
      title: '# movimientos',
      dataIndex: 'movimientosTotales',
    },
    {
      title: 'Acciones',
      dataIndex: 'id',
      render: (id, record) => (
        <span>
          <Tooltip title="Ver listado">
            <Tag color="blue">
              <a href={`#/previo/operacion?uid=${id}`}>
                <i className="icmn-pencil2" />
              </a>
            </Tag>
          </Tooltip>
          {record.movimientosTotales===0?(
            <Popconfirm
              title="¿Estas seguro que quieres eliminar el listado?"
              onConfirm={() => eliminarListado(id)}
              onCancel={() => {}}
              okText="Sí"
              cancelText="No"
            >
              <Tooltip title="Eliminar listado">
                <Tag color="red">
                  <a href="#">
                    <i className="icmn-bin" />
                  </a>
                </Tag>
              </Tooltip>
            </Popconfirm>
          ):(null)}
        </span>
      ),
      width: '15%',
    },
  ];

  const eliminarListado = id => {
    GrupoPeticiones.quitar({grupoId:id})
      .then((resp) => {
        if(resp!==undefined){
          notification.success({
            title: 'Grupo eliminado correctamente',
          })
          setConteoRefresh(conteoRefresh+1)
          // const navigate = useNavigate();
          // history.go(0)
          // document.location.reload()
        }
      })
      .catch(() => {}) // El interceptor de axios ya mostró el error.
      // .catch(error => {
      //   notification.error({
      //     message: error.message,
      //     // description: error.message,
      //   })
      // })
  }


  return (
    <ACL roles={['OPERACION-PREVIOPORGRUPO', 'ADMINISTRADOR']} redirect>
      <Titulo texto="Listado Previo" />
      <div className="kit__utils__heading">
        <h5>
          <span className="mr-3">Listados de Previo</span>
        </h5>
      </div>
      <div className="card">
        <div className="card-body">
          <TablaListados
            columns={columns}
            fnPeticion={GrupoPeticiones.listadoPorGrupo}
            // movimientoTipoId={11}
            titulo="Previos"
            conteoRefresh={conteoRefresh}
          />
        </div>
      </div>
    </ACL>
  )
}

export default PrevioListado
