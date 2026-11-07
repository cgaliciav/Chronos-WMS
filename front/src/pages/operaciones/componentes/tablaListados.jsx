import React, { useEffect,useState } from 'react'
import { Table,Row,Col } from 'antd'



const TablaListados = ({
  titulo,
  columns,
  movimientoTipoId,
  // movimientoTipoNombre,
  fnPeticion,
  conteoRefresh

}) => {
  const [dataTable, setDataTable] = useState([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if(movimientoTipoId!==undefined){
      if(movimientoTipoId!==0){
        fetch({
          pagination,
          sortField:"grupo.id",
          sortOrder:'descend'
        })
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movimientoTipoId]);

  useEffect(() => {
    fetch({
      pagination,
      sortField:"grupo.id",
      sortOrder:'descend'
    })
    
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conteoRefresh]);

  const handleTableChange=(paginacion, filters, sorter)=>{
    const {field=['grupo','id'],order:sortOrder='descend'}=sorter;

    fetch({
      sortField:Array.isArray(field)?field.slice(field.length-2).join("."):`grupo.${field}`,
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
    })
      .then(respData => {
        if(respData!==undefined){
          // console.log("respData tablaListado",respData);
          setDataTable(respData.results);
          setPagination(respData.pagination);
        }
      })
      .finally(() => {
        setLoading(false);
      });
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
        <Row justify="end" type="flex" />
      </Col>
      <Col span={8}>
        <Row justify="center" type="flex">
          <h3>{`TOTAL: ${pagination.total || '-'}${pagination.total !== pagination.totalItems?' *filtrado':''} `}</h3>
        </Row>
      </Col>
    </Row>
  )

  return (  
    <div className="kit__utils__table">
      <Table 
        columns={columns} 
        dataSource={dataTable} 
        rowKey={()=>`${Math.random()}`}
        title={colocarHeader}
        footer={colocarFooter}
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
  );
}
 
export default TablaListados;
