import { notification } from 'helpers/feedback'
import AreaPeticiones from 'services/axios/areas'
import type { Area } from 'types/api'

export default class AccionesTablaAreas {
  static inhabilitarArea = (id: Area['id']) => {
    AreaPeticiones.inhabilitar(id)
      .then(() => {
        notification.success({
          title: 'Area inhabilitada correctamente',
        })
        document.location.reload()
      })
      .catch(() => {
        // El interceptor de axios ya mostró el error.
      })
  }
}
