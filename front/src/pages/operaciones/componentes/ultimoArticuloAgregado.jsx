import React, { useState } from 'react';
import {Col, Collapse, Empty, Row} from 'antd'
import ImagenesEnCarrusel from 'pages/componentes/imagenesEnCarrusel';
import ArticuloDatos from 'pages/componentes/articulo';
import ModalImagenes from 'pages/componentes/modalImagenes';

const UltimoArticuloAgregado = ({
  movimiento={
    id:0,
    inventarioActual:{
      id:0,
      producto:{
        id:0,
        archivos:[]
      }
    }
  }
}) => {
  const [mostrarModal, setMostrarModal] = useState(false);

  const abrirModal = e => {
    e.preventDefault()
    setMostrarModal(true)
  }

  const {inventarioActual}=movimiento;
  const {producto}=inventarioActual??{};
  return ( 
    <>
      <Collapse
        items={[
          {
            key: '1',
            label: 'Último artículo agregado',
            children: (
              <>
          {movimiento.id===0?(
            <Empty description="Sin información" />
          ) : (
            <Row gutter={{ xs: 4, sm: 8, md: 12, lg: 24, xl: 24 }}>
              <Col xl={8} xxl={8} lg={12} md={12} sm={24} xs={24}>
                <ImagenesEnCarrusel
                  archivos={producto.archivos}
                  rutaEnApi="file/catalog/"
                  hacerGrande
                  onClickImagen={abrirModal}
                />
              </Col>
              <Col xl={14} xxl={14} lg={12} md={12} sm={24} xs={24}>
                <ArticuloDatos
                  producto={inventarioActual.producto}
                  inventarioActual={inventarioActual}
                />
              </Col>
            </Row>

          )}
              </>
            ),
          },
        ]}
      />
      {movimiento.id!==0?(
        <ModalImagenes mostrarModal={mostrarModal} cerrarModal={()=>{setMostrarModal(false)}} archivos={producto.archivos} />
      ):(null)}
      
    </>
   );
}
 
export default UltimoArticuloAgregado;