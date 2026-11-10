import type { CSSProperties, MouseEventHandler } from 'react'
import { Button, Carousel } from 'antd'
import { ExpandOutlined } from '@ant-design/icons'
import { apiURLBase, conToken } from 'services/axios'
import type { ArchivoId } from './tipos'
import styles from './style.module.css'

export interface ImagenesEnCarruselProps {
  /** Archivos a mostrar; sin archivos se muestra la imagen «sin foto». */
  archivos?: ArchivoId[]
  /** Ruta del API que sirve la imagen (`file/`, `file/catalog/`, `file/review/`…), a la que se añade el id. */
  rutaEnApi: string
  /** Muestra un botón para ampliar la imagen (`onClickImagen`). */
  hacerGrande?: boolean
  onClickImagen?: MouseEventHandler<HTMLElement>
  /**
   * Imagen cuadrada (1:1) sin recortar: todas las tarjetas de una cuadrícula miden lo mismo aunque la foto o la imagen
   * «sin foto» tengan otra proporción.
   */
  cuadrada?: boolean
}

const ImagenesEnCarrusel = ({
  archivos = [],
  rutaEnApi,
  hacerGrande = false,
  onClickImagen,
  cuadrada = false,
}: ImagenesEnCarruselProps) => {
  const estiloImagen: CSSProperties = cuadrada
    ? { width: '100%', aspectRatio: '1 / 1', objectFit: 'contain', display: 'block' }
    : { width: '100%', margin: 'auto' }
  return (
    <div className={styles.carousel}>
      <Carousel>
        {archivos.length === 0 ? (
          <img
            alt=""
            src="/resources/images/no-photo-available.svg"
            style={cuadrada ? estiloImagen : undefined}
          />
        ) : (
          archivos.map(arch => {
            const source = new URL(`${arch.id}`, new URL(rutaEnApi, apiURLBase))
            return (
              <div key={arch.id}>
                {hacerGrande ? (
                  <Button
                    type="primary"
                    icon={<ExpandOutlined />}
                    className={styles.masGrande}
                    size="middle"
                    ghost
                    onClick={onClickImagen}
                  />
                ) : null}
                <img alt="" src={conToken(source.href)} style={estiloImagen} />
              </div>
            )
          })
        )}
      </Carousel>
    </div>
  )
}

export default ImagenesEnCarrusel
