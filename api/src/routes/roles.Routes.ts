import { Router } from "express";
import RolController from "../controllers/Rol.Controller";
import { checkJwt } from "../middlewares/verificarJwt";
import { checkRole } from "../middlewares/verificarRol";

const router = Router();

//Get all users
// TODO Definir nivel de acceso de los usuarios

router.get("/list-names",[checkJwt,checkRole(["ADMINISTRADOR","ROL-LISTASIMPLE"])], RolController.listaSimple);
router.get("/list-names-dynamic",[checkJwt,checkRole(["ADMINISTRADOR","ROL-LISTADINAMICA"])], RolController.listaSimpleCompletaDinamica);
// router.post("/list-antd",[checkJwt,checkRole(["ADMINISTRADOR"])], RolController.listaTabla);
// router.put("/disable/:id([0-9]+)",[checkJwt,checkRole(["ADMINISTRADOR"])],RolController.deshabilitar)
// router.put("/enable/:id([0-9]+)",[checkJwt,checkRole(["ADMINISTRADOR"])],RolController.habilitar)
// router.get("/:id([0-9]+)",[checkJwt,checkRole(["ADMINISTRADOR"])],RolController.obtenerId)
// router.put("/edit",[checkJwt],RolController.editar)
// router.post("/new",[checkJwt,checkRole(["ADMINISTRADOR"])],RolController.nuevo)

export default router;