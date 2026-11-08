import { useEffect, useState } from 'react'
import { Modal, Row, Spin, Upload, type UploadFile, type UploadProps } from 'antd'
import { notification } from 'helpers/feedback'
import { PlusOutlined } from '@ant-design/icons'
import { apiURLBase } from 'services/axios'
import { obtenerToken } from 'helpers/storage'
import ArchivoPeticiones from 'services/axios/archivos'
import type { ArchivoId, EventoCerrarModal } from './tipos'

export interface SubirArchivosProps {
  habilitado?: boolean
  /** Archivos ya asociados; al cambiar se piden sus fichas al API. Sin valor no se pide nada. */
  archivosIdsIniciales?: ArchivoId[]
  cargando?: boolean
  relacionId?: number
  /** Entidad a la que se asocian los archivos (`"Producto"`, `"Grupo"`, `"Operacion"`…). */
  relacion?: string
}

const SubirArchivos = ({
  habilitado = false,
  archivosIdsIniciales,
  cargando = false,
  relacionId,
  relacion,
}: SubirArchivosProps) => {
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [habilitadoInterno, setHabilitadoInterno] = useState(false)
  const [previewVisible, setPreviewVisible] = useState(false)
  const [previewImage, setPreviewImage] = useState('')

  useEffect(() => {
    if (archivosIdsIniciales !== undefined) {
      const ids = archivosIdsIniciales.map(arch => arch.id)
      setHabilitadoInterno(false)
      // Con el detalle de los ids se rellena la lista de antd `Upload`.
      ArchivoPeticiones.obtenerResponseFileDeId({ ids })
        .then(resp => {
          if (resp !== undefined) {
            // El API devuelve fichas con la forma de `UploadFile` (uid = -id del archivo).
            setFileList(resp as UploadFile[])
          }
        })
        .catch(() => {})
        .finally(() => {
          setHabilitadoInterno(true)
        })
    }
  }, [archivosIdsIniciales])

  const handleChange: UploadProps['onChange'] = info => {
    const { fileList: fl } = info
    setFileList(fl)
  }

  const handleRemove = async (fileUploaded: UploadFile): Promise<boolean | undefined> => {
    try {
      const resp = await ArchivoPeticiones.quitarArchivo({
        relacion,
        id: relacionId,
        archivoId: Number(fileUploaded.uid) * -1,
      })

      if (resp !== undefined) {
        notification.success({ title: 'Archivo eliminado correctamente' })
        return true
      }
    } catch {
      // El interceptor de axios ya mostró el error.
      return false
    }
    return undefined
  }

  const handlePreview = (fileUploaded: UploadFile) => {
    const { type, name } = fileUploaded

    if ((type ?? '').indexOf('image') >= 0) {
      setPreviewVisible(true)
      setPreviewImage(fileUploaded.url ?? '')
    } else {
      notification.info({ title: `No hay vista previa para: ${name} ` })
    }
  }

  const handleCancel = (e: EventoCerrarModal) => {
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
  const token = obtenerToken()

  return (
    <>
      <Row style={{ width: '90%', margin: 'auto' }}>
        <Upload
          action={rutaUploadProducto}
          headers={token ? { auth: token } : {}}
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
      <Modal open={previewVisible} footer={null} onCancel={handleCancel} centered width="90%">
        <img alt="" style={{ width: '100%' }} src={previewImage} />
      </Modal>
    </>
  )
}

export default SubirArchivos
