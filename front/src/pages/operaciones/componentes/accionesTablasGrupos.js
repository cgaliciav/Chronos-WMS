import { notification } from 'antd'
// import { useNavigate } from 'react-router'
import GrupoPeticiones from 'services/axios/grupos'

export default class AccionesTablasGrupos {
  static eliminarListado = id => {
    GrupoPeticiones.quitar({grupoId:id})
      .then((resp) => {
        if(resp!==undefined){
          notification.success({
            message: 'Grupo eliminado correctamente',
          })
          // const navigate = useNavigate();
          // history.go(0)
          document.location.reload()
        }
      })
      .catch(() => {}) // El interceptor de axios ya mostró el error.
      // .catch(error => {
      //   notification.error({
      //     message: error.message,
      //     // description: error.message,
      //   })
      // })
  }
}
