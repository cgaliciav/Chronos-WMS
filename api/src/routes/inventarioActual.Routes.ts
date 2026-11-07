import { Router } from "express";
import InventarioActualController from "../controllers/InventarioActual.Controller";
import { checkJwt } from "../middlewares/verificarJwt";
import { checkRole } from "../middlewares/verificarRol";

const router = Router();

//Get all users

//Lista de InventarioActuals de un producto.
// router.get("/list",[checkJwt], InventarioActualController.lista);
// router.post("/list-catalog",[checkJwt], InventarioActualController.listaCatalogo);
// router.post("/list-catalog-by-code",[checkJwt], InventarioActualController.listaCatalogoPorCodigo);
// router.post("/list-catalog-deregister",[checkJwt], InventarioActualController.listaCatalogoBajas);

router.delete("/delete",[checkJwt,checkRole(["ADMINISTRADOR","INVENTARIOACTUAL-BORRAR"])], InventarioActualController.borrar);

router.get("/:id([0-9]+)",[checkJwt,checkRole(["ADMINISTRADOR","INVENTARIOACTUAL-DETALLE"])],InventarioActualController.obtenerId)
router.put("/edit",[checkJwt,checkRole(["ADMINISTRADOR","INVENTARIOACTUAL-EDITAR"])], InventarioActualController.editar);

router.post("/list-catalog-general",[checkJwt,checkRole(["ADMINISTRADOR","INVENTARIOACTUAL-CATALOGOGENERAL"])], InventarioActualController.busquedaCatalogoGeneral);
router.post("/list-catalog-codes",[checkJwt,checkRole(["ADMINISTRADOR","INVENTARIOACTUAL-CATALOGOCODIGOS"])], InventarioActualController.busquedaCatalogoCodigo);
router.post("/list-catalog-deregister",[checkJwt,checkRole(["ADMINISTRADOR","INVENTARIOACTUAL-CATALOGOBAJAS"])], InventarioActualController.busquedaCatalogoBajas);
router.post("/list-catalog-project",[checkJwt,checkRole(["ADMINISTRADOR","INVENTARIOACTUAL-CATALOGOPROYECTOS"])], InventarioActualController.busquedaCatalogoProyecto);
router.post("/list-catalog-invoices",[checkJwt,checkRole(["ADMINISTRADOR","INVENTARIOACTUAL-CATALOGOFACTURAS"])], InventarioActualController.busquedaCatalogoFacturas);

router.post("/get-activity-inventory",[checkJwt,checkRole(["ADMINISTRADOR","INVENTARIOACTUAL-LISTADOMOVIMIENTOSINVENTARIO"])], InventarioActualController.obtenerMovimientosInventario);

router.get("/export-to-supabase/:id([0-9]+)",[checkJwt,checkRole(["ADMINISTRADOR"])], InventarioActualController.export2Supabase);


export default router;