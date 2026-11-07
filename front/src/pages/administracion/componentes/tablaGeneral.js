import React from 'react'
import { notification, Table,Row,Col, } from 'antd'

export default class TablaGeneral extends React.Component {
  state = {
    data: [],
    pagination: {
      current: 1,
      pageSize: 10,
    },
    loading: false,
  };

  componentDidMount(){
    const { pagination } = this.state
    const { filters=null } = this.props;
    this.fetch({ 
      filters, 
      pagination })

  }

  colocarFooter = () => {
    const { pagination } = this.state
    console.log("------------------- FOOTER",pagination)
    const registroIniciaPagina = pagination.current * pagination.pageSize - pagination.pageSize + 1
    const registroFinPagina = (pagination.current * pagination.pageSize) > pagination.total ? pagination.total : pagination.current * pagination.pageSize;
    const salida = `Registros ${registroIniciaPagina} al ${registroFinPagina}, de  ${pagination.total} `;

    if (pagination.total !== pagination.totalItems) {
      return salida.concat(` filtrados (${pagination.totalItems} totales)`)
    }

    return salida
  }

  colocarHeader = () => {
    const {titulo}=this.props;
    const {pagination}=this.state;
    // console.log("*****----- colocarHeader",pagination,filtered)
    return (
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
  )}
  
  handleTableChange=(pagination, filters, sorter)=>{
    this.fetch({
      sortField: sorter.field,
      sortOrder: sorter.order,
      pagination,
      filters,
    })
  }

  fetch = (params = {}) => {
    // console.log('params:', params);

    this.setState({ loading: true })
    const {fnPeticion}=this.props;

    fnPeticion({
      ...params,
    })
      .then(respData => {
        console.log("respData",respData);
        this.setState({
          loading: false,
          data: respData.results,
          pagination: {
            ...respData.pagination,
          },
          // filtered: respData.filtered,
        })
      })
      .catch(error => {
        notification.error({
          message: error.message,
        })
      })
  }

  render() {
    const {
      columns,
    }=this.props;

    const {
      data,
      pagination,
      loading
    }=this.state;
    
    return (
      <div className="kit__utils__table">
        <Table 
          columns={columns} 
          dataSource={data} 
          rowKey={record=>record.id}
          title={this.colocarHeader}
          footer={this.colocarFooter}
          pagination={{
            ...pagination,
            pageSizeOptions: ['10', '20', '50', '100', '500'],
            showSizeChanger: true,
            position: 'both',
          }}
          loading={loading}
          onChange={this.handleTableChange}
        />
      </div>
    )
  }
}
