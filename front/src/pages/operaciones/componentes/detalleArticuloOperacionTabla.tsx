import { Descriptions, Tag, type DescriptionsProps } from 'antd'
import dayjs from 'dayjs'
import { formatoMonedaMexico } from 'helpers/funcionesExtras'
import type { DetalleArticuloOperacionTablaProps } from '../tipos'

export type { DetalleArticuloOperacionTablaProps } from '../tipos'

type ElementoDescripcion = NonNullable<DescriptionsProps['items']>[number]

const DetalleArticuloOperacioTabla = ({ movimiento }: DetalleArticuloOperacionTablaProps) => {
  const { estatus, operacion, inventarioActual, grupos = [], sesion } = movimiento
  const producto = inventarioActual?.producto
  const productoClaves = producto?.productoClaves ?? []
  const proyecto = operacion?.proyecto
  const { nombre: proyectoNombre } = proyecto ?? { nombre: '' }
  const precioObj = producto?.productoPrecios?.find(pp => pp.precioTipo.id === 2)

  const elementos: (ElementoDescripcion | false | undefined)[] = [
    {
      key: 'operacion',
      label: 'Operacion:',
      children: `${operacion?.movimientoTipo.nombre} ${estatus === 'finalizado' ? '*' : ''} (#${operacion?.id})`,
    },
    { key: 'fecha', label: 'Fecha:', children: dayjs(operacion?.fecha).format('D-MMM-YY HH:mm') },
    proyecto && {
      key: 'proyecto',
      label: 'Proyecto:',
      children: <strong>{proyectoNombre}</strong>,
    },
    grupos.length > 0 && {
      key: 'grupos',
      label: 'Grupos:',
      children: grupos.map(grp => <Tag key={grp.id}>{`${grp.nombre} (${grp.id})`}</Tag>),
    },
    { key: 'clave', label: 'Clave:', children: productoClaves[productoClaves.length - 1]?.barras },
    { key: 'producto', label: 'Producto:', children: producto?.titulo },
    {
      key: 'precio',
      label: 'Precio:',
      children: <strong>{`${formatoMonedaMexico(precioObj?.precio)} ${precioObj?.moneda}`}</strong>,
    },
    {
      key: 'area',
      label: 'Area / Almacén: ',
      children: `${producto?.area?.nombre} / ${inventarioActual?.bodega?.nombre}`,
    },
    { key: 'almacenista', label: 'Almacenista:', children: sesion?.usuario?.nombre },
    {
      key: 'responsables',
      label: 'Responsables:',
      children: (operacion?.usuarios ?? []).map(usr => usr.nombre).join(',  '),
    },
    { key: 'descripcion', label: 'Descripcion:', children: <p>{producto?.descripcion}</p> },
  ]

  return (
    <Descriptions
      size="small"
      bordered
      column={{ lg: 1, md: 1, sm: 1, xs: 1 }}
      items={elementos.filter((elemento): elemento is ElementoDescripcion => Boolean(elemento))}
    />
  )
}

export default DetalleArticuloOperacioTabla
