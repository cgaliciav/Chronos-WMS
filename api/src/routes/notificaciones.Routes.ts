import { Router } from "express";
import NotificacionController from "../controllers/Notificacion.Controller";
import { soloDigitos } from "../middlewares/rutas";
import { checkJwt, checkJwtConsulta } from "../middlewares/verificarJwt";

/**
 * Notificaciones propias (plan 02 · fase 7). Solo token, sin rol: cada usuario ve y marca únicamente las suyas.
 * `stream` acepta el token en `?auth=` porque `EventSource` no envía cabeceras.
 */
const router = Router();

router.get("/", [checkJwt], NotificacionController.listar);
router.get("/count", [checkJwt], NotificacionController.contar);
router.get("/stream", [checkJwtConsulta], NotificacionController.stream);
router.put("/read-all", [checkJwt], NotificacionController.marcarTodas);
router.put("/:id/read", soloDigitos("id"), [checkJwt], NotificacionController.marcarLeida);

export default router;
