import { Modal } from 'antd'
import ImagenesEnCarrusel from './imagenesEnCarrusel'
import type { ArchivoId, EventoCerrarModal } from './tipos'

export interface ModalImagenesProps {
  archivos?: ArchivoId[]
  mostrarModal: boolean
  /**
   * Se llama con el evento de cierre del `Modal`. Firma de método (bivariante) para admitir manejadores que solo
   * esperan `MouseEvent`, `() => void` o el evento completo.
   */
  cerrarModal(evento: EventoCerrarModal): void
}

const ModalImagenes = ({ archivos = [], mostrarModal, cerrarModal }: ModalImagenesProps) => {
  return (
    <Modal
      open={mostrarModal}
      centered
      width="90%"
      style={{ height: '90%' }}
      footer={null}
      onCancel={cerrarModal}
    >
      <ImagenesEnCarrusel archivos={archivos} rutaEnApi="file/" />
    </Modal>
  )
}

export default ModalImagenes
