import React from 'react'
import { Modal } from 'antd'
import SubirArchivos from './subirArchivos'

const ModalArchivos = ({ 
  archivos, 
  mostrarModal, 
  cerrarModal,
  relacion,
  relacionId,
  estatus,
}) => {
  return (
    <Modal
      visible={mostrarModal}
      centered
      // width="90%"
      // style={{ height: '90%' }}
      footer={null}
      onCancel={cerrarModal}
    >
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
