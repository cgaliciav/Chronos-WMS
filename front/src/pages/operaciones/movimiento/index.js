import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet'
import { useLocation } from 'react-router-dom'
import QueryString from 'query-string'
import { Row, Divider, Col, Typography, Tabs } from 'antd'
import ACL from 'components/cleanui/system/ACL'
import MovimientoPeticiones from 'services/axios/movimientos'
import SubirArchivos from 'pages/componentes/subirArchivos';
import Comentarios from 'pages/componentes/comentarios';
import Movimientos from 'pages/componentes/movimientos';
import ArticuloMovimiento from '../componentes/articuloMovimiento';


const DetalleMovimiento = () => {
  const [movimientoId, setMovimientoId] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [movimiento, setMovimiento] = useState({
    id:0,
    grupos:[{
      id:0,
      comentarios:[],
      archivos:[],
    }],
    operacion:{
      id:0,
      comentarios:[],
      archivos:[],
      movimientoTipo:{
        nombre:''
      }
    },
    inventarioActual:{
      id:0
    }
  });

  const location = useLocation();

  // const hystory = useHistory();

  useEffect(() => {
    // console.log('*******************LOCATION', location)
    const value = QueryString.parse(location.search.replace('?', ''))
    // console.log('*******************PARAMS', value);
    setMovimientoId(value.uid)
  }, [location])

  useEffect(() => {
    // console.log('*******************GRUPOID', grupoId)
    if(movimientoId!==0){
      fnActualizar();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movimientoId]);

  
  const fnActualizar = ( ) =>{
    setCargando(true);
    MovimientoPeticiones.obtenerId(movimientoId)
    .then(resp=>{
      if(resp!==undefined){
        // console.log('*********************movimiento',resp);
        setMovimiento(resp);
      }
    })
    .finally(()=>{
      setCargando(false);
    });
  }

  const {
    grupos,
    operacion:{
      id:operacionId,
      comentarios:comentariosMovimiento,
      archivos:archivosMovimiento,
      movimientoTipo:{
        nombre:movimientoNombre
      }
    },
    inventarioActual:{
      id:inventarioActualId
    }
  }=movimiento;

  if(grupos.length===0){
    grupos.push({
      id:0,
      comentarios:[],
      archivos:[],
    })
  }
  
  const [{
    id:grupoId, 
    comentarios:comentariosGrupo=[],
    archivos:archivosGrupo=[],
  }]=grupos
  

  console.log('inventarioActual',movimiento.inventarioActual)
  return ( 
    <ACL roles={['DETALLE-MOVIMIENTO', 'ADMINISTRADOR']} redirect>
      <Helmet title="Detalle movimientos" />
      <div className="kit__utils__heading">
        <h5>
          <span className="mr-3">Detalle movimiento</span>
        </h5>
      </div>
      <div className="card">
        <div className="card-header">
          <Row justify="center" align="middle">
            <Col span={24}>
              <Typography.Title style={{ margin: '0' }} level={3}>
                {movimientoNombre}
              </Typography.Title>
            </Col>
          </Row>
        </div>
        <div className="card-body">
          {movimiento.id!==0?(
            <ArticuloMovimiento 
              loading={cargando}
              movimiento={movimiento}
            />
          ):(null)}
          <Divider />
          <Tabs defaultActiveKey="comentariosMovimiento" size="small">
            <Tabs.TabPane tab="Historial" key="historial">
              <Movimientos 
                inventarioActualId={inventarioActualId} 
                loading={cargando}
              />
            </Tabs.TabPane> 
            <Tabs.TabPane tab="Comentarios Movimiento" key="comentariosMovimiento">
              <Comentarios
                comentarios={comentariosMovimiento}
                loading={cargando}
                disabled={false}
                editar
                relacion="Operacion"
                relacionId={operacionId}
                fnActualizar={fnActualizar}
              />

            </Tabs.TabPane> 
            <Tabs.TabPane tab="Archivos Movimiento" key="archivosMovimiento">
              <SubirArchivos
                habilitado
                archivosIdsIniciales={archivosMovimiento}
                cargando={cargando}
                relacion="Operacion"
                relacionId={operacionId} 
              />
            </Tabs.TabPane> 
            <Tabs.TabPane tab="Comentarios Grupo" key="comentariosGrupo" disabled={grupoId===0}>
              <Comentarios
                comentarios={comentariosGrupo}
                loading={cargando}
                disabled
              />
            </Tabs.TabPane> 
            <Tabs.TabPane tab="Archivos Grupo" key="archivosGrupo" disabled={grupoId===0}>
              <SubirArchivos
                habilitado={false}
                archivosIdsIniciales={archivosGrupo}
                cargando={cargando}
              />
            </Tabs.TabPane> 
          </Tabs>
        </div>
      </div>
    </ACL>
   );
}
 
export default DetalleMovimiento;