import { Router } from "express";
import UsuarioController from "../controllers/Usuario.Controller";
import { checkJwt } from "../middlewares/verificarJwt";
import { checkRole } from "../middlewares/verificarRol";
import { validarBody } from "../middlewares/validar";
import { regenerarPasswordSchema, usuarioEditarSchema, usuarioNuevoSchema } from "../esquemas";

const router = Router();

//Get all users

router.get("/list-names",[checkJwt,checkRole(["ADMINISTRADOR","USUARIO-LISTASIMPLE"])], UsuarioController.listaSimple);
router.get("/list-names-full",[checkJwt,checkRole(["ADMINISTRADOR","USUARIO-LISTASIMPLECOMPLETA"])], UsuarioController.listaSimpleCompleto);
router.post("/list-names-dynamic",[checkJwt,checkRole(["ADMINISTRADOR","USUARIO-LISTADINAMICA"])], UsuarioController.listaSimpleCompletaDinamica);
router.post("/list-antd",[checkJwt,checkRole(["ADMINISTRADOR","USUARIO-LISTADETALLE"])], UsuarioController.listaTabla);
router.put("/disable/:id([0-9]+)",[checkJwt,checkRole(["ADMINISTRADOR","USUARIO-DEHABILITAR"])],UsuarioController.deshabilitar)
router.put("/enable/:id([0-9]+)",[checkJwt,checkRole(["ADMINISTRADOR","USUARIO-HABILITAR"])],UsuarioController.habilitar)
router.get("/:id([0-9]+)",[checkJwt,checkRole(["ADMINISTRADOR","USUARIO-DETALLE"])],UsuarioController.obtenerId)
router.put("/edit",[checkJwt,checkRole(["ADMINISTRADOR","USUARIO-EDITAR"]),validarBody(usuarioEditarSchema)],UsuarioController.editar)
router.post("/new",[checkJwt,checkRole(["ADMINISTRADOR","USUARIO-NUEVO"]),validarBody(usuarioNuevoSchema)],UsuarioController.nuevo)

router.post("/comment",[checkJwt,checkRole(["ADMINISTRADOR","USUARIO-COMENTARIONUEVO"])],UsuarioController.agregarComentario)
router.delete("/comment",[checkJwt,checkRole(["ADMINISTRADOR","USUARIO-COMENTARIOBORRAR"])],UsuarioController.quitarComentario)

router.get("/current",[checkJwt], UsuarioController.actual);
router.put("/renewpassword",[checkJwt,checkRole(["ADMINISTRADOR","USUARIO-GENERERARPASSWORD"]),validarBody(regenerarPasswordSchema)],UsuarioController.regenerarPassword)
router.put("/password",[checkJwt],UsuarioController.cambiarPassword)

router.get("/get-areas",[checkJwt],UsuarioController.obtenerAreas)
router.get("/get-warehouses",[checkJwt],UsuarioController.obtenerBodegas)
router.get("/get-projects",[checkJwt],UsuarioController.obtenerProyectos)

export default router;