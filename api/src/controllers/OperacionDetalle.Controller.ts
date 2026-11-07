import { getRepository } from "typeorm";
import { OperacionDetalle } from "../entity/OperacionDetalle";

class OperacionDetalleController {
  static guardar = async (
    precioUnitario: number | string,
    precioTotal: number | string,
    sesionId: number,
    moneda: string = "MXP"
  ) => {
    const operacionDetalle = new OperacionDetalle();
    operacionDetalle.precioTotal = +precioTotal;
    operacionDetalle.precioUnitario = +precioUnitario;
    operacionDetalle.sesionId = sesionId;
    operacionDetalle.moneda = moneda;

    return await getRepository(OperacionDetalle).save(operacionDetalle);
  };

  static quitar = async (
    operacionDetalle: OperacionDetalle | undefined,
    sesionId: number
  ) => {
    if (operacionDetalle !== undefined && operacionDetalle !== null) {
      operacionDetalle.sesionId = sesionId;
      await getRepository(OperacionDetalle).remove(operacionDetalle);
    }
  };
}

export default OperacionDetalleController;
