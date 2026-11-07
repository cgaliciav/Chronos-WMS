import { Router } from "express";
import multer from 'multer'

import OperacionController from "../controllers/Operacion.Controller";
import { checkJwt } from "../middlewares/verificarJwt";
import { checkRole } from "../middlewares/verificarRol";

const router = Router();

const upload = multer({ dest: process.env.UPLOADS })

router.put("/edit",[checkJwt,checkRole(["ADMINISTRADOR","OPERACION-EDITAR"])],OperacionController.editar)

router.post("/file",[checkJwt,checkRole(["ADMINISTRADOR","OPERACION-ARCHIVOSUBIR"])],upload.single('file'),OperacionController.agregarArchivo) // esta peticion tiene que ser post por requerimiento del componente.
router.delete("/file",[checkJwt,checkRole(["ADMINISTRADOR","OPERACION-ARCHIVOBORRAR"])],OperacionController.quitarArchivo)

router.put("/comment",[checkJwt,checkRole(["ADMINISTRADOR","OPERACION-COMENTARIONUEVO"])],OperacionController.agregarComentario)
router.delete("/comment",[checkJwt,checkRole(["ADMINISTRADOR","OPERACION-COMENTARIOBORRAR"])],OperacionController.quitarComentario)


export default router;
