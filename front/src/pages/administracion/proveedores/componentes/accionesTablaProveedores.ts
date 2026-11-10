import { notification } from 'helpers/feedback'
import ProveedorPeticiones from 'services/axios/proveedores'
import type { Proveedor } from 'types/api'

export default class AccionesTablaProveedores {
  static inhabilitarProveedor = (id: Proveedor['id']) => {
    ProveedorPeticiones.inhabilitar(id)
      .then(() => {
        notification.success({
          title: 'Proveedor inhabilitado correctamente',
        })
        document.location.reload()
      })
      .catch(() => {
        // El interceptor de axios ya mostró el error.
      })
  }
}
