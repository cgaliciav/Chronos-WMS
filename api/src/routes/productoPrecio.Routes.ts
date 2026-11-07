import { Router } from "express";

import ProductoPrecioController from "../controllers/ProductoPrecio.Controller";
import { checkJwt } from "../middlewares/verificarJwt";
import { checkRole } from "../middlewares/verificarRol";

const router = Router();

router.put("/edit",[checkJwt,checkRole(["ADMINISTRADOR","PRODUCTOPRECIO-EDITAR"])],ProductoPrecioController.editar)


export default router;
