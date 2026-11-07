import { notification } from 'antd'
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
      .catch(error => {
        notification.error({
          message: error.message,
          // description: error.message,
        })
      })
  }
}
