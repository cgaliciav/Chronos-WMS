import React, { useState } from 'react'
import Titulo from 'components/Titulo'
import { useNavigate } from 'react-router'
import { notification } from 'helpers/feedback'
// import QueryString from 'query-string'
import dayjs from 'dayjs'
import ACL from 'components/cleanui/system/ACL'
import GrupoPeticiones from 'services/axios/grupos'
import FormaConfiguracionGrupo from 'pages/operaciones/componentes/formaConfiguracionGrupo'

const AltaNuevo = () => {
  const [guardando, setGuardando] = useState(false)

  const navigate = useNavigate();

  const handleFinish = async values => {
    // console.log(values)
    const { 
      nombre,
      // proyectoInterno:proyectoId,
      // proyectoExterno:proyectoId,
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
        movimientoTipoId:14, // alta
      })
      if(resp!==undefined){
        // mandar a la edicion del grupo
        navigate(`/altas/operacion?uid=${resp.id}`);
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
    <ACL roles={['ALTA-NUEVO', 'ADMINISTRADOR']} redirect>
      <Titulo texto="Nuevo listado de altas" />
      <div className="kit__utils__heading">
        <h5>
          <span className="mr-3">Nuevo listado de altas</span>
        </h5>
      </div>
      <div className="card">
        <div className="card-body">
          <FormaConfiguracionGrupo 
            handleFinish={handleFinish} 
            guardando={guardando} 
            // proyectosInternos
            // proyectosExternos
            // usuarios
            // proveedores
            // tipoFactura
            // fechaInicial
            // fechaFinal
            // bodega
            valoresIniciales={{nombre:dayjs().format('x')}} 
            botonTexto="Crear alta"
            prefijoMovimiento='A'
          />
        </div>
      </div>
    </ACL>
  )
}

export default AltaNuevo
