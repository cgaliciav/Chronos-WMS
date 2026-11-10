import { Router } from "express";
import ProyectoController from "../controllers/Proyecto.Controller";
import { checkJwt } from "../middlewares/verificarJwt";
import { checkRole } from "../middlewares/verificarRol";
import { soloDigitos } from "../middlewares/rutas";

const router = Router();

//Get all users

// TODO Definir nivel de acceso de los usuarios
router.get("/list-names",[checkJwt,checkRole(["ADMINISTRADOR","PROYECTO-LISTASIMPLE"])], ProyectoController.listaSimple);
router.get("/list-names-inbound",[checkJwt,checkRole(["ADMINISTRADOR","PROYECTO-LISTASIMPLEINTERNA"])], ProyectoController.listaSimpleInterna);
router.get("/list-names-outbound",[checkJwt,checkRole(["ADMINISTRADOR","PROYECTO-LISTASIMPLEEXTERNA"])], ProyectoController.listaSimpleExterna);
router.post("/list-antd",[checkJwt,checkRole(["ADMINISTRADOR","PROYECTO-LISTADETALLE"])], ProyectoController.listaTabla);
router.put("/disable/:id", soloDigitos("id"), [checkJwt,checkRole(["ADMINISTRADOR","PROYECTO-DESHABILITAR"])],ProyectoController.deshabilitar)
router.put("/enable/:id", soloDigitos("id"), [checkJwt,checkRole(["ADMINISTRADOR","PROYECTO-HABILITAR"])],ProyectoController.habilitar)
router.get("/:id", soloDigitos("id"), [checkJwt,checkRole(["ADMINISTRADOR","PROYECTO-DETALLE"])],ProyectoController.obtenerId)
router.put("/edit",[checkJwt,checkRole(["ADMINISTRADOR","PROYECTO-EDITAR"])],ProyectoController.editar)
router.post("/new",[checkJwt,checkRole(["ADMINISTRADOR","PROYECTO-NUEVO"])],ProyectoController.nuevo)

router.post("/comment",[checkJwt,checkRole(["ADMINISTRADOR","PROYECTO-COMENTARIONUEVO"])],ProyectoController.agregarComentario)
router.delete("/comment",[checkJwt,checkRole(["ADMINISTRADOR","PROYECTO-COMENTARIOBORRAR"])],ProyectoController.quitarComentario)

export default router;