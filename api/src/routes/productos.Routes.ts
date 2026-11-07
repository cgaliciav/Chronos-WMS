import { Router } from "express";
import multer from 'multer'
import ProductoController from "../controllers/Producto.Controller";
import { checkJwt } from "../middlewares/verificarJwt";
import { checkRole } from "../middlewares/verificarRol";

const router = Router();

const upload = multer({ dest: process.env.UPLOADS })
//Get all users

router.post("/file",[checkJwt,checkRole(["ADMINISTRADOR","PRODUCTOS-ARCHIVOSUBIR"])],upload.single('file'),ProductoController.agregarArchivo) // esta peticion tiene que ser post por requerimiento del componente.
router.delete("/file",[checkJwt,checkRole(["ADMINISTRADOR","PRODUCTOS-ARCHIVOBORRAR"])],ProductoController.quitarArchivo)

router.put("/comment",[checkJwt,checkRole(["ADMINISTRADOR","PRODUCTOS-COMENTARIONUEVO"])],ProductoController.agregarComentario)
router.delete("/comment",[checkJwt,checkRole(["ADMINISTRADOR","PRODUCTOS-COMENTARIOBORRAR"])],ProductoController.quitarComentario)

router.put("/edit",[checkJwt,checkRole(["ADMINISTRADOR","PRODUCTOS-EDITAR"])],ProductoController.editar)

export default router;