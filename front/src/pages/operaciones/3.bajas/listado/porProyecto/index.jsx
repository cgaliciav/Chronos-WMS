import React, { useState } from 'react'
import Titulo from 'components/Titulo'
// import { Tag, Tooltip } from 'antd'
// import moment from 'moment'
import ACL from 'app/auth/ACL'
import GrupoPeticiones from 'services/axios/grupos'
// import {
//   obtenerPropsBusquedaInput,
// } from 'pages/componentes/filtrosTablas'
// import UsuarioPeticiones from 'services/axios/usuarios'
import TablaListadosPorProyecto from 'pages/operaciones/componentes/tablaListadosPorProyecto'
import FormaBusquedaPorProyecto from 'pages/operaciones/componentes/formaBusquedaPorProyecto'
import ColumnasOperaciones from 'pages/operaciones/componentes/columnasTablaOperaciones'
import ModalImagenes from 'pages/componentes/modalImagenes'

// import AccionesTablasGrupos from 'pages/operaciones/componentes/accionesTablasGrupos'



const BajasListadoPorProyecto = () => {
  const [proyectoId, setProyectoId] = useState(0);
  const [usuariosIds, setUsuariosIds] = useState([]);
  const [areasIds, setAreasIds] = useState([]);
  const [bodegasIds, setBodegasIds] = useState([]);
  const [archivosImagenes, setArchivosImagenes] = useState([])
  const [mostrarModalImagenes, setMostrarModalImagenes] = useState(false)
  const [conteoRefresh, setConteoRefresh] = useState(0);

  const columns = [
    ColumnasOperaciones.foto(setArchivosImagenes, setMostrarModalImagenes),
    ColumnasOperaciones.producto,
    ColumnasOperaciones.clave,
    ColumnasOperaciones.almacen,
    ColumnasOperaciones.operacion,
    ColumnasOperaciones.almacenista,
    ColumnasOperaciones.funciones(),
  ]

  const handleFinish = valores =>{
    
    // console.log(valores)
    const {proyectoInterno,usuarios,areas,bodegas}=valores;

    setProyectoId(proyectoInterno);
    setUsuariosIds(usuarios?usuarios.map(usuario=>usuario.value):[]);
    setAreasIds(areas);
    setBodegasIds(bodegas);
    setConteoRefresh(conteoRefresh+1);
  }

  return (
    <ACL roles={['OPERACION-BAJASPORPROYECTO', 'ADMINISTRADOR']} redirect>
      <Titulo texto="Listado Bajas" />
      <div className="kit__utils__heading">
        <h5>
          <span className="mr-3">Listados Bajas Por Proyecto</span>
        </h5>
      </div>
      <div className="card">
        <div className="card-body">
          <FormaBusquedaPorProyecto
            mostrarProyectosInternos
            mostrarAreas
            mostrarBodegas
            mostrarUsuarios
            handleFinish={handleFinish}
            cargando={false}
            habilitado
          />
          <TablaListadosPorProyecto
            columns={columns}
            fnPeticion={GrupoPeticiones.listadoPorProyecto}
            movimientoTipoId={[13,16,5]}
            proyectoId={proyectoId}
            usuariosIds={usuariosIds}
            areasIds={areasIds}
            bodegasIds={bodegasIds}
            titulo="Bajas"
            conteoRefresh={conteoRefresh}
            movimientoTipoNombre="BAJAS"
            activos={false}

          />
        </div>
      </div>
      <ModalImagenes
        mostrarModal={mostrarModalImagenes}
        cerrarModal={() => {
          setMostrarModalImagenes(false)
        }}
        archivos={archivosImagenes}
      />
    </ACL>
  )
}

export default BajasListadoPorProyecto
