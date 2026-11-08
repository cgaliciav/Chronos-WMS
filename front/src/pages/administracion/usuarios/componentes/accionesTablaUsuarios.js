
import { notification } from "antd";
import UsuarioPeticiones from "services/axios/usuarios";


export default class AccionesTablaUsuario{
  static regenerarUsuario=(correo)=>{
    UsuarioPeticiones.regenerarPassword(correo)
      .then((respuesta) => {
        // Desde la fase 2 del plan 02 el API ya no devuelve la contraseña: responde { correo, enviado }.
        notification.success({
          title: 'Contraseña regenerada',
          description: `La nueva contraseña fue enviada por correo a ${respuesta?.correo ?? correo}.`,
          duration:0, // mantiene la notificacion abierta
        })
      })
      .catch(() => {
        // El interceptor de axios ya mostró el error.
      })
  }

  static inhabilitarUsuario=(id)=>{
    UsuarioPeticiones.inhabilitar(id)
      .then(() => {
        notification.success({
          title: 'Usuario inhabilidato correctamente',
          description: 'El usuario ya no tendrá acceso al sistema',
        })
        document.location.reload();
        // const { pagination } = this.state
        // this.fetch({ pagination })
      })
      .catch(() => {
        // El interceptor de axios ya mostró el error.
      })

  }

}