import React, { useState } from 'react'
import { Helmet } from 'react-helmet'
import { useHistory } from 'react-router-dom'
import { notification } from 'antd'
// import QueryString from 'query-string'
import moment from 'moment'
import ACL from 'components/cleanui/system/ACL'
import GrupoPeticiones from 'services/axios/grupos'
import FormaConfiguracionGrupo from 'pages/operaciones/componentes/formaConfiguracionGrupo'

const DevolucionesNuevo = () => {
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
      usuariosResponsables:usuariosIds } = values;
    setGuardando(true);

    const resp = await GrupoPeticiones.nuevoConDetalles({
      nombre,
      proyectoId,
      movimientoTipoId:4, // devolucion
      usuariosIds:usuariosIds.map(usr=>usr.key)
      
    })
    if(resp!==undefined){
      // mandar a la edicion del grupo
      history.push(`/devoluciones/operacion?uid=${resp.id}`);
      notification.success({
        message: 'Listado creado correctamente',
      })
      
    }

    setGuardando(false);


  }

  // console.log("***********************USUARIO",usuario);
  return (
    <ACL roles={['DEVOLUCION-NUEVO', 'ADMINISTRADOR']} redirect>
      <Helmet title="Nuevo listado de devolución" />
      <div className="kit__utils__heading">
        <h5>
          <span className="mr-3">Nuevo listado de devoluciones</span>
        </h5>
      </div>
      <div className="card">
        <div className="card-body">
          <FormaConfiguracionGrupo 
            handleFinish={handleFinish} 
            guardando={guardando} 
            mostrarProyectosInternos
            // proyectosExternos
            mostrarUsuarios
            // proveedores
            // tipoFactura
            // fechaInicial
            // fechaFinal
            // bodega
            valoresIniciales={{nombre:moment().format('x')}} 
            botonTexto="Crear devolución"
            prefijoMovimiento='D'
          />
        </div>
      </div>
    </ACL>
  )
}

export default DevolucionesNuevo
