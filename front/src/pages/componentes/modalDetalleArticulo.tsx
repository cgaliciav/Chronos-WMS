import { Modal } from 'antd'
import { Link } from 'react-router'
import DetalleArticulo from './detalleArticulo'

interface ModalDetalleArticuloProps {
  /** Id de `inventarioActual` del artículo; `null` cierra la ventana. */
  inventarioActualId: number | string | null
  cerrarModal: () => void
}

/**
 * Detalle del artículo en una ventana que ocupa el 80 % del área visible (ancho y alto), para verlo desde los
 * resultados de las búsquedas sin perder la búsqueda. El contenido se desplaza dentro de la ventana.
 */
const ModalDetalleArticulo = ({ inventarioActualId, cerrarModal }: ModalDetalleArticuloProps) => (
  <Modal
    open={inventarioActualId !== null}
    title={
      <>
        Artículo detalle{' '}
        {inventarioActualId !== null && (
          <Link
            to={`/articulos/detalle?uid=${inventarioActualId}`}
            style={{ fontSize: 12, fontWeight: 'normal', marginLeft: 12 }}
          >
            Abrir en página completa
          </Link>
        )}
      </>
    }
    width="80vw"
    centered
    footer={null}
    onCancel={cerrarModal}
    destroyOnHidden
    styles={{ body: { height: 'calc(80vh - 48px)', overflowY: 'auto', overflowX: 'hidden' } }}
  >
    {inventarioActualId !== null && <DetalleArticulo inventarioActualId={inventarioActualId} />}
  </Modal>
)

export default ModalDetalleArticulo
