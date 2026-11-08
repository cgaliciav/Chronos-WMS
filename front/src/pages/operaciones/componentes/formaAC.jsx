// forma alta compra....
// cantidad, titulo descripcio, foto, precio inicial, etc
// los datos generales de la factura

// forma para prestamo devolucion baja y previo...
// que es básicamente un campo de texto
import React, { useState } from 'react'
import { Button, Tabs, Steps, Spin } from 'antd'
import dayjs from 'dayjs'
import FormaEdicionArticulo from 'pages/catalogos/articulos/editarDetalle/componentes/formaEdicionArticulo'
import CaracteristicasProducto from 'pages/componentes/caracteristicas'
import Comentarios from 'pages/componentes/comentarios'
import SubirArchivos from 'pages/componentes/subirArchivos'
import GrupoPeticiones from 'services/axios/grupos'
import InventarioAcualPeticiones from 'services/axios/inventarioActual'

// const colLayoutA = {
//   xs: 24,
//   sm: 12,
//   md: 12,
//   lg: 8,
//   xl: 6,
//   xxl: 6,
// }
// const colLayoutB = {
//   xs: 24,
//   sm: 8,
//   md: 8,
//   lg: 6,
//   xl: 6,
//   xxl: 6,
// }

const FormaNuevoItemAC = ({
  handleFinish,
  cargando,
  proyectoId,
  usuariosIds,
  grupoId,
  movimientoTipoId
  // habilitado,
  // mostrarBajas
}) => {

  const [guardando, setGuardando] = useState(false);
  const [current, setCurrent] = useState(0);
  const [conteoNuevo, setConteoNuevo] = useState(0);

  const [inventarioActual, setInventarioActual] = useState({
    cantidad: 0,
    disponible: 'no definido',
    fechaDisponibilidad: dayjs(),
    bodega: { id: 0, nombre: '------' },
    producto: {
      archivos: [],
      productoPrecios: [],
      productoCaracteristicas: [],
      productoClaves: [],
      area: { id: 0, nombre: '-----' },
      id: 0,
      descripcion: '----------------',
      titulo: '------',
    },
  })


  // const guardarArticuloCompra=(valores)=>{
  //   console.log(valores);

  // }

  const terminar = ()=>{
    console.log("Aqui se refresca la lista de registros");
    setCurrent(0);
    handleFinish();
    setInventarioActual({
      cantidad: 0,
      disponible: 'no definido',
      fechaDisponibilidad: dayjs(),
      bodega: { id: 0, nombre: '------' },
      producto: {
        archivos: [],
        productoPrecios: [],
        productoCaracteristicas: [],
        productoClaves: [],
        area: { id: 0, nombre: '-----' },
        id: 0,
        descripcion: '----------------',
        titulo: '------',
      },
    });
    setConteoNuevo(conteoNuevo+1);
  }

  const actualizar = ()=>{
    console.log("hola");
    setGuardando(true);
    InventarioAcualPeticiones.obtenerId(inventarioActual.id)
    .then(resp=>{
      if(resp!==undefined){
        setInventarioActual(resp);
      }
    })
    .catch(() => {}) // El interceptor de axios ya mostró el error.
    .finally(()=>{
      setGuardando(false);
    })

  }

  const crearArticulo = (valores)=>{
    // crear articulo nuevo

    // console.log("crearArticulo",valores);

    setGuardando(true)

    // crear producto e inventario actual
    // crear nuevo codigo autogenerado
    // 
    const {
      titulo,
      cantidad,
      precio:productoPrecioOriginal,
      area:areaId,
      bodega:bodegaId,
      descripcion,
      moneda,
    } = valores

    GrupoPeticiones.agregarMovimientoCompra({
      grupoId,
      cantidad,
      movimientoTipoId, // compra O alta
      proyectoId,
      usuariosIds,
      precioUnitario:productoPrecioOriginal,
      precioTotal:productoPrecioOriginal*cantidad,
      bodegaId,
      titulo,
      descripcion,
      areaId,
      moneda,
      productoTipoId:1, // siempre es producto "regular"
      productoCaracteristicas:[], // se crea sin caracteristicas
      productoPrecioOriginal,
      // productoCodigos // al no mandar productoCodigos, se autogenera un codigo
    })
    .then(resp=>{
      if(resp!==undefined){
        setInventarioActual(resp.inventarioActual);
        setCurrent(current+1);
      }
    })
    .catch(() => {})
    .finally(()=>{
      setGuardando(false);
      
    })
  }

  const siguiente = ()=>{
    setCurrent(current+1);
  }

  const {
    archivos,
    productoCaracteristicas,
    comentarios,
    id: productoId,
  } = inventarioActual.producto
  
  // clave, tipoBaja
  return (
    <>
      <Steps
        current={current}
        items={[
          { key: 'A', title: 'Datos generales' },
          { key: 'B', title: 'Fotos' },
          { key: 'C', title: 'Caracteristicas' },
          { key: 'D', title: 'Comentarios' },
        ]}
      />
      <Spin spinning={guardando}>
        <Tabs activeKey={`${current}`} style={{ margin: '8px' }} tabBarStyle={{display:"none"}}
          items={[
            {
              key: '0',
              label: 'Detalles',
              disabled: current!==0,
              children: (
                <>
            <FormaEdicionArticulo 
              guardando={guardando}
              habilitado
              handleFinish={crearArticulo}
              esNuevo
              textoBoton="Guardar y siguiente"
              limpiarNuevo={conteoNuevo}
            />
                </>
              ),
            },
            {
              key: '1',
              label: 'Fotos',
              disabled: current!==1,
              children: (
                <>
            <SubirArchivos
              habilitado
              archivosIdsIniciales={archivos}
              cargando={cargando}
              relacion="Producto"
              relacionId={productoId}
            />
            <Button type="primary" onClick={siguiente}>Siguiente</Button>
            <Button type="primary" ghost onClick={terminar}>Terminar</Button>
                </>
              ),
            },
            {
              key: '2',
              label: 'Características',
              disabled: current!==2,
              children: (
                <>
            <CaracteristicasProducto
              productoCaracteristicas={productoCaracteristicas}
              loading={cargando}
              productoId={productoId}
              editar
              fnActualizar={actualizar}
            />
            <Button type="primary" onClick={siguiente}>Siguiente</Button>
            <Button type="primary" ghost onClick={terminar}>Terminar</Button>
                </>
              ),
            },
            {
              key: '3',
              label: 'Comentarios',
              disabled: current!==3,
              children: (
                <>
            <Comentarios
              comentarios={comentarios}
              loading={cargando}
              disabled={false}
              editar
              relacion="Producto"
              relacionId={productoId}
              fnActualizar={actualizar}
            />
            <Button type="primary" ghost onClick={terminar}>Terminar</Button>
                </>
              ),
            },
          ]}
        />
      </Spin>
    </>
  )
}

export default FormaNuevoItemAC
