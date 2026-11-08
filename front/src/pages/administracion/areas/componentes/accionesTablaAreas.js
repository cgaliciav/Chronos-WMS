import { notification } from 'helpers/feedback'
import AreaPeticiones from 'services/axios/areas'

export default class AccionesTablaProveedores {
  static inhabilitarArea = id => {
    AreaPeticiones.inhabilitar(id)
      .then(() => {
        notification.success({
          message: 'Area inhabilitada correctamente',
        })
        document.location.reload()
      })
      .catch(() => {
        // El interceptor de axios ya mostró el error.
      })
  }
}
