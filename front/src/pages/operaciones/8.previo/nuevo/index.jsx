import React, { useState } from 'react'
import { Helmet } from 'react-helmet'
import { useHistory } from 'react-router-dom'
import { notification } from 'antd'
// import QueryString from 'query-string'
import moment from 'moment'
import ACL from 'components/cleanui/system/ACL'
import GrupoPeticiones from 'services/axios/grupos'
import FormaConfiguracionGrupo from 'pages/operaciones/componentes/formaConfiguracionGrupo'

const PrevioNuevo = () => {
  const [guardando, setGuardando] = useState(false)

  const history = useHistory();

  const handleFinish = async values => {
    console.log(values)
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

    const resp = await GrupoPeticiones.nuevo({
      nombre,
    })
    if(resp!==undefined){
      // mandar a la edicion del grupo
      history.push(`/previo/operacion?uid=${resp.id}`);
      notification.success({
        message: 'Listado creado correctamente',
      })
    }
    setGuardando(false);
  }

  // console.log("***********************USUARIO",usuario);
  return (
    <ACL roles={['PREVIO-NUEVO', 'ADMINISTRADOR']} redirect>
      <Helmet title="Nuevo listado de previo" />
      <div className="kit__utils__heading">
        <h5>
          <span className="mr-3">Nuevo listado de previo</span>
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
            valoresIniciales={{nombre:moment().format('x')}} 
            botonTexto="Crear"
          />
        </div>
      </div>
    </ACL>
  )
}

export default PrevioNuevo
