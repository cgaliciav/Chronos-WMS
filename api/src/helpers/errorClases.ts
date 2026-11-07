
export class AppError extends Error {
    statusCode:number;
    status:string;
    // isOperational:boolean;

    constructor(message:string, statusCode?:number) {
      super(message); 
  
      this.statusCode = statusCode || 500;
      switch(statusCode){
        case 401:
          this.status="Sin autorización";
          break;
        case 402:
          this.status="Pago requerido";
          break;
        case 403:
          this.status="Prohibido";
          break;
        case 404:
          this.status="Recurso no encontrado";
          break;
        case 405:
          this.status="Método no permitido";
          break;
        case 408:
          this.status="Solicitud expirada";
          break;
        default:
          this.status = `${statusCode}`.startsWith('4') ? `${statusCode} Solicitud Incorrecta` : `${statusCode} Error en servidor`;
      }
      
      Error.captureStackTrace(this, this.constructor);
    }
  }