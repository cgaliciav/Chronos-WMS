import React, { useState,useEffect } from 'react'
import { Table, Row, Tag, Descriptions } from 'antd'
import moment from 'moment'
import 'moment/locale/es'
import MovimientoPeticiones from 'services/axios/movimientos'

// import ACL from 'components/cleanui/system/ACL';

const Movimientos = ({ 
  inventarioActualId,
  loading,
 }) => {
  const [habilitadoInterno, setHabilitadoInterno] = useState(true)
  const [listadoMovimientos, setListadoMovimientos] = useState([]);

  useEffect(() => {
    if(inventarioActualId!==0){
      setHabilitadoInterno(false);
      MovimientoPeticiones.obtenerHistorial(inventarioActualId)
      .then((resp)=>{

        if(resp!==undefined){
          // console.log('---------------setListadoMovimientos',resp)
          setListadoMovimientos(resp);
        }
      })
      .finally(()=>{
        setHabilitadoInterno(true);
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inventarioActualId]);

  const cargando = loading || !habilitadoInterno



  const columns = [
    {
      dataIndex: ['operacion','fecha'],
      align: 'right',
      render: fecha => {
        moment.locale('es');
        return moment(fecha).format('D-MMM-YYYY HH:mm')
      },
    },
    { 
      dataIndex: ['operacion','proyecto','nombre'] 
    },
    { 
      dataIndex: ['operacion','movimientoTipo','nombre'] 
    },
  ]

  // console.log("movimientos",listadoMovimientos);

  return (
    <Row style={{ width: '90%', margin: 'auto' }}>
      <Table
        bordered
        size="small"
        showHeader={false}
        columns={columns}
        dataSource={listadoMovimientos}
        expandable={{
          expandedRowRender:record => {
            console.log("movimiento",record)
            // const 
            // TODO: PONER ALMACENISTAS RESPONSABLES PROYECTO Y GRUPO... PONERLO EN EL CONTAINER Y SUBIRLA AL SERVER.. PROBAR. W
            const {
              operacion:{
                id:operacionId,
                fecha:operacionFecha,
                movimientoTipo:{
                  nombre:movimientoTipoNombre
                },
                usuarios:usuariosResponsables,
                proyecto,
              },
              grupos,
              sesion:{
                usuario:{
                  nombre:sesionUsuarioNombre
                }
              }
            }=record;
            const {
              nombre:proyectoNombre,
            } = proyecto;
            // } = proyecto??{nombre:''};
            return (
              // <p>Hola mundo</p>
              <Descriptions 
                size="small"
                bordered
                column={{ lg: 1, md: 1, sm: 1, xs: 1 }}
              >
                <Descriptions.Item label="Operacion:">{`${movimientoTipoNombre} (#${operacionId})`}</Descriptions.Item>
                <Descriptions.Item label="Fecha:">{moment(operacionFecha).format('D-MMM-YY HH:mm') }</Descriptions.Item>
                {proyecto ? (
                  <Descriptions.Item label="Proyecto:"><strong>{proyectoNombre}</strong></Descriptions.Item>
                ):( null )}
                {grupos.length>0?(
                  <Descriptions.Item label="Grupos:">{grupos.map(grp=>(<Tag key={`${Math.random()}`}>{`${grp.nombre} (${grp.id})`}</Tag>))}</Descriptions.Item>
                ):( null )}
                <Descriptions.Item label="Almacenista:">{sesionUsuarioNombre}</Descriptions.Item>
                <Descriptions.Item label="Responsables:">{usuariosResponsables.map(usr=>usr.nombre).join(',  ')}</Descriptions.Item>
              </Descriptions>
            )
          },
        }}
        rowKey={(record) => `${record.id}`}
        loading={cargando}
      />

    </Row>
  )
}

export default Movimientos
