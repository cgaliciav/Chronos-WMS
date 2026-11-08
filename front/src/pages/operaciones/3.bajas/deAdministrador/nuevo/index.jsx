import React, { useState } from 'react'
import Titulo from 'components/Titulo'
import { useNavigate } from 'react-router'
import { notification } from 'helpers/feedback'
// import QueryString from 'query-string'
import dayjs from 'dayjs'
import ACL from 'app/auth/ACL'
import GrupoPeticiones from 'services/axios/grupos'
import FormaConfiguracionGrupo from 'pages/operaciones/componentes/formaConfiguracionGrupo'

const BajasSinProyectoNuevo = () => {
  const [guardando, setGuardando] = useState(false)

  const navigate = useNavigate();

  const handleFinish = async values => {
    // console.log(values)
    const { 
      nombre,
      proyectoInterno:proyectoId,
      // proyectoExterno,
      // bodega,
      // proveedor,
      // tipoFactura,
      // fechaInicio,
      // fechaFin,
      // usuariosResponsables:usuariosIds 
    } = values;
    setGuardando(true);

    try {
      const resp = await GrupoPeticiones.nuevoConDetalles({
        nombre,
        proyectoId,
        movimientoTipoId:17, // baja administrador
        // usuariosIds:usuariosIds.map(usr=>usr.key)
      
      })
      if(resp!==undefined){
        // mandar a la edicion del grupo
        navigate(`/bajas/sin-proyecto/operacion?uid=${resp.id}`);
        notification.success({
          title: 'Listado creado correctamente',
        })
      }
    } catch {
      // El interceptor de axios ya mostró el error.
    }

    setGuardando(false);

  }

  // console.log("***********************USUARIO",usuario);
  return (
    <ACL roles={['BAJASINRPOYECTO-NUEVO', 'ADMINISTRADOR']} redirect>
      <Titulo texto="Nuevo listado de bajas" />
      <div className="kit__utils__heading">
        <h5>
          <span className="mr-3">Nuevo listado de bajas sin Proyecto</span>
        </h5>
      </div>
      <div className="card">
        <div className="card-body">
          <FormaConfiguracionGrupo 
            handleFinish={handleFinish} 
            guardando={guardando} 
            // mostrarProyectosInternos
            // proyectosExternos
            // mostrarUsuarios
            // proveedores
            // tipoFactura
            // fechaInicial
            // fechaFinal
            // bodega
            valoresIniciales={{nombre:dayjs().format('x')}} 
            botonTexto="Crear baja sin proyecto"
          />
        </div>
      </div>
    </ACL>
  )
}

export default BajasSinProyectoNuevo
