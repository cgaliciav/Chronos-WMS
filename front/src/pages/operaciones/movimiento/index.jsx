import React, { useState, useEffect } from 'react';
import Titulo from 'components/Titulo'
import { useLocation } from 'react-router'
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

  // const navigate = useNavigate();

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
    .catch(() => {}) // El interceptor de axios ya mostró el error.
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
      <Titulo texto="Detalle movimientos" />
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
          <Tabs defaultActiveKey="comentariosMovimiento" size="small"
            items={[
              {
                key: 'historial',
                label: 'Historial',
                children: (
                  <>
              <Movimientos 
                inventarioActualId={inventarioActualId} 
                loading={cargando}
              />
                  </>
                ),
              },
              {
                key: 'comentariosMovimiento',
                label: 'Comentarios Movimiento',
                children: (
                  <>
              <Comentarios
                comentarios={comentariosMovimiento}
                loading={cargando}
                disabled={false}
                editar
                relacion="Operacion"
                relacionId={operacionId}
                fnActualizar={fnActualizar}
              />

                  </>
                ),
              },
              {
                key: 'archivosMovimiento',
                label: 'Archivos Movimiento',
                children: (
                  <>
              <SubirArchivos
                habilitado
                archivosIdsIniciales={archivosMovimiento}
                cargando={cargando}
                relacion="Operacion"
                relacionId={operacionId} 
              />
                  </>
                ),
              },
              {
                key: 'comentariosGrupo',
                label: 'Comentarios Grupo',
                disabled: grupoId===0,
                children: (
                  <>
              <Comentarios
                comentarios={comentariosGrupo}
                loading={cargando}
                disabled
              />
                  </>
                ),
              },
              {
                key: 'archivosGrupo',
                label: 'Archivos Grupo',
                disabled: grupoId===0,
                children: (
                  <>
              <SubirArchivos
                habilitado={false}
                archivosIdsIniciales={archivosGrupo}
                cargando={cargando}
              />
                  </>
                ),
              },
            ]}
          />
        </div>
      </div>
    </ACL>
   );
}
 
export default DetalleMovimiento;