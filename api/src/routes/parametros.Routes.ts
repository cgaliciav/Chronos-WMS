import { Router } from "express";

import ParametrosController from "../controllers/Parametros.Controller";
import { checkJwt } from "../middlewares/verificarJwt";
import { checkRole } from "../middlewares/verificarRol";

const router = Router();


router.put("/edit",[checkJwt,checkRole(["ADMINISTRADOR","PARAMETROS-EDITAR"])],ParametrosController.editar)

router.get("/comment",[checkJwt,checkRole(["ADMINISTRADOR","PARAMETROS-LISTAR"])],ParametrosController.listaSimpleInterna)


export default router;
