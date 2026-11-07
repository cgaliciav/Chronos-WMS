import { Router } from "express";
import multer from 'multer'
import ArchivoController from "../controllers/Archivo.Controller";
import { checkJwt } from "../middlewares/verificarJwt";
import { checkRole } from "../middlewares/verificarRol";

const router = Router();

const upload = multer({ dest: process.env.UPLOADS })

router.delete("/:id([0-9]+)",[checkJwt,checkRole(["ADMINISTRADOR","ARCHIVO-BORRAR"])],ArchivoController.borrar)
// router.get("/:id([0-9]+)",[checkJwt],ArchivoController.obtenerId)
// router.get("/thumbnail/:id([0-9]+)",[checkJwt],ArchivoController.obtenerThumbnailId)
// router.get("/catalog/:id([0-9]+)",[checkJwt],ArchivoController.obtenerCatagoloId)

router.get("/:id",ArchivoController.obtenerId)
router.get("/thumbnail/:id",ArchivoController.obtenerThumbnailId)
router.get("/catalog/:id",ArchivoController.obtenerCatagoloId)
router.get("/review/:id", ArchivoController.obtenerValidacionId);
router.get("/report/:id",ArchivoController.obtenerReporte)

router.post("/file",[checkJwt,checkRole(["ADMINISTRADOR","ARCHIVO-ARCHIVOSUBIR"])],upload.single('file'),ArchivoController.agregarArchivo) // esta peticion tiene que ser post por requerimiento del componente.
router.delete("/file",[checkJwt,checkRole(["ADMINISTRADOR","ARCHIVO-ARCHIVOBORRAR"])],ArchivoController.quitarArchivo)


router.post("/get-response-interface",[checkJwt,checkRole(["ADMINISTRADOR","ARCHIVO-ARCHIVODATOS"])],ArchivoController.obtenerResponseFileDeId)
export default router;