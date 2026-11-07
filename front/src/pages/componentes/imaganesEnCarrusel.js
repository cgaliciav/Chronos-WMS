import React from 'react'
import { Button, Carousel } from 'antd'
import { apiURLBase } from 'services/axios'
import styles from './style.module.scss'

const ImagenesEnCarrusel = ({ archivos, rutaEnApi, hacerGrande, onClickImagen }) => {
  return (
    <div className={styles.carousel}>
      <Carousel>
        {archivos.length === 0 ? (
          <img alt="" src="resources/images/no-photo-available.png" />
        ) : (
          archivos.map(arch => {
            const source = new URL(`${arch.id}`, new URL(rutaEnApi, apiURLBase))
            // console.log("source.href",source.href,rutaEnApi,apiURLBase);
            return (
              <div key={`dci${Math.random()}`}>
                {hacerGrande ? (
                  <Button
                    type="primary"
                    icon={<i className="icmn icmn-enlarge" />}
                    className={styles.masGrande}
                    size="default"
                    ghost
                    onClick={onClickImagen}
                  />
                ) : null}
                <img alt="" src={source.href} style={{ width: '100%', margin: 'auto' }} />
              </div>
            )
          })
        )}
      </Carousel>
    </div>
  )
}

export default ImagenesEnCarrusel
