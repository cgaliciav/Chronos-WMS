import React, { useState } from 'react'
import Titulo from 'components/Titulo'
import { useNavigate } from 'react-router'
import { Divider } from 'antd'
import { notification } from 'helpers/feedback'
import ACL from 'app/auth/ACL'
import dayjs from 'dayjs'
import ProyectoPeticiones from 'services/axios/proyectos'
import FormaProyecto from '../componentes/forma'



const ProyectoNuevo = () =>{
  const [guardando,setGuardando]=useState(false);
  const navigate = useNavigate();

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
        navigate('/proyectos/listado')
        notification.success({
          title: 'Creado correctamente',
          description: 'El proyecto fue creado correctamente',
        })
      }
        
    } catch {
      // El interceptor de axios ya mostró el error.
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
        <Titulo texto="Nuevo proyecto" />
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
                  fecha:dayjs(),
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