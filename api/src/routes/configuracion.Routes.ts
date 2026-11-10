import { Router } from "express";
import multer from "multer";
import ConfiguracionController from "../controllers/Configuracion.Controller";
import { checkJwt } from "../middlewares/verificarJwt";
import { checkRole } from "../middlewares/verificarRol";

/**
 * Configuración por cliente (plan 03 §2.2). `GET /config/public*` no lleva token: lo necesita la pantalla de login y
 * solo contiene lo que se muestra en ella. El resto exige `ADMINISTRADOR` o `CONFIGURACION-EDITAR`.
 */
const router = Router();
const ROLES = ["ADMINISTRADOR", "CONFIGURACION-EDITAR"];
// Imágenes de marca en memoria (se normalizan con sharp y se guardan en `Archivo`): 2 MiB como máximo
const subida = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024, files: 1 } });

router.get("/public", ConfiguracionController.publica);
router.get("/public/logo", ConfiguracionController.imagenPublica("logo"));
router.get("/public/favicon", ConfiguracionController.imagenPublica("favicon"));

router.get("/", [checkJwt, checkRole(ROLES)], ConfiguracionController.todas);
router.post("/marca/logo", [checkJwt, checkRole(ROLES)], subida.single("file"), ConfiguracionController.subirImagen("logo"));
router.post("/marca/favicon", [checkJwt, checkRole(ROLES)], subida.single("file"), ConfiguracionController.subirImagen("favicon"));
router.post("/reportes/logo", [checkJwt, checkRole(ROLES)], subida.single("file"), ConfiguracionController.subirImagen("reportes"));
router.put("/:seccion", [checkJwt, checkRole(ROLES)], ConfiguracionController.guardar);

export default router;
