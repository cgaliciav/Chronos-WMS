import { notification } from 'helpers/feedback'
import BodegaPeticiones from 'services/axios/bodegas'

export default class AccionesTablaProveedores {
  static inhabilitarBodega = id => {
    BodegaPeticiones.inhabilitar(id)
      .then(() => {
        notification.success({
          message: 'Bodega inhabilitada correctamente',
        })
        document.location.reload()
      })
      .catch(() => {
        // El interceptor de axios ya mostró el error.
      })
  }
}
