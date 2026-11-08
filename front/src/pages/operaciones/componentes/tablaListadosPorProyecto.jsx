import React, { useEffect, useState } from 'react'
import { Table, Row, Col, Dropdown, Button, Tag } from 'antd'
import { notification } from 'helpers/feedback'
// import moment from 'moment';
// import 'moment/locale/es'
import { PrinterFilled, DownOutlined } from '@ant-design/icons'
import ReportePeticiones from 'services/axios/reportes'
import DetalleArticuloOperacionTabla from './detalleArticuloOperacionTabla'

const TablaOperacionesPorProyecto = ({
  titulo,
  columns,
  fnPeticion,
  movimientoTipoId,
  proyectoId,
  usuariosIds,
  areasIds,
  bodegasIds,
  conteoRefresh,
  grupoNombre,
  movimientoTipoNombre,
  // proyectoNombre,
  activos,
}) => {
  const [dataTable, setDataTable] = useState([])
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 })
  const [loading, setLoading] = useState(false)
  const [parametrosReporte, setParametrosReporte] = useState({
    sortField: 'movimiento.id',
    sortOrder: 'descend',
    filters: {},
  })

  useEffect(() => {
    if (
      // movimientoTipoId!==0 &&
      proyectoId !== 0 &&
      conteoRefresh !== 0
    ) {
      // moment.locale('es');
      fetch({
        pagination,
        sortField: 'movimiento.id',
        sortOrder: 'descend',
      })
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conteoRefresh])

  const handleTableChange = (paginacion, filters, sorter) => {
    const { field: sortField = 'movimiento.id', order: sortOrder = 'descend' } = sorter;

    console.log('handleTableChange', { sortField, sortOrder, check: sortField?.includes('productoClaves')?'inventarioActual.id':sortField });

    setParametrosReporte({
      sortField:sortField?.includes('productoClaves')?'inventarioActual.id':sortField,
      sortOrder,
      filters,
    })

    fetch({
      sortField:sortField?.includes('productoClaves')?'inventarioActual.id':sortField,
      sortOrder,
      pagination: paginacion,
      filters,
    })
  }

  const fetch = (params = {}) => {
    // console.log('params:', params);

    setLoading(true)

    fnPeticion({
      ...params,
      movimientoTipoId,
      proyectoId,
      usuariosIds,
      areasIds,
      bodegasIds,
    })
      .then(respData => {
        if (respData !== undefined) {
          // console.log("respData tablaListadoPorProyecto",respData);
          setDataTable(respData.results)
          setPagination(respData.pagination)
        }
      })
      .catch(() => {}) // El interceptor de axios ya mostró el error.
      .finally(() => {
        setLoading(false)
      })
  }

  const colocarFooter = () => {
    const registroIniciaPagina = pagination.current * pagination.pageSize - pagination.pageSize + 1
    const registroFinPagina =
      pagination.current * pagination.pageSize > pagination.total
        ? pagination.total
        : pagination.current * pagination.pageSize
    const salida = `Registros ${registroIniciaPagina} al ${registroFinPagina}, de  ${pagination.total} `

    if (pagination.total !== pagination.totalItems) {
      return salida.concat(` filtrados (${pagination.totalItems} totales)`)
    }

    return salida
  }

  const peticionReporte = conFoto => {
    // grupoNombre,movimientoTipoNombre,conFoto,
    //     grupoId,sortField, sortOrder, filters
    ReportePeticiones.porProyecto({
      movimientoTipoNombre,
      // proyectoNombre,
      conFoto,
      grupoNombre: grupoNombre || `${Math.trunc(Math.random() * 100000)}`,
      activos,
      proyectoId,
      movimientoTipoId,
      usuariosIds,
      areasIds,
      bodegasIds,
      sortField: parametrosReporte.sortField,
      sortOrder: parametrosReporte.sortOrder,
      filters: parametrosReporte.filters,
    }).then(resp => {
      if (resp !== undefined) {
        notification.success({ message: resp.message })
      }
    }).catch(() => {})
  }

  const generarReporte = e => {
    e.preventDefault()
    peticionReporte(false)
  }

  const generarReporteConFoto = e => {
    e.preventDefault()
    peticionReporte(true)
  }

  const colocarHeader = () => (
    <Row>
      <Col span={8}>
        <h2 className="text-truncate">{titulo}</h2>
      </Col>
      <Col span={8}>
        <Row justify="end" />
      </Col>
      <Col span={8}>
        <Dropdown
          menu={{
            // antd 5: `items` en lugar de `overlay` con `Menu.Item`.
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
          <Button style={{ float: 'right', marginTop: '-16px' }} type="link" size="small">
            Reportes
            <DownOutlined />
          </Button>
          {/* <a href="#" className="ant-dropdown-link" onClick={e => e.preventDefault()}>
            ... <DownOutlined />
          </a> */}
        </Dropdown>
        <Row justify="center">
          <h3>
            {`TOTAL: ${pagination.total || '-'}${
              pagination.total !== pagination.totalItems ? ' *filtrado' : ''
            } `}
          </h3>
        </Row>
      </Col>
    </Row>
  )

  return (
    <>
      <div className="kit__utils__table">
        <Table
          columns={columns}
          dataSource={dataTable}
          rowKey={record => `${record.id}`}
          title={colocarHeader}
          footer={colocarFooter}
          expandable={{
            expandedRowRender: record => {
              // console.log(record)
              return <DetalleArticuloOperacionTabla movimiento={record} />
            },
            // onExpand:(expanded,record)=>{
            //   console.log('ONEXPAND', {expanded,record})

            // }
          }}
          pagination={{
            ...pagination,
            pageSizeOptions: ['10', '20', '50', '100', '500'],
            showSizeChanger: true,
            position: 'both',
          }}
          loading={loading}
          onChange={handleTableChange}
        />
      </div>
    </>
  )
}

export default TablaOperacionesPorProyecto
