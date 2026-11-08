import { useEffect, useState, type ReactNode } from 'react'
import { Dropdown, Button, Tooltip, type MenuProps } from 'antd'
import { notification } from 'helpers/feedback'
import dayjs from 'dayjs'
import {
  DownOutlined,
  SmileTwoTone,
  FrownTwoTone,
  MehTwoTone,
  AlertTwoTone,
} from '@ant-design/icons'
import ProductoInventariado from 'services/axios/productoInventariado'
import type { RespuestaMensaje } from 'types/api'
import type { InventarioProducto } from '../../tipos'

export interface InventariadoProps {
  productoId?: number
  /** Un resultado o el historial del producto (se muestra el más reciente). */
  productoInventariado?: InventarioProducto | InventarioProducto[] | null
  /** Solo muestra el icono (sin menú para registrar un inventario). */
  disabled?: boolean
}

const sinRevisar = (): InventarioProducto => ({
  fecha: new Date(0),
  validacion: 'no-revisado',
  invalido: true,
})

const validacionConFecha = (pi: InventarioProducto | null | undefined): InventarioProducto => {
  if (!pi) return sinRevisar()

  if (pi.fecha) {
    if (
      dayjs().isAfter(dayjs(pi.fecha).add(12, 'months')) &&
      pi.validacion !== 'inventarioNegativo' &&
      !pi.invalido
    ) {
      const { fecha } = pi
      return { fecha, validacion: 'inventarioViejo' }
    }
  }

  return { ...pi }
}

/** La respuesta de `/item-balance/*` es el registro de inventario guardado. */
const esInventarioProducto = (
  valor: RespuestaMensaje,
): valor is InventarioProducto & RespuestaMensaje => typeof valor.validacion === 'string'

const iconosJsx: Record<string, ReactNode> = {
  inventarioPositivo: <SmileTwoTone style={{ fontSize: '150%' }} twoToneColor="#1B58C1" />,
  inventarioNegativo: <FrownTwoTone style={{ fontSize: '150%' }} twoToneColor="#C11BAB" />,
  'no-revisado': <MehTwoTone style={{ fontSize: '150%' }} twoToneColor="#DDE810" />,
  inventarioViejo: <AlertTwoTone style={{ fontSize: '150%' }} twoToneColor="#E86610" />,
}

const Inventariado = ({
  productoId,
  productoInventariado = null,
  disabled = false,
}: InventariadoProps) => {
  const [guardandoValidacion, setGuardandoValidacion] = useState(false)
  const [inventarioProducto, setInventarioProducto] = useState<InventarioProducto>(sinRevisar)

  useEffect(() => {
    if (Array.isArray(productoInventariado)) {
      const inventarioMasReciente = productoInventariado.reduce(
        (prev, curr) => (dayjs(prev.fecha).isSameOrAfter(dayjs(curr.fecha)) ? prev : curr),
        sinRevisar(),
      )
      setInventarioProducto(validacionConFecha(inventarioMasReciente))
    } else {
      setInventarioProducto(validacionConFecha(productoInventariado))
    }
  }, [productoInventariado])

  const handleMenuClick: MenuProps['onClick'] = async ({ key }) => {
    setGuardandoValidacion(true)
    const peticiones: Record<string, () => Promise<RespuestaMensaje>> = {
      inventarioPositivo: () =>
        ProductoInventariado.inventarioExiste({
          productoId,
          nombre: 'MANUAL',
        }),
      inventarioNegativo: () =>
        ProductoInventariado.inventarioNoExiste({
          productoId,
          nombre: 'MANUAL',
        }),
      'no-revisado': () =>
        ProductoInventariado.noRevisado({
          productoId,
          nombre: 'MANUAL',
        }),
    }
    let respValidacion: RespuestaMensaje | undefined
    try {
      respValidacion = await peticiones[key]()
    } catch {
      // El interceptor de axios ya mostró el error; se trata como respuesta vacía (aviso de abajo).
      respValidacion = undefined
    }
    if (respValidacion && esInventarioProducto(respValidacion)) {
      setInventarioProducto(respValidacion)
    } else {
      notification.error({
        description: 'No se puede cambiar el estado',
        title: 'Intente más tarde, si el problema persiste verifique con su administrador',
      })
    }

    setGuardandoValidacion(false)
  }

  const textoFecha = !inventarioProducto.invalido
    ? dayjs(inventarioProducto.fecha).format('ll')
    : '-'

  const menuValidacion: MenuProps = {
    onClick: handleMenuClick,
    items: [
      { key: 'fecha', disabled: true, label: textoFecha },
      { key: 'inventarioPositivo', icon: iconosJsx.inventarioPositivo, label: 'Existe' },
      { key: 'inventarioNegativo', icon: iconosJsx.inventarioNegativo, label: 'No Existe' },
      { key: 'no-revisado', icon: iconosJsx['no-revisado'], label: 'No revisado' },
    ],
  }

  const icono =
    inventarioProducto.validacion !== undefined
      ? iconosJsx[inventarioProducto.validacion]
      : undefined

  return disabled ? (
    <Tooltip title={textoFecha}>
      <Button type="text" icon={icono} loading={guardandoValidacion} />
    </Tooltip>
  ) : (
    <Dropdown menu={menuValidacion}>
      <Button type="text" icon={icono} loading={guardandoValidacion}>
        <DownOutlined />
      </Button>
    </Dropdown>
  )
}

export default Inventariado
