import React from 'react'
import { Modal } from 'antd'
import Comentarios from './comentarios'


// mostrarModal={mostrarModalComentarios}
//   cerrarModal={() => {
//     setMostrarModalComentarios(false)
//   }}
//   comentarios={comentariosGrupo}
//   relacion="Grupo"
//   relacionId={grupo.id}
//   estatus={grupo.estatus}
//   fnActualizar={actualizar}
  
const ModalComentarios = ({ 
  comentarios, 
  mostrarModal, 
  cerrarModal,
  relacion,
  relacionId,
  estatus,
  fnActualizar
}) => {
  return (
    <Modal
      open={mostrarModal}
      centered
      width="70%"
      // style={{ height: '90%' }}
      footer={null}
      onCancel={cerrarModal}
    >
      <Comentarios
        comentarios={comentarios}
        loading={false}
        disabled={estatus!=='activo'}
        editar
        relacion={relacion}
        relacionId={relacionId}
        fnActualizar={fnActualizar}
      />
    </Modal>
  )
}

export default ModalComentarios
