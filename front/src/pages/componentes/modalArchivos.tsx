import { Modal } from 'antd'
import SubirArchivos from './subirArchivos'
import type { ArchivoId, EventoCerrarModal } from './tipos'

export interface ModalArchivosProps {
  archivos?: ArchivoId[]
  mostrarModal: boolean
  /**
   * Se llama con el evento de cierre del `Modal`. Firma de método (bivariante) para admitir manejadores que solo
   * esperan `MouseEvent`, `() => void` o el evento completo.
   */
  cerrarModal(evento: EventoCerrarModal): void
  /** Entidad a la que pertenecen los archivos (`"Grupo"`, `"Producto"`, `"Operacion"`…). */
  relacion?: string
  relacionId?: number
  /** Solo se pueden subir o quitar archivos si es `'activo'`. */
  estatus?: string
}

const ModalArchivos = ({
  archivos,
  mostrarModal,
  cerrarModal,
  relacion,
  relacionId,
  estatus,
}: ModalArchivosProps) => {
  return (
    <Modal open={mostrarModal} centered footer={null} onCancel={cerrarModal}>
      <SubirArchivos
        habilitado={estatus === 'activo'}
        archivosIdsIniciales={archivos}
        cargando={false}
        relacion={relacion}
        relacionId={relacionId}
      />
    </Modal>
  )
}

export default ModalArchivos
