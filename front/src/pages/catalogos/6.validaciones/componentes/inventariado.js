import React, { useEffect, useState } from 'react'
import { Dropdown, Button, Menu, notification, Tooltip } from 'antd'
import moment from 'moment'
import 'moment/locale/es'
import {
  DownOutlined,
  SmileTwoTone,
  FrownTwoTone,
  MehTwoTone,
  AlertTwoTone,
} from '@ant-design/icons'
import ProductoInventariado from 'services/axios/productoInventariado'

const Inventariado = ({ productoId, productoInventariado = null, disabled = false }) => {
  const [guardandoValidacion, setGuardandoValidacion] = useState(false)
  const [inventarioProducto, setInventarioProducto] = useState({ fecha: new Date(0), validacion: 'no-revisado', invalido:true })

  const validacionConFecha = pi => {
    if (!pi) return { fecha: new Date(0), validacion: 'no-revisado', invalido:true }

    if (pi.fecha) {
      if (
        moment().isAfter(moment(pi.fecha).add(12, 'months')) &&
        pi.validacion !== 'inventarioNegativo' && !pi.invalido
      ) {
        const {fecha} = pi;
        return { fecha, validacion:'inventarioViejo'}
      }
    }

    return {...pi}
  }

  useEffect(() => {
    console.log({ productoInventariado })
    if (Array.isArray(productoInventariado)) {
      const inventarioMasReciente = productoInventariado.reduce(
        (prev, curr) => (moment(prev.fecha).isSameOrAfter(moment(curr.fecha)) ? prev : curr),
        { fecha: new Date(0), validacion: 'no-revisado', invalido:true },
      )

      console.log({ inventarioMasReciente })
      setInventarioProducto(validacionConFecha(inventarioMasReciente))
    } else {
      setInventarioProducto(validacionConFecha(productoInventariado))
    }

    // setInventarioProducto('no-revisado');
  }, [productoInventariado])

  const handleMenuClick = async e => {
    const { key } = e
    console.log({ productoId, validacion: key })
    setGuardandoValidacion(true)
    const peticiones = {
      inventarioPositivo: () => {
        console.log('peticion valido', { key })
        return ProductoInventariado.inventarioExiste({
          productoId,
          nombre:"MANUAL",
        })
      },
      inventarioNegativo: () => {
        console.log('peticion invalido', { key })
        return ProductoInventariado.inventarioNoExiste({
          productoId,
          nombre:"MANUAL",
        })
      },
      'no-revisado': () => {
        console.log('peticion no-revisado', { key })
        return ProductoInventariado.noRevisado({
          productoId,
          nombre:"MANUAL",
        })
      },
    }
    const respValidacion = await peticiones[key]()
    console.log({ respValidacion })
    if (respValidacion ?? false) {
      setInventarioProducto(respValidacion)
    } else {
      notification.error({
        description: 'No se puede cambiar el estado',
        message: 'Intente más tarde, si el problema persiste verifique con su administrador',
      })
    }

    setGuardandoValidacion(false)
  }

  const iconosJsx = {
    inventarioPositivo: <SmileTwoTone style={{ fontSize: '150%' }} twoToneColor="#1B58C1" />,
    inventarioNegativo: <FrownTwoTone style={{ fontSize: '150%' }} twoToneColor="#C11BAB" />,
    'no-revisado': <MehTwoTone style={{ fontSize: '150%' }} twoToneColor="#DDE810" />,
    inventarioViejo: <AlertTwoTone style={{ fontSize: '150%' }} twoToneColor="#E86610" />,
  }

  const menuValidacion = (
    <Menu onClick={handleMenuClick}>
      <Menu.Item key="fecha" disabled>
        {(!inventarioProducto.invalido)  ? moment(inventarioProducto.fecha).format('ll') : '-'}
      </Menu.Item>
      <Menu.Item key="inventarioPositivo" icon={iconosJsx.inventarioPositivo}>
        {' '}
        Existe{' '}
      </Menu.Item>
      <Menu.Item key="inventarioNegativo" icon={iconosJsx.inventarioNegativo}>
        {' '}
        No Existe{' '}
      </Menu.Item>
      <Menu.Item key="no-revisado" icon={iconosJsx['no-revisado']}>
        {' '}
        No revisado{' '}
      </Menu.Item>
    </Menu>
  )

  // console.warn({disabled});

  return (
    <>
      {disabled ? (
        <Tooltip
          title={(!inventarioProducto.invalido) ? moment(inventarioProducto.fecha).format('ll') : '-'}
        >
          <Button type="text" icon={iconosJsx[inventarioProducto.validacion]} loading={guardandoValidacion} />
        </Tooltip>
      ) : (
        <Dropdown overlay={menuValidacion}>
          <Button type="text" icon={iconosJsx[inventarioProducto.validacion]} loading={guardandoValidacion}>
            <DownOutlined />
          </Button>
        </Dropdown>
      )}
    </>
  )
}

export default Inventariado
