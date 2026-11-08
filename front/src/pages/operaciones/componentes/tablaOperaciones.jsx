import React, { useEffect,useState } from 'react'
import { Table, Row, Col, Dropdown, Button, Tag } from 'antd'
import { notification } from 'helpers/feedback'
import { PrinterFilled,DownOutlined } from '@ant-design/icons';
import ReportePeticiones from 'services/axios/reportes'
import UltimoArticuloAgregado from './ultimoArticuloAgregado';
import DetalleArticuloOperacionTabla from "./detalleArticuloOperacionTabla";


const TablaOperaciones = ({
  titulo,
  columns,
  fnPeticion,
  grupoId,
  conteoRefresh,
  grupoNombre,
  movimientoTipoNombre
}) => {
  const [dataTable, setDataTable] = useState([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10});
  const [loading, setLoading] = useState(false);
  const [parametrosReporte, setParametrosReporte] = useState({
    sortField:"movimiento.id",
    sortOrder:'descend',
    filters:{}
  });

  useEffect(() => {
    if(grupoId!==0){
      fetch({
        pagination,
        sortField:"movimiento.id",
        sortOrder:'descend'
      })
    }
    
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conteoRefresh,grupoId]);

  const handleTableChange=(paginacion, filters, sorter)=>{
    const {field:sortField='movimiento.id',order:sortOrder='descend'}=sorter;
    setParametrosReporte({
      sortField,
      sortOrder,
      filters,
    });

    fetch({
      sortField,
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
      grupoId,
    })
      .then(respData => {
        if(respData!==undefined){
          console.log("respData tablaListado",respData);
          setDataTable(respData.results);
          setPagination(respData.pagination);
        }
      })
      .catch(() => {}) // El interceptor de axios ya mostró el error.
      .finally(() => {
        setLoading(false);
      });
  }

  const peticionReporte=(conFoto)=>{
    // grupoNombre,movimientoTipoNombre,conFoto,
    //     grupoId,sortField, sortOrder, filters
    ReportePeticiones.porGrupo({
      movimientoTipoNombre,   // <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<------
      grupoId,
      conFoto,
      grupoNombre:grupoNombre||`${Math.trunc(Math.random()*100000)}`,
      sortField:parametrosReporte.sortField,
      sortOrder:parametrosReporte.sortOrder,
      filters:parametrosReporte.filters,
    })
    .then(resp=>{
      if(resp!==undefined){
        notification.success({title:resp.message})
      }
    })
    .catch(() => {})
  }

  const generarReporte =(e) =>{
    e.preventDefault();
    peticionReporte(false);
    
  }

  const generarReporteConFoto=(e) =>{
    e.preventDefault();
    peticionReporte(true);
  }



  const colocarFooter = () => {
    const registroIniciaPagina = pagination.current * pagination.pageSize - pagination.pageSize + 1
    const registroFinPagina = (pagination.current * pagination.pageSize) > pagination.total ? pagination.total : pagination.current * pagination.pageSize;
    const salida = `Registros ${registroIniciaPagina} al ${registroFinPagina}, de  ${pagination.total} `;

    if (pagination.total !== pagination.totalItems) {
      return salida.concat(` filtrados (${pagination.totalItems} totales)`)
    }

    return salida
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
        {/* <Row justify="end" style={{ marginTop: '15px' }}> */}
        {/* <div>

        </div> */}
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
          <Button style={{float:"right",marginTop:'-16px'}} type="link" size="small">
            Reportes<DownOutlined />
          </Button>
          {/* <a href="#" className="ant-dropdown-link" onClick={e => e.preventDefault()}>
            ... <DownOutlined />
          </a> */}
        </Dropdown>
        {/* </Row> */}
        <Row justify="center">
          <h3>{`TOTAL: ${pagination.total || '-'}${pagination.total !== pagination.totalItems?' *filtrado':''} `}</h3>
        </Row>
      </Col>
    </Row>
  )
  // console.log('pasa por aqui');

  return (  
    <>
      <UltimoArticuloAgregado movimiento={dataTable.length>0?dataTable[0]:{id:0}} />
      <div className="kit__utils__table">
        <Table 
          columns={columns} 
          dataSource={dataTable} 
          rowKey={(record)=>`${record.id}`}
          title={colocarHeader}
          footer={colocarFooter}
          expandable={{
            // rowExpandable:()=>true,
            // expandRowByClick:true,
            // expandedRowKeys:`${Math.random()}`,
            // rowExpandable: record => {console.log('rowExpandable',record.id,record.id !== 0); return record.id !== 0},
            expandedRowRender:record => {
              console.log(record)
              return (
                <DetalleArticuloOperacionTabla movimiento={record} />
                // <Descriptions 
                //   size="small"
                //   bordered
                //   column={{ lg: 1, md: 1, sm: 1, xs: 1 }}
                // >
                //   <Descriptions.Item label="Operacion:">{`${record.operacion.movimientoTipo.nombre} (#${record.id})`}</Descriptions.Item>
                //   <Descriptions.Item label="Fecha:">{dayjs(record.operacion.fecha).format('D-MMM-YY HH:mm') }</Descriptions.Item>
                //   <Descriptions.Item label="Proyecto:"><strong>{record.operacion.proyecto.nombre}</strong></Descriptions.Item>
                //   <Descriptions.Item label="Clave:">{record.inventarioActual.producto.productoClaves[record.inventarioActual.producto.productoClaves.length-1].barras}</Descriptions.Item>
                //   <Descriptions.Item label="Producto:">{record.inventarioActual.producto.titulo} </Descriptions.Item>
                //   <Descriptions.Item label="Precio:"><strong>{formatoMonedaMexico(record.inventarioActual.producto.productoPrecios.find(pp=>pp.precioTipo.id===2)?.precio) }</strong> </Descriptions.Item>
                //   <Descriptions.Item label="Area:">{record.inventarioActual.producto.area.nombre}</Descriptions.Item>
                //   <Descriptions.Item label="Almacen:">{record.inventarioActual.bodega.nombre}</Descriptions.Item>
                //   <Descriptions.Item label="Almacenista:">{record.sesion.usuario.nombre}</Descriptions.Item>
                //   <Descriptions.Item label="Descripcion:"><p>{record.inventarioActual.producto.descripcion}</p></Descriptions.Item>
                // </Descriptions>
              )
            },
            // onExpand:(expanded,record)=>{
            //   console.log('ONEXPAND', {expanded,record})

            // }
          }}
          pagination={{
            ...pagination,
            pageSizeOptions: ['10', '20', '50', '100', '500'],
            showSizeChanger: true,
            // position: 'bottomRight',
          }}
          // expandable={{
          //   expandedRowRender: record => <p style={{ margin: 0 }}>{record.description}</p>,
          //   rowExpandable: record => record.name !== 'Not Expandable',
          // }}


          loading={loading}
          onChange={handleTableChange}
        />
      </div>
    </>
  );
}
 
export default TablaOperaciones;
