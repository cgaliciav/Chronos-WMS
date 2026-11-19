import { useEffect, useState } from 'react'
import { useLocation } from 'react-router'
import QueryString from 'query-string'
import ACL from 'app/auth/ACL'
import Titulo from 'components/Titulo'
import Encabezado from 'components/ui/Encabezado'
import Tarjeta from 'components/ui/Tarjeta'
import DetalleArticulo from 'pages/componentes/detalleArticulo'

/** Página `/articulos/detalle?uid=`: el detalle vive en `pages/componentes/detalleArticulo`. */
const ArticuloDetalle = () => {
  const [id, setId] = useState<number | string>(0)
  const location = useLocation()

  useEffect(() => {
    const { uid } = QueryString.parse(location.search.replace('?', ''))
    // Sin `?uid` no hay nada que pedir (antes se pedía `/current-inventory/undefined`).
    setId(typeof uid === 'string' ? uid : 0)
  }, [location])

  return (
    <ACL roles={['V-ARTICULOS-DETALLE', 'ADMINISTRADOR']} redirect>
      <Titulo texto="Artículo detalle" />
      <Encabezado>Artículo detalle</Encabezado>
      <Tarjeta>
        <DetalleArticulo inventarioActualId={id} />
      </Tarjeta>
    </ACL>
  )
}

export default ArticuloDetalle
