import { useState } from 'react'
import { Button, Flex, Upload } from 'antd'
import { UploadOutlined } from '@ant-design/icons'
import { notification } from 'helpers/feedback'
import ConfiguracionPeticiones, { type SeccionConValor } from 'services/axios/configuracion'
import { useMarcaStore } from 'stores/marca.store'

/** Sube una imagen de marca (PNG, JPEG o WebP; el API la normaliza) y muestra la vista previa. */
export default function SubirImagen({
  destino,
  vistaPrevia,
  texto,
  alSubir,
}: {
  destino: 'marca/logo' | 'marca/favicon' | 'reportes/logo'
  vistaPrevia?: string
  texto: string
  alSubir: (seccion: SeccionConValor) => void
}) {
  const [subiendo, setSubiendo] = useState(false)
  return (
    <Flex align="center" gap={16}>
      {vistaPrevia && (
        <img
          src={vistaPrevia}
          alt={texto}
          style={{ maxHeight: 48, maxWidth: 160, objectFit: 'contain' }}
        />
      )}
      <Upload
        accept="image/png,image/jpeg,image/webp"
        showUploadList={false}
        customRequest={({ file }) => {
          setSubiendo(true)
          ConfiguracionPeticiones.subirImagen(destino, file as File)
            .then(seccion => {
              alSubir(seccion)
              void useMarcaStore.getState().cargar()
              notification.success({ title: 'Imagen guardada' })
            })
            .catch(() => {})
            .finally(() => setSubiendo(false))
        }}
      >
        <Button icon={<UploadOutlined />} loading={subiendo}>
          {texto}
        </Button>
      </Upload>
    </Flex>
  )
}
