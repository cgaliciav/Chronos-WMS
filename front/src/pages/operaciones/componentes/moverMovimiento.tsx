import { useState } from 'react'
import { Alert, Button, Modal, Popconfirm, Tag, type TableColumnsType } from 'antd'
import dayjs from 'dayjs'
import { notification } from 'helpers/feedback'
import GrupoPeticiones from 'services/axios/grupos'
import { obtenerPropsBusquedaInput } from 'pages/componentes/filtrosTablas'
import type { Grupo } from 'types/api'
import TablaListados from './tablaListados'

interface ModalMoverMovimientoProps {
  /** Movimiento que se mueve; `null` cierra la ventana. */
  movimientoId: number | null
  grupoOrigenId?: number
  /** Tipo del listado de origen; sin tipo (previos) se ofrecen los listados sin tipo. */
  movimientoTipoId?: number
  alCerrar: () => void
  alMover: () => void
}

/**
 * Ventana para elegir el listado al que se mueve un movimiento (decisión 25): solo listados del mismo tipo que ya
 * existan, de uno en uno. El movimiento toma el proyecto y los responsables del listado elegido.
 */
export const ModalMoverMovimiento = ({
  movimientoId,
  grupoOrigenId,
  movimientoTipoId,
  alCerrar,
  alMover,
}: ModalMoverMovimientoProps) => {
  const [moviendo, setMoviendo] = useState(false)

  const mover = async (destino: Grupo) => {
    if (movimientoId === null || grupoOrigenId === undefined) return
    try {
      setMoviendo(true)
      await GrupoPeticiones.moverMovimiento({
        movimientoId,
        grupoOrigenId,
        grupoDestinoId: destino.id,
      })
      notification.success({ title: `Movimiento movido al listado ${destino.nombre}` })
      alMover()
      alCerrar()
    } catch {
      // El interceptor de axios ya mostró el error.
    } finally {
      setMoviendo(false)
    }
  }

  const columns: TableColumnsType<Grupo> = [
    {
      title: 'Nombre',
      dataIndex: 'nombre',
      key: 'grupo.nombre',
      sorter: true,
      ...obtenerPropsBusquedaInput(),
    },
    {
      title: 'Fecha',
      dataIndex: 'fecha',
      key: 'grupo.fecha',
      sorter: true,
      render: (fecha: string) => dayjs(fecha).format('D-MMM-YY HH:mm'),
    },
    {
      title: 'Proyecto',
      dataIndex: ['grupoDetalle', 'proyecto', 'nombre'],
      key: 'proyecto.nombre',
      sorter: true,
      ...obtenerPropsBusquedaInput(),
    },
    {
      title: 'Responsables',
      key: 'responsables',
      render: (_: unknown, listado) =>
        (listado.grupoDetalle?.usuarios ?? []).map(usuario => usuario.nombre).join(', '),
    },
    {
      title: '',
      dataIndex: 'id',
      key: 'accion',
      width: 130,
      render: (id: number, listado) => {
        if (id === grupoOrigenId) return <Tag>Listado actual</Tag>
        if (listado.estatus !== 'activo') return <Tag color="orange">No activo</Tag>
        return (
          <Popconfirm
            title={`¿Mover el movimiento al listado ${listado.nombre}?`}
            okText="Sí, mover"
            cancelText="No"
            onConfirm={() => mover(listado)}
          >
            <Button type="primary" size="small" loading={moviendo}>
              Mover aquí
            </Button>
          </Popconfirm>
        )
      },
    },
  ]

  return (
    <Modal
      open={movimientoId !== null}
      title="Mover el movimiento a otro listado"
      width="70%"
      centered
      footer={null}
      onCancel={alCerrar}
      destroyOnHidden
    >
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 12 }}
        title="Elige un listado del mismo tipo. El movimiento tomará el proyecto y los responsables de ese listado."
      />
      <TablaListados
        columns={columns}
        fnPeticion={GrupoPeticiones.listadoPorGrupo}
        movimientoTipoId={movimientoTipoId}
        titulo="Listados"
      />
    </Modal>
  )
}

/**
 * Para las pantallas de operación: `moverMovimiento` va a la columna de acciones (`ColumnasOperaciones.funciones`) y
 * `modalMover` se pinta en la página. Tras mover se llama a `alMover` (recargar la tabla).
 */
export function useMoverMovimiento(
  grupo: { id?: number; grupoDetalle?: { movimientoTipo?: { id: number } } | null },
  alMover: () => void,
) {
  const [movimientoId, setMovimientoId] = useState<number | null>(null)
  const modalMover = (
    <ModalMoverMovimiento
      movimientoId={movimientoId}
      grupoOrigenId={grupo.id}
      movimientoTipoId={grupo.grupoDetalle?.movimientoTipo?.id}
      alCerrar={() => setMovimientoId(null)}
      alMover={alMover}
    />
  )
  return { moverMovimiento: (id: number) => setMovimientoId(id), modalMover }
}
