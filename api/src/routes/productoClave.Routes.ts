import { Router } from "express";

import ProductoClaveController from "../controllers/ProductoClave.Controller";
import { checkJwt } from "../middlewares/verificarJwt";
import { checkRole } from "../middlewares/verificarRol";

const router = Router();

router.post("/new",[checkJwt,checkRole(["ADMINISTRADOR","PRODUCTOCLAVE-NUEVO"])],ProductoClaveController.nuevo)

router.post("/new-self-generated",[checkJwt,checkRole(["ADMINISTRADOR","PRODUCTOCLAVE-NUEVOAUTOGENERADO"])],ProductoClaveController.nuevoAutogenerado)

router.delete("/remove",[checkJwt,checkRole(["ADMINISTRADOR","PRODUCTOCLAVE-BORRAR"])],ProductoClaveController.borrar)



export default router;
