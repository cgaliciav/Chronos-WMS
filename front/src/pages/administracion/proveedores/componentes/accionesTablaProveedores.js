import { notification } from "antd";
import ProveedorPeticiones from "services/axios/proveedores";


export default class AccionesTablaProveedores{

  static inhabilitarProveedor=(id)=>{
    ProveedorPeticiones.inhabilitar(id)
      .then(() => {
        notification.success({
          title: 'Proveedor inhabilitado correctamente',
        })
        document.location.reload();
      })
      .catch(() => {
        // El interceptor de axios ya mostró el error.
      })

  }

}