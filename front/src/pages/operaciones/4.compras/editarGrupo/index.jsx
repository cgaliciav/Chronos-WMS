import React, { useState, useEffect } from 'react'
import Titulo from 'components/Titulo'
import { useNavigate, useLocation } from 'react-router'
import { notification } from 'antd'
import QueryString from 'query-string'
import moment from 'moment'
import ACL from 'components/cleanui/system/ACL'
import GrupoPeticiones from 'services/axios/grupos'
import FormaConfiguracionGrupo from 'pages/operaciones/componentes/formaConfiguracionGrupo'

const CompraEditarGrupo = () => {
  const [guardando, setGuardando] = useState(false)
  const [grupoId, setGrupoId] = useState(0)
  const [grupo, setGrupo] = useState({
    nombre: '',
    estatus: '',
    id: 0,
    grupoDetalle: {
      movimientoTipo: {
        id: 0,
        nombre: '',
      },
      proyecto: {
        id: 0,
        nombre: '',
        estatus: '',
      },
      usuarios: [],
      facturaDetalle: {
        proveedor: {
          id: 0,
        },
        tipoFactura: {
          id: 0,
        },
        fechaEmision: moment(),
      }
    },
  })
  const [cargando, setCargando] = useState(true)

  const navigate = useNavigate()

  const location = useLocation()

  const buscarGrupo = (id) => {
    if (id !== 0) {
      setCargando(true)
      GrupoPeticiones.obtenerId(id)
        .then(resp => {
          if (resp !== undefined) {
            console.log('*******************GRUPO', resp);
            setGrupo(resp)
          }
        })
        .catch(() => {})
        .finally(() => {
          setCargando(false)
        })
    }
  }

  useEffect(() => {
    const value = QueryString.parse(location.search.replace('?', ''))
    // console.log('*******************PARAMS', value);
    setGrupoId(value.uid)
  }, [location])

  useEffect(() => {
    // console.log('*******************GRUPOID', grupoId)
    buscarGrupo(grupoId)

  }, [grupoId])

  const handleFinish = async values => {
    const {
      nombre,
      proyectoInterno: proyectoId,
      proveedor: proveedorId,
      tipoFactura: facturaTipoId,
      fechaInicio: fechaEmision,
      usuariosResponsables: usuariosIds,
    } = values;
    console.log('***********VALORES', values);
    setGuardando(true);

    const newValues = {
      grupoId,
      numero: nombre,
      // movimientoTipoId: 15, // compra
      proyectoId,
      usuariosIds: usuariosIds.map(usr => usr.key),
      fechaEmision,
      total: 0.0,
      impuestos: 0.0,
      montoIngresado: 0.0,
      proveedorId: proveedorId.key,
      facturaTipoId,
    };

    console.log('***********VALORES', newValues);

    try {
      const resp = await GrupoPeticiones.editarConCompra(newValues);

      if (resp !== undefined) {
        // mandar a la edicion del grupo
        navigate(`/compras/operacion?uid=${grupoId}`)
        notification.success({
          message: 'Listado editado correctamente',
        })
      }
    } catch {
      // El interceptor de axios ya mostró el error.
    }

    setGuardando(false)
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
          {cargando && <div className="text-center">Cargando...</div>}
          {!cargando && (
            <FormaConfiguracionGrupo
              handleFinish={handleFinish}
              guardando={guardando}
              mostrarProyectosInternos
              mostrarUsuarios
              mostrarProveedores
              mostrarTipoFactura
              mostrarFechaInicial
              valoresIniciales={{ 
                nombre: grupo.nombre,
                proyectoInterno: grupo.grupoDetalle.proyecto.id,
                proveedor: {value:grupo.grupoDetalle.facturaDetalle.proveedor.id, label:grupo.grupoDetalle.facturaDetalle.proveedor.nombre},
                tipoFactura: grupo.grupoDetalle.facturaDetalle.facturaTipo.id,
                fechaInicio: moment(grupo.grupoDetalle.facturaDetalle.fechaEmision),
                usuariosResponsables: grupo.grupoDetalle.usuarios.map(usr => ({
                  key: usr.id,
                  label: usr.nombre,
                })),
              }}
              botonTexto="Editar factura"
              fechaInicialTexto="Fecha factura"
              textoNombre="Número Factura"
            />
          )}
        </div>
      </div>
    </ACL>
  )
}

export default CompraEditarGrupo
