import React, { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet'
import { useHistory, useLocation, } from 'react-router-dom'
import {
  Button,
  Divider,
  notification,
  Row,
  
} from 'antd'
import QueryString from 'query-string'
import ACL from 'components/cleanui/system/ACL'
import Moment from 'moment'
import ProyectoPeticiones from 'services/axios/proyectos'
import FormaProyecto from '../componentes/forma'



const ProyectoEditar = () =>{
  const [guardando,setGuardando]=useState(false);
  const [id,setId]=useState(0);
  const [proyecto,setProyecto]=useState({nombre:"",descripcion:"",productor:"",fechaInicio:new Date(),esExterno:false,estatus:'inactivo'});
  const history = useHistory();
  const location = useLocation();
  // const params = useParams();
  // setId(params.id);

  useEffect( ( ) =>{
    // console.log('*******************LOCATION', location);
    const value= QueryString.parse(location.search.replace('?', ''));
    // console.log('*******************PARAMS', value);
    setId( value.uid )
  },[location]);

  useEffect(() =>{
    if(id !== 0){
      setGuardando(true)
      ProyectoPeticiones.obtenerId(id)
      .then( pry =>{
        if(pry!==undefined){
          setProyecto(pry);
          // console.log("proyecto*****",pry);
        }
      })
      .finally( () => {
        setGuardando(false);
      })
    }

  },[id])

  const handleFinish = async values => {
    try {
      setGuardando(true);
      // console.log("*******************************FINISH",values);
      const respuesta = await ProyectoPeticiones.editar({
        id,
        nombre: values.nombre,
        descripcion: values.descripcion,
        fechaInicio: values.fecha.format('YYYY-MM-DD HH:mm:ss'),
        productor: values.productor,
        esExterno: values.tipoProyecto==="externo",
      })
      if(respuesta!==undefined){
        // console.log("*******************************PROYECTO GUARDADO",respuesta);
        history.push('/proyectos/listado')
        notification.success({
          message: 'Actualizado correctamente',
          description: 'El proyecto fue actualizado correctamente',
        })
      }
        
    } finally {
      setGuardando(false);
    }
  }

  const handleEnable = e => {
    e.preventDefault();
    setGuardando(true);
    ProyectoPeticiones.habilitar(id)
    .then(resp=>{
      if(resp!==undefined){
        const {estatus,...restoProyecto}=proyecto;
        setProyecto({
          ...restoProyecto,
          estatus:'activo'
        });
        notification.success({
          message:"Proyecto habilitado correctamente"
        })
      }
    })
    .finally(()=>{
      setGuardando(false);
    })
  }

  const handleDisable = e =>{
    e.preventDefault();
    setGuardando(true);
    ProyectoPeticiones.inhabilitar(id)
    .then(resp=>{
      if(resp!==undefined){
        const {estatus,...restoProyecto}=proyecto;
        setProyecto({
          ...restoProyecto,
          estatus:'inactivo'
        });
        notification.warning({
          message:"Proyecto deshabilitado correctamente"
        });
      }
    })
    .finally(()=>{
      setGuardando(false);
    })

  }


//   console.log("***********************USUARIO",usuario);
    return (
      <ACL
        roles={["PROYECTO-EDITAR","ADMINISTRADOR"]}
        redirect
      >
        <Helmet title="Nuevo usuario" />
        <div className="kit__utils__heading">
          <h5>
            <span className="mr-3">Editar Proyecto</span>
          </h5>
        </div>
        <div className="card">
          <div className="card-header">
            <Row justify="end" type="flex">
              <Button
                type={proyecto.estatus!=="inactivo"?"default":"primary"}
                danger={proyecto.estatus!=="inactivo"}
                onClick={proyecto.estatus!=="inactivo"?handleDisable:handleEnable}
              > 
                {proyecto.estatus!=="inactivo"?"Deshabilitar":"Habilitar"} 
              </Button>
            </Row>
          </div>
          <div className="card-body">
            <FormaProyecto 
              handleFinish={handleFinish}
              guardando={guardando}
              habilitado={proyecto.estatus!=="inactivo"}
              valores={{
                nombre:proyecto.nombre,
                descripcion:proyecto.descripcion,
                fecha:Moment(proyecto.fechaInicio),
                productor:proyecto.productor,
                tipoProyecto:proyecto.esExterno?"externo":"interno",
              }}
            />
            <Divider />
          </div>
        </div>
        
      </ACL>
    )

}

export default ProyectoEditar