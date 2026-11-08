
import { notification } from "antd";
import ProyectoPeticiones from "services/axios/proyectos";


export default class AccionesTablaProyectos{

  static inhabilitarProyecto=(id)=>{
    ProyectoPeticiones.inhabilitar(id)
      .then(() => {
        notification.success({
          title: 'Proyecto inhabilitado correctamente',
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