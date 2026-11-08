import { useEffect, useState, type ReactNode } from 'react'
import { Dropdown, Button, type MenuProps } from 'antd'
import { notification } from 'helpers/feedback'
import {
  DownOutlined,
  CheckCircleTwoTone,
  CloseCircleTwoTone,
  QuestionCircleTwoTone,
} from '@ant-design/icons'
import ProductoValidado from 'services/axios/productoValidado'
import type { RespuestaMensaje } from 'types/api'
import type { ValidacionProducto } from '../../tipos'

export interface ValidacionProps {
  productoId?: number
  productoValidado?: ValidacionProducto | null
  /** Solo muestra el icono (sin menú para cambiar la validación). */
  disabled?: boolean
}

const iconosJsx: Record<string, ReactNode> = {
  valido: <CheckCircleTwoTone style={{ fontSize: '150%' }} twoToneColor="#52c41a" />,
  invalido: <CloseCircleTwoTone style={{ fontSize: '150%' }} twoToneColor="#eb2f2f" />,
  'no-revisado': <QuestionCircleTwoTone style={{ fontSize: '150%' }} twoToneColor="#eba02f" />,
}

const Validacion = ({ productoId, productoValidado = null, disabled = false }: ValidacionProps) => {
  const [guardandoValidacion, setGuardandoValidacion] = useState(false)
  const [validacionProducto, setValidacionProducto] = useState<string | null>(null)

  useEffect(() => {
    if (productoValidado !== null) setValidacionProducto(productoValidado.validacion ?? 'no-revisado')
    else setValidacionProducto('no-revisado')
  }, [productoValidado])

  const handleMenuClick: MenuProps['onClick'] = async ({ key }) => {
    setGuardandoValidacion(true)
    const peticiones: Record<string, () => Promise<RespuestaMensaje>> = {
      valido: () =>
        ProductoValidado.validar({
          productoId,
          nombre: '',
          key,
        }),
      invalido: () =>
        ProductoValidado.invalidar({
          productoId,
          nombre: '',
          key,
        }),
      'no-revisado': () =>
        ProductoValidado.noRevisado({
          productoId,
          nombre: '',
          key,
        }),
    }
    let respValidacion: RespuestaMensaje | undefined
    try {
      respValidacion = await peticiones[key]()
    } catch {
      // El interceptor de axios ya mostró el error; se trata como respuesta vacía (aviso de abajo).
      respValidacion = undefined
    }
    if (respValidacion) {
      setValidacionProducto(key)
    } else {
      notification.error({
        description: 'No se puede cambiar el estado',
        title: 'Intente más tarde, si el problema persiste verifique con su administrador',
      })
    }

    setGuardandoValidacion(false)
  }

  const menuValidacion: MenuProps = {
    onClick: handleMenuClick,
    items: [
      { key: 'valido', icon: iconosJsx.valido, label: 'Válido' },
      { key: 'invalido', icon: iconosJsx.invalido, label: 'Inválido' },
      { key: 'no-revisado', icon: iconosJsx['no-revisado'], label: 'No revisado' },
    ],
  }

  const icono = validacionProducto !== null ? iconosJsx[validacionProducto] : undefined

  return disabled ? (
    <Button type="text" icon={icono} loading={guardandoValidacion} />
  ) : (
    <Dropdown menu={menuValidacion}>
      <Button type="text" icon={icono} loading={guardandoValidacion}>
        <DownOutlined />
      </Button>
    </Dropdown>
  )
}

export default Validacion
