import { Router } from "express";
import multer from 'multer'
import ArchivoController, { TAMANO_MAXIMO_ARCHIVO } from "../controllers/Archivo.Controller";
import { checkJwt, checkJwtArchivos } from "../middlewares/verificarJwt";
import { checkRole } from "../middlewares/verificarRol";

const router = Router();

const upload = multer({ dest: process.env.UPLOADS, limits: { fileSize: TAMANO_MAXIMO_ARCHIVO, files: 1 } })

router.delete("/:id([0-9]+)",[checkJwt,checkRole(["ADMINISTRADOR","ARCHIVO-BORRAR"])],ArchivoController.borrar)
// router.get("/:id([0-9]+)",[checkJwt],ArchivoController.obtenerId)
// router.get("/thumbnail/:id([0-9]+)",[checkJwt],ArchivoController.obtenerThumbnailId)
// router.get("/catalog/:id([0-9]+)",[checkJwt],ArchivoController.obtenerCatagoloId)

// Los GET de archivos exigen token (cabecera `auth` o `?auth=`); ARCHIVOS_PUBLICOS=true los deja públicos durante la transición (hallazgos H1, C4).
router.get("/:id([0-9]+)",[checkJwtArchivos],ArchivoController.obtenerId)
router.get("/thumbnail/:id([0-9]+)",[checkJwtArchivos],ArchivoController.obtenerThumbnailId)
router.get("/catalog/:id",[checkJwtArchivos],ArchivoController.obtenerCatagoloId)
router.get("/review/:id",[checkJwtArchivos],ArchivoController.obtenerValidacionId);
router.get("/report/:id",[checkJwtArchivos],ArchivoController.obtenerReporte)

router.post("/file",[checkJwt,checkRole(["ADMINISTRADOR","ARCHIVO-ARCHIVOSUBIR"])],upload.single('file'),ArchivoController.agregarArchivo) // esta peticion tiene que ser post por requerimiento del componente.
router.delete("/file",[checkJwt,checkRole(["ADMINISTRADOR","ARCHIVO-ARCHIVOBORRAR"])],ArchivoController.quitarArchivo)


router.post("/get-response-interface",[checkJwt,checkRole(["ADMINISTRADOR","ARCHIVO-ARCHIVODATOS"])],ArchivoController.obtenerResponseFileDeId)
export default router;