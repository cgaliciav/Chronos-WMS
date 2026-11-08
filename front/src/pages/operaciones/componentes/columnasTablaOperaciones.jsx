import React from 'react'
import { Tag, Popconfirm, Typography, Badge } from 'antd'
import { apiURLBase, conToken } from 'services/axios'
import { obtenerPropsBusquedaInput } from 'pages/componentes/filtrosTablas'

const ColumnasOperaciones = {
  foto: (setArchivosImagenes, setMostrarModalImagenes) => ({
    title: 'Foto',
    dataIndex: ['inventarioActual', 'producto', 'archivos'],
    key: 'thumbnail',
    render: archivos => {
      let ruta
      if (archivos?.length > 0) ruta = conToken(`${apiURLBase}/file/thumbnail/${archivos[0].id}`)
      else ruta = 'resources/images/no-photo-available.png'
      return (
        <a
          className={{
            display: 'inline-block',
            width: '64px',
            height: '64px',
            border: '1px solid #e4e9f0',
            backgroud: '#fff',
            'border-radius': '3px',
          }}
          href="#"
          onClick={e => {
            e.preventDefault()
            setArchivosImagenes(archivos)
            setMostrarModalImagenes(true)
          }}
          // role="button"
          // tabIndex="-1"
          // onKeyPress={e => {
          //   e.preventDefault()
          // }}
        >
          <img
            width="100%"
            // height="100%"
            src={ruta}
            alt=""
          />
        </a>
      )
    },
    width: '64px',
  }),
  producto: {
    title: 'Producto',
    dataIndex: ['inventarioActual', 'producto', 'titulo'],
    key: 'producto.titulo',
    // ellipsis: true,
    sorter: true,
    render: text => (
      <Typography.Text ellipsis strong>
        {' '}
        {text}{' '}
      </Typography.Text>
    ),
    ...obtenerPropsBusquedaInput(),
  },

  clave: {
    title: 'Clave',
    dataIndex: ['inventarioActual', 'producto', 'productoClaves'],
    key: 'productoClaves.barras',
    sorter: true,
    ellipsis: true,
    render: (claves, record) => {
      console.log( '>>>>>>>>>recor', record )
      return (
        <div>
          {claves?.map(clave => (
            <p key={clave.barras} className="font-weight-bold text-primary">
              {clave.barras}
            </p>
          ))}
        </div>
      )
    },
    ...obtenerPropsBusquedaInput(),
  },
  proyecto:{
    title: 'Proyecto',
    dataIndex: ['operacion', 'proyecto', 'nombre'],
    key: 'proyecto.nombre',
    ellipsis: true,
    sorter: true,
    responsive: ['xl'],
  },
  almacen: {
    title: 'Almacén',
    dataIndex: ['inventarioActual', 'bodega', 'nombre'],
    key: 'bodega.nombre',
    ellipsis: true,
    sorter: true,
    responsive: ['xxl'],
  },
  operacion: {
    title: 'Operación',
    dataIndex: ['operacion', 'movimientoTipo', 'nombre'],
    key: 'operacion.nombre',
    ellipsis: true,
    responsive: ['xl'],
    ...obtenerPropsBusquedaInput(),
    render: (text, record) => {
      // console.log('record', record);
      // if (record.estatus === 'finalizado') {
        return (
          <Badge dot={record.estatus === 'finalizado'}>
            <Typography.Text strong>{text}</Typography.Text>
          </Badge>
        )
      // }
      // return text
    },
  },
  almacenista: {
    title: 'Almacenista',
    dataIndex: ['sesion', 'usuario', 'nombre'],
    key: 'usuario.nombre',
    sorter: true,
    ellipsis: true,
    ...obtenerPropsBusquedaInput(),
    // responsive: ['xxl'],
  },
  funciones: (quitarMovimiento, editarPrecio = null) => ({
    title: '',
    dataIndex: 'id',
    key: 'action',
    width: '20%',
    render: (movimientoId, record) => (
      <span>
        <Tag color="blue">
          <a href={`#/movimientos/detalle?uid=${movimientoId}`}>
            <i className="icmn-eye" />
          </a>
        </Tag>

        <Tag>
          <a href={`#/articulos/detalle?uid=${record.inventarioActual.id}`}>
            <i className="icmn-eye" />
          </a>
        </Tag>

        {editarPrecio && (
          <Tag color="green">
            <a href={`#/articulos/editar/detalle?uid=${record.inventarioActual.id}&p=precios`}>
              <i className="icmn-coin-dollar" />
            </a>
          </Tag>
        )}

        {quitarMovimiento ? (
          <Popconfirm
            title="¿Estas seguro que quieres borrar el movimiento?"
            // TODO FUNCION ELIMINAR
            onConfirm={() => {
              quitarMovimiento(movimientoId)
            }}
            onCancel={() => {}}
            okText="Sí"
            cancelText="No"
          >
            <Tag color="red">
              <a href="#">
                <i className="icmn-bin" />
              </a>
            </Tag>
          </Popconfirm>
        ) : null}
      </span>
    ),
  }),
}

export default ColumnasOperaciones
