import React from 'react'
import { Modal } from 'antd'
import ImagenesEnCarrusel from './imagenesEnCarrusel'

const ModalImagenes = ({ archivos, mostrarModal, cerrarModal }) => {
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
