import { Router } from "express";

import ProductoCaracteristicaController from "../controllers/ProductoCaractetistica.Controller";
import { checkJwt } from "../middlewares/verificarJwt";
import { checkRole } from "../middlewares/verificarRol";

const router = Router();

router.post("/new",[checkJwt,checkRole(["ADMINISTRADOR","PRODUCTOCARACTERISTICAS-NUEVO"])],ProductoCaracteristicaController.nuevo)

router.put("/edit",[checkJwt,checkRole(["ADMINISTRADOR","PRODUCTOCARACTERISTICAS-EDITAR"])],ProductoCaracteristicaController.editar)

router.delete("/remove",[checkJwt,checkRole(["ADMINISTRADOR","PRODUCTOCARACTERISTICAS-BORRAR"])],ProductoCaracteristicaController.borrar)


export default router;
