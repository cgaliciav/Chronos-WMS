import { Router } from "express";
import ReportesController from "../controllers/Reportes.Controller";
import { checkJwt } from "../middlewares/verificarJwt";
import { checkRole } from "../middlewares/verificarRol";

const router = Router();

//Get all users

router.post("/by-group",[checkJwt,checkRole(["ADMINISTRADOR","REPORTE-GRUPO"])], ReportesController.reportePorGrupo);
router.post("/by-project",[checkJwt,checkRole(["ADMINISTRADOR","REPORTE-PROYECTO"])], ReportesController.reportePorProyecto);
router.post("/by-project-final",[checkJwt,checkRole(["ADMINISTRADOR","REPORTE-CIERRE"])], ReportesController.reporteCierre);
router.post("/by-use",[checkJwt,checkRole(["ADMINISTRADOR","REPORTE-USO"])], ReportesController.reportePorUso);
router.post("/by-group-detail",[checkJwt,checkRole(["ADMINISTRADOR","REPORTE-GRUPODETALLE"])], ReportesController.reportePorGrupoDetalle);
router.post("/by-invoice",[checkJwt,checkRole(["ADMINISTRADOR","REPORTE-FACTURA"])], ReportesController.reportePorFactura);
router.post("/by-inventory",[checkJwt,checkRole(["ADMINISTRADOR","REPORTE-INVENTARIO"])], ReportesController.reporteDeInventario);

export default router;