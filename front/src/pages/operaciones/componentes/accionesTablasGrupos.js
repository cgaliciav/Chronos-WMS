import { notification } from 'antd'
// import { useHistory } from 'react-router-dom'
import GrupoPeticiones from 'services/axios/grupos'

export default class AccionesTablasGrupos {
  static eliminarListado = id => {
    GrupoPeticiones.quitar({grupoId:id})
      .then((resp) => {
        if(resp!==undefined){
          notification.success({
            message: 'Grupo eliminado correctamente',
          })
          // const history = useHistory();
          // history.go(0)
          document.location.reload()
        }
      })
      // .catch(error => {
      //   notification.error({
      //     message: error.message,
      //     // description: error.message,
      //   })
      // })
  }
}
