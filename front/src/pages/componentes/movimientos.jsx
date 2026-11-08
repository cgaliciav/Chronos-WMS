import React, { useState,useEffect } from 'react'
import { Table, Row, Tag, Descriptions } from 'antd'
import dayjs from 'dayjs'
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
      .catch(() => {}) // El interceptor de axios ya mostró el error.
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
        return dayjs(fecha).format('D-MMM-YYYY HH:mm')
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
                // antd 6: `items` en lugar de `Descriptions.Item` como hijos.
                items={[
                  { key: 'operacion', label: 'Operacion:', children: `${movimientoTipoNombre} (#${operacionId})` },
                  { key: 'fecha', label: 'Fecha:', children: dayjs(operacionFecha).format('D-MMM-YY HH:mm') },
                  proyecto && { key: 'proyecto', label: 'Proyecto:', children: <strong>{proyectoNombre}</strong> },
                  grupos.length > 0 && {
                    key: 'grupos',
                    label: 'Grupos:',
                    children: grupos.map(grp => <Tag key={grp.id}>{`${grp.nombre} (${grp.id})`}</Tag>),
                  },
                  { key: 'almacenista', label: 'Almacenista:', children: sesionUsuarioNombre },
                  {
                    key: 'responsables',
                    label: 'Responsables:',
                    children: usuariosResponsables.map(usr => usr.nombre).join(',  '),
                  },
                ].filter(Boolean)}
              />
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
