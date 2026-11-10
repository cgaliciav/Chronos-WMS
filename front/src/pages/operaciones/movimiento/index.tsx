import { useState, useEffect } from 'react'
import { useLocation } from 'react-router'
import QueryString from 'query-string'
import { Divider, Typography, Tabs } from 'antd'
import Titulo from 'components/Titulo'
import Encabezado from 'components/ui/Encabezado'
import Tarjeta from 'components/ui/Tarjeta'
import ACL from 'app/auth/ACL'
import MovimientoPeticiones from 'services/axios/movimientos'
import SubirArchivos from 'pages/componentes/subirArchivos'
import Comentarios from 'pages/componentes/comentarios'
import Movimientos from 'pages/componentes/movimientos'
import ArticuloMovimiento from '../componentes/articuloMovimiento'
import type { MovimientoOperacion } from '../tipos'

const DetalleMovimiento = () => {
  const [movimientoId, setMovimientoId] = useState<number | string>(0)
  const [cargando, setCargando] = useState(true)
  /** `null` hasta recibir el movimiento. */
  const [movimiento, setMovimiento] = useState<MovimientoOperacion | null>(null)

  const location = useLocation()

  useEffect(() => {
    const { uid } = QueryString.parse(location.search.replace('?', ''))
    setMovimientoId(typeof uid === 'string' ? uid : 0)
  }, [location])

  const fnActualizar = () => {
    setCargando(true)
    MovimientoPeticiones.obtenerId(movimientoId)
      .then(resp => {
        if (resp !== undefined) {
          setMovimiento(resp)
        }
      })
      .catch(() => {}) // El interceptor de axios ya mostró el error.
      .finally(() => {
        setCargando(false)
      })
  }

  useEffect(() => {
    if (movimientoId !== 0) {
      fnActualizar()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movimientoId])

  const operacion = movimiento?.operacion
  const operacionId = operacion?.id ?? 0
  const comentariosMovimiento = operacion?.comentarios ?? []
  const archivosMovimiento = operacion?.archivos ?? []
  const movimientoNombre = operacion?.movimientoTipo.nombre ?? ''
  const inventarioActualId = movimiento?.inventarioActual?.id ?? 0

  // Sin grupos se usa un grupo vacío (id 0) y se desactivan sus pestañas.
  const grupo = movimiento?.grupos?.[0]
  const grupoId = grupo?.id ?? 0
  const comentariosGrupo = grupo?.comentarios ?? []
  const archivosGrupo = grupo?.archivos ?? []

  return (
    <ACL roles={['DETALLE-MOVIMIENTO', 'ADMINISTRADOR']} redirect>
      <Titulo texto="Detalle movimientos" />
      <Encabezado>Detalle movimiento</Encabezado>
      <Tarjeta
        title={
          <Typography.Title style={{ margin: '0' }} level={3}>
            {movimientoNombre}
          </Typography.Title>
        }
      >
        {movimiento && movimiento.id !== 0 ? (
          <ArticuloMovimiento loading={cargando} movimiento={movimiento} />
        ) : null}
        <Divider />
        <Tabs
          defaultActiveKey="comentariosMovimiento"
          size="small"
          items={[
            {
              key: 'historial',
              label: 'Historial',
              children: <Movimientos inventarioActualId={inventarioActualId} loading={cargando} />,
            },
            {
              key: 'comentariosMovimiento',
              label: 'Comentarios Movimiento',
              children: (
                <Comentarios
                  comentarios={comentariosMovimiento}
                  loading={cargando}
                  disabled={false}
                  editar
                  relacion="Operacion"
                  relacionId={operacionId}
                  fnActualizar={fnActualizar}
                />
              ),
            },
            {
              key: 'archivosMovimiento',
              label: 'Archivos Movimiento',
              children: (
                <SubirArchivos
                  habilitado
                  archivosIdsIniciales={archivosMovimiento}
                  cargando={cargando}
                  relacion="Operacion"
                  relacionId={operacionId}
                />
              ),
            },
            {
              key: 'comentariosGrupo',
              label: 'Comentarios Grupo',
              disabled: grupoId === 0,
              children: <Comentarios comentarios={comentariosGrupo} loading={cargando} disabled />,
            },
            {
              key: 'archivosGrupo',
              label: 'Archivos Grupo',
              disabled: grupoId === 0,
              children: (
                <SubirArchivos
                  habilitado={false}
                  archivosIdsIniciales={archivosGrupo}
                  cargando={cargando}
                />
              ),
            },
          ]}
        />
      </Tarjeta>
    </ACL>
  )
}

export default DetalleMovimiento
