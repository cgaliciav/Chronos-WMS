import React, { useState } from 'react'
import { Helmet } from 'react-helmet'
import { useHistory } from 'react-router-dom'
import { notification } from 'antd'
// import QueryString from 'query-string'
import moment from 'moment'
import ACL from 'components/cleanui/system/ACL'
import GrupoPeticiones from 'services/axios/grupos'
import FormaConfiguracionGrupo from 'pages/operaciones/componentes/formaConfiguracionGrupo'

const BajasSinProyectoNuevo = () => {
  const [guardando, setGuardando] = useState(false)

  const history = useHistory();

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

    const resp = await GrupoPeticiones.nuevoConDetalles({
      nombre,
      proyectoId,
      movimientoTipoId:17, // baja administrador
      // usuariosIds:usuariosIds.map(usr=>usr.key)
      
    })
    if(resp!==undefined){
      // mandar a la edicion del grupo
      history.push(`/bajas/sin-proyecto/operacion?uid=${resp.id}`);
      notification.success({
        message: 'Listado creado correctamente',
      })
    }

    setGuardando(false);

  }

  // console.log("***********************USUARIO",usuario);
  return (
    <ACL roles={['BAJASINRPOYECTO-NUEVO', 'ADMINISTRADOR']} redirect>
      <Helmet title="Nuevo listado de bajas" />
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
            valoresIniciales={{nombre:moment().format('x')}} 
            botonTexto="Crear baja sin proyecto"
          />
        </div>
      </div>
    </ACL>
  )
}

export default BajasSinProyectoNuevo
