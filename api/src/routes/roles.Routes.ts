import { Router } from "express";
import RolController from "../controllers/Rol.Controller";
import { checkJwt } from "../middlewares/verificarJwt";
import { checkRole } from "../middlewares/verificarRol";

const router = Router();


router.get("/list-names",[checkJwt,checkRole(["ADMINISTRADOR","ROL-LISTASIMPLE"])], RolController.listaSimple);
router.get("/list-names-dynamic",[checkJwt,checkRole(["ADMINISTRADOR","ROL-LISTADINAMICA"])], RolController.listaSimpleCompletaDinamica);

export default router;