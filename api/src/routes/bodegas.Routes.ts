import { Router } from "express";
import BodegaController from "../controllers/Bodega.Controller";
import { checkJwt } from "../middlewares/verificarJwt";
import { checkRole } from "../middlewares/verificarRol";
import { soloDigitos } from "../middlewares/rutas";

const router = Router();

//Get all users


router.get("/list-names",[checkJwt,checkRole(["ADMINISTRADOR","BODEGA-LISTASIMPLE"])], BodegaController.listaSimple);
router.post("/list-antd",[checkJwt,checkRole(["ADMINISTRADOR","BODEGA-LISTADETALLE"])], BodegaController.listaTabla);
router.get("/:id", soloDigitos("id"), [checkJwt,checkRole(["ADMINISTRADOR","BODEGA-DETALLE"])],BodegaController.obtenerId)
router.put("/disable/:id", soloDigitos("id"), [checkJwt,checkRole(["ADMINISTRADOR","BODEGA-DESHABILITAR"])],BodegaController.deshabilitar)
router.put("/enable/:id", soloDigitos("id"), [checkJwt,checkRole(["ADMINISTRADOR","BODEGA-HABILITAR"])],BodegaController.habilitar)
router.put("/edit",[checkJwt,checkRole(["ADMINISTRADOR","BODEGA-EDITAR"])],BodegaController.editar)
router.post("/new",[checkJwt,checkRole(["ADMINISTRADOR","BODEGA-NUEVO"])],BodegaController.nuevo)

export default router;