import { Router } from "express";
import ComentarioController from "../controllers/Comentario.Controller";
import { checkJwt } from "../middlewares/verificarJwt";
import { checkRole } from "../middlewares/verificarRol";

const router = Router();

router.post("/new",[checkJwt,checkRole(["ADMINISTRADOR","COMENTARIO-NUEVO"])],ComentarioController.agregarComentario) // esta peticion tiene que ser post por requerimiento del componente.
router.delete("/comment",[checkJwt,checkRole(["ADMINISTRADOR","COMENTARIO-BORRAR"])],ComentarioController.quitarComentario)


export default router;