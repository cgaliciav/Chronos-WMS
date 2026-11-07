import { Router } from "express";
// import * as multer from 'multer'
import MovimientoController from "../controllers/Movimiento.Controller";
import { checkJwt } from "../middlewares/verificarJwt";
import { checkRole } from "../middlewares/verificarRol";

const router = Router();

// const upload = multer({ dest: process.env.UPLOADS })

router.get("/prior-activity/:id([0-9]+)",[checkJwt,checkRole(["ADMINISTRADOR","MOVIMIENTO-ULTIMOMOVIMIENTO"])],MovimientoController.obtenerUltimoMovimiento)
router.get("/get-group/:id([0-9]+)",[checkJwt,checkRole(["ADMINISTRADOR","MOVIMIENTO-OBTENERGRUPO"])],MovimientoController.obtenerGrupo)
router.get("/:id([0-9]+)",[checkJwt,checkRole(["ADMINISTRADOR","MOVIMIENTO-DETALLE"])],MovimientoController.obtenerId)
router.get("/history-by-current-inventory/:id([0-9]+)",[checkJwt,checkRole(["ADMINISTRADOR","MOVIMIENTO-HISTORIAL"])],MovimientoController.obtenerHistorialMovimiento)

export default router;