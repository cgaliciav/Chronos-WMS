import { useState } from 'react'
import { Button, Flex, Upload } from 'antd'
import { DownloadOutlined, UploadOutlined } from '@ant-design/icons'
import { notification } from 'helpers/feedback'
import ConfiguracionPeticiones from 'services/axios/configuracion'
import { useMarcaStore } from 'stores/marca.store'

/** Descarga el JSON de configuración (sin secretos) o aplica uno (alta de clientes y copia entre entornos, fase 5). */
export default function ExportarImportar({ alImportar }: { alImportar: () => void }) {
  const [ocupado, setOcupado] = useState(false)

  const exportar = () => {
    setOcupado(true)
    ConfiguracionPeticiones.exportar()
      .then(datos => {
        const enlace = document.createElement('a')
        enlace.href = URL.createObjectURL(
          new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' }),
        )
        enlace.download = 'configuracion-chronos-wms.json'
        enlace.click()
        URL.revokeObjectURL(enlace.href)
      })
      .catch(() => {})
      .finally(() => setOcupado(false))
  }

  const importar = async (archivo: File) => {
    let exportacion: object
    try {
      exportacion = JSON.parse(await archivo.text()) as object
    } catch {
      notification.error({ title: 'El archivo no es un JSON válido' })
      return
    }
    setOcupado(true)
    try {
      const { importadas, imagenes } = await ConfiguracionPeticiones.importar(exportacion)
      notification.success({
        title: 'Configuración importada',
        description: `Secciones: ${importadas.join(', ') || '—'}. Imágenes: ${imagenes.join(', ') || '—'}.`,
      })
      await useMarcaStore.getState().cargar()
      alImportar()
    } catch {
      // El interceptor de axios ya mostró el error (el API no cambia nada si el archivo no valida).
    } finally {
      setOcupado(false)
    }
  }

  return (
    <Flex gap={8}>
      <Button icon={<DownloadOutlined />} onClick={exportar} loading={ocupado}>
        Exportar
      </Button>
      <Upload
        accept="application/json,.json"
        showUploadList={false}
        beforeUpload={archivo => {
          void importar(archivo)
          return false
        }}
      >
        <Button icon={<UploadOutlined />} disabled={ocupado}>
          Importar
        </Button>
      </Upload>
    </Flex>
  )
}
