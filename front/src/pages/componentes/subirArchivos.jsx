import React, { useEffect, useState } from 'react'
import { Modal, Row, Spin, Upload } from 'antd'
import { notification } from 'helpers/feedback'
import { PlusOutlined } from '@ant-design/icons'
import { apiURLBase } from 'services/axios'
import { obtenerToken } from 'helpers/storage'
import ArchivoPeticiones from 'services/axios/archivos'

const SubirArchivos = ({
  habilitado,
  archivosIdsIniciales,
  cargando,
  relacionId,
  relacion, // string con "producto","inventario", etc
}) => {
  const [fileList, setFileList] = useState([])
  const [habilitadoInterno, setHabilitadoInterno] = useState(false)
  const [previewVisible, setPreviewVisible] = useState(false)
  const [previewImage, setPreviewImage] = useState('')

  useEffect(() => {
    if (archivosIdsIniciales !== undefined) {
      const ids = archivosIdsIniciales.map(arch => arch.id)
      // console.log(ids)
      setHabilitadoInterno(false)
      // peticion de detalle de ids.
      // con el resultado hay que asignar el valor de fileList
      ArchivoPeticiones.obtenerResponseFileDeId({ ids })
        .then(resp => {
          if (resp !== undefined) {
            // console.log("resp",resp)
            setFileList(resp)
          }
        })
        .catch(() => {})
        .finally(() => {
          setHabilitadoInterno(true)
        })
    }
  }, [archivosIdsIniciales])

  const handleChange = info => {
    const { fileList: fl } = info
    // console.log("handleChange",info);
    setFileList(fl)
  }

  const handleRemove = async fileUploaded => {
    // console.log("handleRemove",fileUploaded);

    try {
      const resp = await ArchivoPeticiones.quitarArchivo({
        relacion,
        id: relacionId,
        archivoId: fileUploaded.uid * -1,
      })

      if (resp !== undefined) {
        notification.success({ message: 'Archivo eliminado correctamente' })
        // fnActualizar();
        return true
      }
    } catch {
      // El interceptor de axios ya mostró el error.
      return false
    }
  }

  const handlePreview = fileUploaded => {
    // console.log(fileUploaded);
    // console.log(fileUploaded);
    const { type, name } = fileUploaded

    if (type.indexOf('image') >= 0) {
      setPreviewVisible(true)
      setPreviewImage(fileUploaded.url)
    } else {
      notification.info({ message: `No hay vista previa para: ${name} ` })
    }
  }

  const handleCancel = e => {
    e.preventDefault()
    setPreviewVisible(false)
  }

  if (cargando && habilitadoInterno) {
    return (
      <Row>
        <Spin spinning tip="Cargando archivos..." />
      </Row>
    )
  }

  const componenteHabilitado = habilitado && habilitadoInterno
  const rutaUploadProducto = `${apiURLBase}/file/file`

  return (
    <>
      <Row style={{ width: '90%', margin: 'auto' }}>
        <Upload
          action={rutaUploadProducto}
          headers={{ auth: obtenerToken() }}
          disabled={!componenteHabilitado}
          data={{ relacion, id: relacionId }}
          listType="picture-card"
          fileList={fileList}
          maxCount={1}
          showUploadList={{
            showRemoveIcon: true,
            showDownloadIcon: true,
            showPreviewIcon: true,
          }}
          onChange={handleChange}
          onRemove={handleRemove}
          onPreview={handlePreview}
        >
          <div>
            <PlusOutlined />
            <div style={{ marginTop: 8 }}>Subir</div>
          </div>
        </Upload>
      </Row>
      <Modal
        open={previewVisible}
        // title={previewTitle}
        footer={null}
        onCancel={handleCancel}
        centered
        width="90%"
      >
        <img alt="" style={{ width: '100%' }} src={previewImage} />
      </Modal>
    </>
  )
}

export default SubirArchivos
