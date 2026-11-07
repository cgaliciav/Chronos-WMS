
import { notification } from "antd";
import ProyectoPeticiones from "services/axios/proyectos";


export default class AccionesTablaProyectos{

  static inhabilitarProyecto=(id)=>{
    ProyectoPeticiones.inhabilitar(id)
      .then(() => {
        notification.success({
          message: 'Proyecto inhabilitado correctamente',
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