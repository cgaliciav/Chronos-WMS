import { useState, useEffect } from 'react'
import { Table, Row, Tag, Descriptions, type DescriptionsProps, type TableColumnsType } from 'antd'
import dayjs from 'dayjs'
import MovimientoPeticiones from 'services/axios/movimientos'
import type { MovimientoHistorial } from './tipos'

type ElementoDescripcion = NonNullable<DescriptionsProps['items']>[number]

export interface MovimientosProps {
  /** Inventario actual cuyo historial se muestra; con `0` no se pide nada. */
  inventarioActualId: number | string
  loading?: boolean
}

const Movimientos = ({ inventarioActualId, loading = false }: MovimientosProps) => {
  const [habilitadoInterno, setHabilitadoInterno] = useState(true)
  const [listadoMovimientos, setListadoMovimientos] = useState<MovimientoHistorial[]>([])

  useEffect(() => {
    if (inventarioActualId !== 0) {
      setHabilitadoInterno(false)
      MovimientoPeticiones.obtenerHistorial(inventarioActualId)
        .then(resp => {
          if (resp !== undefined) {
            // Este endpoint carga operación (con usuarios y proyecto), grupos y sesión de cada movimiento.
            setListadoMovimientos(resp as MovimientoHistorial[])
          }
        })
        .catch(() => {}) // El interceptor de axios ya mostró el error.
        .finally(() => {
          setHabilitadoInterno(true)
        })
    }
  }, [inventarioActualId])

  const cargando = loading || !habilitadoInterno

  const columns: TableColumnsType<MovimientoHistorial> = [
    {
      dataIndex: ['operacion', 'fecha'],
      align: 'right',
      render: (fecha: string | undefined) => dayjs(fecha).format('D-MMM-YYYY HH:mm'),
    },
    {
      dataIndex: ['operacion', 'proyecto', 'nombre'],
    },
    {
      dataIndex: ['operacion', 'movimientoTipo', 'nombre'],
    },
  ]

  return (
    <Row style={{ width: '90%', margin: 'auto' }}>
      <Table
        bordered
        size="small"
        showHeader={false}
        columns={columns}
        dataSource={listadoMovimientos}
        expandable={{
          expandedRowRender: record => {
            // TODO: PONER ALMACENISTAS RESPONSABLES PROYECTO Y GRUPO... PONERLO EN EL CONTAINER Y SUBIRLA AL SERVER.. PROBAR. W
            const {
              operacion: {
                id: operacionId,
                fecha: operacionFecha,
                movimientoTipo: { nombre: movimientoTipoNombre },
                usuarios: usuariosResponsables,
                proyecto,
              },
              grupos,
              sesion: {
                usuario: { nombre: sesionUsuarioNombre },
              },
            } = record
            const elementos: Array<ElementoDescripcion | false | undefined> = [
              {
                key: 'operacion',
                label: 'Operacion:',
                children: `${movimientoTipoNombre} (#${operacionId})`,
              },
              {
                key: 'fecha',
                label: 'Fecha:',
                children: dayjs(operacionFecha).format('D-MMM-YY HH:mm'),
              },
              proyecto && {
                key: 'proyecto',
                label: 'Proyecto:',
                children: <strong>{proyecto.nombre}</strong>,
              },
              grupos.length > 0 && {
                key: 'grupos',
                label: 'Grupos:',
                children: grupos.map(grp => <Tag key={grp.id}>{`${grp.nombre} (${grp.id})`}</Tag>),
              },
              { key: 'almacenista', label: 'Almacenista:', children: sesionUsuarioNombre },
              {
                key: 'responsables',
                label: 'Responsables:',
                children: usuariosResponsables.map(usr => usr.nombre).join(',  '),
              },
            ]
            return (
              <Descriptions
                size="small"
                bordered
                column={{ lg: 1, md: 1, sm: 1, xs: 1 }}
                items={elementos.filter((elemento): elemento is ElementoDescripcion =>
                  Boolean(elemento),
                )}
              />
            )
          },
        }}
        rowKey={record => `${record.id}`}
        loading={cargando}
      />
    </Row>
  )
}

export default Movimientos
