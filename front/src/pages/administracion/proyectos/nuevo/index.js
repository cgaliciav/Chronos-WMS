import React, { useState } from 'react'
import { Helmet } from 'react-helmet'
import { useHistory } from 'react-router-dom'
import {
  Divider,
  notification
} from 'antd'
import ACL from 'components/cleanui/system/ACL'
import Moment from 'moment'
import ProyectoPeticiones from 'services/axios/proyectos'
import FormaProyecto from '../componentes/forma'



const ProyectoNuevo = () =>{
  const [guardando,setGuardando]=useState(false);
  const history = useHistory();

  const handleFinish = async values => {
    try {
      setGuardando(true);
    //   console.log("*******************************FINISH",values);
      const respuesta = await ProyectoPeticiones.nuevo({
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
          message: 'Creado correctamente',
          description: 'El proyecto fue creado correctamente',
        })
      }
        
    } finally {
      setGuardando(false);
    }
  }


  // console.log("***********************BODEGAS",interno,externo)
    return (
      <ACL
        roles={["PROYECTO-NUEVO","ADMINISTRADOR"]}
        redirect
      >
        <Helmet title="Nuevo proyecto" />
        <div className="kit__utils__heading">
          <h5>
            <span className="mr-3">Nuevo Proyecto</span>
          </h5>
        </div>
        <div className="card">
          <div className="card-body">
            <FormaProyecto 
              handleFinish={handleFinish}
              guardando={guardando}
              habilitado
              valoresIniciales={{
                  productor:".",
                  fecha:Moment(),
                  descripcion:"-",
                  tipoProyecto:"interno",
              }}
            />
            <Divider />
          </div>
        </div>
        
      </ACL>
    )

}

export default ProyectoNuevo