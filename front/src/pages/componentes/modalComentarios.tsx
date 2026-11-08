import { Modal } from 'antd'
import type { Comentario } from 'types/api'
import Comentarios from './comentarios'
import type { EventoCerrarModal } from './tipos'

export interface ModalComentariosProps {
  comentarios?: Comentario[]
  mostrarModal: boolean
  /**
   * Se llama con el evento de cierre del `Modal`. Firma de método (bivariante) para admitir manejadores que solo
   * esperan `MouseEvent`, `() => void` o el evento completo.
   */
  cerrarModal(evento: EventoCerrarModal): void
  /** Entidad a la que pertenecen los comentarios (`"Grupo"`, `"Producto"`, `"Operacion"`…). */
  relacion?: string
  relacionId?: number
  /** Solo se pueden agregar o quitar comentarios si es `'activo'`. */
  estatus?: string
  fnActualizar?: () => void
}

const ModalComentarios = ({
  comentarios,
  mostrarModal,
  cerrarModal,
  relacion,
  relacionId,
  estatus,
  fnActualizar,
}: ModalComentariosProps) => {
  return (
    <Modal open={mostrarModal} centered width="70%" footer={null} onCancel={cerrarModal}>
      <Comentarios
        comentarios={comentarios}
        loading={false}
        disabled={estatus !== 'activo'}
        editar
        relacion={relacion}
        relacionId={relacionId}
        fnActualizar={fnActualizar}
      />
    </Modal>
  )
}

export default ModalComentarios
