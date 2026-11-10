import { notification } from 'helpers/feedback'
import ProyectoPeticiones from 'services/axios/proyectos'
import type { Proyecto } from 'types/api'

export default class AccionesTablaProyectos {
  static inhabilitarProyecto = (id: Proyecto['id']) => {
    ProyectoPeticiones.inhabilitar(id)
      .then(() => {
        notification.success({
          title: 'Proyecto inhabilitado correctamente',
        })
        document.location.reload()
      })
      .catch(() => {
        // El interceptor de axios ya mostró el error.
      })
  }
}
