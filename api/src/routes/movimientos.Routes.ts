import { Router } from "express";
// import * as multer from 'multer'
import MovimientoController from "../controllers/Movimiento.Controller";
import { checkJwt } from "../middlewares/verificarJwt";
import { checkRole } from "../middlewares/verificarRol";
import { soloDigitos } from "../middlewares/rutas";

const router = Router();


router.get("/prior-activity/:id", soloDigitos("id"), [checkJwt,checkRole(["ADMINISTRADOR","MOVIMIENTO-ULTIMOMOVIMIENTO"])],MovimientoController.obtenerUltimoMovimiento)
router.get("/get-group/:id", soloDigitos("id"), [checkJwt,checkRole(["ADMINISTRADOR","MOVIMIENTO-OBTENERGRUPO"])],MovimientoController.obtenerGrupo)
router.get("/:id", soloDigitos("id"), [checkJwt,checkRole(["ADMINISTRADOR","MOVIMIENTO-DETALLE"])],MovimientoController.obtenerId)
router.get("/history-by-current-inventory/:id", soloDigitos("id"), [checkJwt,checkRole(["ADMINISTRADOR","MOVIMIENTO-HISTORIAL"])],MovimientoController.obtenerHistorialMovimiento)
// Plan 02 fase 3: relación entre movimientos
router.get("/:id/chain", soloDigitos("id"), [checkJwt,checkRole(["ADMINISTRADOR","MOVIMIENTO-DETALLE"])],MovimientoController.obtenerCadena)
router.get("/open-by-inventory/:inventarioActualId", soloDigitos("inventarioActualId"), [checkJwt,checkRole(["ADMINISTRADOR","MOVIMIENTO-HISTORIAL"])],MovimientoController.obtenerAbiertosPorInventario)

export default router;