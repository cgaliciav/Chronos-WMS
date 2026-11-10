import { useEffect, useState, type MouseEvent } from 'react'
import { Table, Dropdown, Button, Tag, type TableProps } from 'antd'
import { PrinterFilled, DownOutlined } from '@ant-design/icons'
import { notification } from 'helpers/feedback'
import ReportePeticiones from 'services/axios/reportes'
import type { ParametrosTabla } from 'types/api'
import UltimoArticuloAgregado from './ultimoArticuloAgregado'
import DetalleArticuloOperacionTabla from './detalleArticuloOperacionTabla'
import type { MovimientoOperacion, PaginacionTabla, TablaOperacionesProps } from '../tipos'
import EncabezadoTabla from 'components/ui/EncabezadoTabla'

export type { TablaOperacionesProps } from '../tipos'

interface ParametrosReporte {
  sortField: ParametrosTabla['sortField']
  sortOrder: ParametrosTabla['sortOrder']
  filters: ParametrosTabla['filters']
}

const TablaOperaciones = ({
  titulo,
  columns,
  fnPeticion,
  grupoId,
  conteoRefresh,
  grupoNombre,
  movimientoTipoNombre,
}: TablaOperacionesProps) => {
  const [dataTable, setDataTable] = useState<MovimientoOperacion[]>([])
  const [pagination, setPagination] = useState<PaginacionTabla>({ current: 1, pageSize: 10 })
  const [loading, setLoading] = useState(false)
  const [parametrosReporte, setParametrosReporte] = useState<ParametrosReporte>({
    sortField: 'movimiento.id',
    sortOrder: 'descend',
    filters: {},
  })

  const pedirDatos = (params: ParametrosTabla = {}) => {
    setLoading(true)

    fnPeticion({
      ...params,
      grupoId,
    })
      .then(respData => {
        if (respData !== undefined) {
          setDataTable(respData.results)
          setPagination(respData.pagination)
        }
      })
      .catch(() => {}) // El interceptor de axios ya mostró el error.
      .finally(() => {
        setLoading(false)
      })
  }

  useEffect(() => {
    if (grupoId !== 0) {
      pedirDatos({
        pagination,
        sortField: 'movimiento.id',
        sortOrder: 'descend',
      })
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conteoRefresh, grupoId])

  const handleTableChange: TableProps<MovimientoOperacion>['onChange'] = (
    paginacion,
    filters,
    sorter,
  ) => {
    const { field = 'movimiento.id', order: sortOrder = 'descend' } = Array.isArray(sorter)
      ? {}
      : sorter
    // antd devuelve el `dataIndex` de la columna (un arreglo en las columnas anidadas) y se envía tal cual;
    // `ParametrosTabla` lo tipa como cadena.
    const sortField = field as string
    setParametrosReporte({
      sortField,
      sortOrder,
      filters,
    })

    pedirDatos({
      sortField,
      sortOrder,
      pagination: paginacion,
      filters,
    })
  }

  const peticionReporte = (conFoto: boolean) => {
    ReportePeticiones.porGrupo({
      movimientoTipoNombre,
      grupoId,
      conFoto,
      grupoNombre: grupoNombre || `${Math.trunc(Math.random() * 100000)}`,
      sortField: parametrosReporte.sortField,
      sortOrder: parametrosReporte.sortOrder,
      filters: parametrosReporte.filters,
    })
      .then(resp => {
        if (resp !== undefined) {
          notification.success({ title: resp.message })
        }
      })
      .catch(() => {})
  }

  const generarReporte = (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    peticionReporte(false)
  }

  const generarReporteConFoto = (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    peticionReporte(true)
  }

  const colocarFooter = () => {
    const registroIniciaPagina = pagination.current * pagination.pageSize - pagination.pageSize + 1
    const finPagina = pagination.current * pagination.pageSize
    const registroFinPagina =
      pagination.total !== undefined && finPagina > pagination.total ? pagination.total : finPagina
    const salida = `Registros ${registroIniciaPagina} al ${registroFinPagina}, de  ${pagination.total} `

    if (pagination.total !== pagination.totalItems) {
      return salida.concat(` filtrados (${pagination.totalItems} totales)`)
    }

    return salida
  }

  const colocarHeader = () => (
    <EncabezadoTabla
      titulo={titulo}
      total={pagination.total}
      totalItems={pagination.totalItems}
      extra={
        <Dropdown
          menu={{
            items: [
              {
                key: 'sinFoto',
                label: (
                  <Tag color="cyan">
                    <a href="#" onClick={generarReporte}>
                      <PrinterFilled /> Sin Foto
                    </a>
                  </Tag>
                ),
              },
              {
                key: 'conFoto',
                label: (
                  <Tag color="purple">
                    <a href="#" onClick={generarReporteConFoto}>
                      <PrinterFilled /> Con Foto
                    </a>
                  </Tag>
                ),
              },
            ],
          }}
        >
          <Button type="link" size="small">
            Reportes
            <DownOutlined />
          </Button>
        </Dropdown>
      }
    />
  )

  return (
    <>
      <UltimoArticuloAgregado movimiento={dataTable.length > 0 ? dataTable[0] : { id: 0 }} />
      <Table<MovimientoOperacion>
        columns={columns}
        dataSource={dataTable}
        rowKey={record => `${record.id}`}
        title={colocarHeader}
        footer={colocarFooter}
        expandable={{
          expandedRowRender: record => <DetalleArticuloOperacionTabla movimiento={record} />,
        }}
        pagination={{
          ...pagination,
          pageSizeOptions: ['10', '20', '50', '100', '500'],
          showSizeChanger: true,
        }}
        loading={loading}
        onChange={handleTableChange}
      />
    </>
  )
}

export default TablaOperaciones
