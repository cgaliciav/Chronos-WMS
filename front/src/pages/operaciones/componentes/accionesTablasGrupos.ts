import { notification } from 'helpers/feedback'
import GrupoPeticiones from 'services/axios/grupos'

export default class AccionesTablasGrupos {
  static eliminarListado = (id: number | string) => {
    GrupoPeticiones.quitar({ grupoId: id })
      .then(resp => {
        if (resp !== undefined) {
          notification.success({
            title: 'Grupo eliminado correctamente',
          })
          document.location.reload()
        }
      })
      .catch(() => {}) // El interceptor de axios ya mostró el error.
  }
}
