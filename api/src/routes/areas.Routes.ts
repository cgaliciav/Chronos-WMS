import { Router } from "express";
import AreaController from "../controllers/Area.Controller";
import { checkJwt } from "../middlewares/verificarJwt";
import { checkRole } from "../middlewares/verificarRol";
import { soloDigitos } from "../middlewares/rutas";

const router = Router();

//Get all users


router.get("/list-names",[checkJwt,checkRole(["ADMINISTRADOR","AREA-LISTASIMPLE"])], AreaController.listaSimple);
router.post("/list-antd",[checkJwt,checkRole(["ADMINISTRADOR","AREA-LISTADETALLE"])], AreaController.listaTabla);
router.get("/:id", soloDigitos("id"), [checkJwt,checkRole(["ADMINISTRADOR","AREA-DETALLE"])],AreaController.obtenerId)
router.put("/disable/:id", soloDigitos("id"), [checkJwt,checkRole(["ADMINISTRADOR","AREA-DESHABILITAR"])],AreaController.deshabilitar)
router.put("/enable/:id", soloDigitos("id"), [checkJwt,checkRole(["ADMINISTRADOR","AREA-HABILITAR"])],AreaController.habilitar)
router.put("/edit",[checkJwt,checkRole(["ADMINISTRADOR","AREA-EDITAR"])],AreaController.editar)
router.post("/new",[checkJwt,checkRole(["ADMINISTRADOR","AREA-NUEVO"])],AreaController.nuevo)


export default router;