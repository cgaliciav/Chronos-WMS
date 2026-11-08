import { notification } from 'helpers/feedback'
import BodegaPeticiones from 'services/axios/bodegas'
import type { Bodega } from 'types/api'

export default class AccionesTablaBodegas {
  static inhabilitarBodega = (id: Bodega['id']) => {
    BodegaPeticiones.inhabilitar(id)
      .then(() => {
        notification.success({
          title: 'Bodega inhabilitada correctamente',
        })
        document.location.reload()
      })
      .catch(() => {
        // El interceptor de axios ya mostró el error.
      })
  }
}
