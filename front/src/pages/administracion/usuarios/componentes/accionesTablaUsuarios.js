
import { notification } from "antd";
import UsuarioPeticiones from "services/axios/usuarios";


export default class AccionesTablaUsuario{
  static regenerarUsuario=(correo)=>{
    UsuarioPeticiones.regenerarPassword(correo)
      .then((respuesta) => {
        // console.log(respuesta)
        notification.success({
          message: `Nuevo pwd:${respuesta.c}`,
          description: 'El nuevo password fue enviado al correo del usuario.',
          duration:0, // mantiene la notificacion abierta
        })
      })
      .catch(error => {
        notification.error({
          message: error.message,
          // description: error.message,
        })
      })
  }

  static inhabilitarUsuario=(id)=>{
    UsuarioPeticiones.inhabilitar(id)
      .then(() => {
        notification.success({
          message: 'Usuario inhabilidato correctamente',
          description: 'El usuario ya no tendrá acceso al sistema',
        })
        document.location.reload();
        // const { pagination } = this.state
        // this.fetch({ pagination })
      })
      .catch(error => {
        notification.error({
          message: error.message,
          // description: error.message,
        })
      })

  }

}