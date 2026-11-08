import React, { useState } from 'react'
import Titulo from 'components/Titulo'
import { useNavigate } from 'react-router'
import { notification } from 'antd'
// import QueryString from 'query-string'
import moment from 'moment'
import ACL from 'components/cleanui/system/ACL'
import GrupoPeticiones from 'services/axios/grupos'
import FormaConfiguracionGrupo from 'pages/operaciones/componentes/formaConfiguracionGrupo'

const CompraNuevo = () => {
  const [guardando, setGuardando] = useState(false)

  const navigate = useNavigate();

  const handleFinish = async values => {
    // console.log(values)
    // const{nombre,}
    const { 
      nombre,
      proyectoInterno:proyectoId,
      // proyectoExterno:proyectoId,
      // bodega,
      proveedor:proveedorId,
      tipoFactura:facturaTipoId,
      fechaInicio:fechaEmision,
      // fechaFin,
      usuariosResponsables:usuariosIds 
    } = values;
    setGuardando(true);

    try {
      const resp = await GrupoPeticiones.nuevoConCompra({
        nombre,
        numero:nombre,
        movimientoTipoId:15, // compra
        proyectoId,
        usuariosIds:usuariosIds.map(usr=>usr.key),
        fechaEmision,
        total:0.0,
        impuestos:0.0,
        montoIngresado:0.0,
        proveedorId:proveedorId.key,
        facturaTipoId
      })

      if(resp!==undefined){
        // mandar a la edicion del grupo
        navigate(`/compras/operacion?uid=${resp.id}`);
        notification.success({
          message: 'Listado creado correctamente',
        })
      }
    } catch {
      // El interceptor de axios ya mostró el error.
    }

    setGuardando(false);


  }

  // console.log("***********************USUARIO",usuario);
  return (
    <ACL roles={['COMPRAS-NUEVO', 'ADMINISTRADOR']} redirect>
      <Titulo texto="Nuevo listado de compras" />
      <div className="kit__utils__heading">
        <h5>
          <span className="mr-3">Nuevo listado de compras</span>
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
            mostrarProveedores
            mostrarTipoFactura
            mostrarFechaInicial
            // fechaFinal
            // mostrarBodega
            valoresIniciales={{nombre:moment().format('x')}} 
            botonTexto="Crear factura"
            fechaInicialTexto="Fecha factura"
            textoNombre="Número Factura"
            prefijoMovimiento='C'
          />
        </div>
      </div>
    </ACL>
  )
}

export default CompraNuevo
