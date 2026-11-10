import { Router } from "express";
import ProveedorController from "../controllers/Proveedor.Controller";
import { checkJwt } from "../middlewares/verificarJwt";
import { checkRole } from "../middlewares/verificarRol";
import { soloDigitos } from "../middlewares/rutas";

const router = Router();


router.get("/list-names",[checkJwt,checkRole(["ADMINISTRADOR","PROVEEDOR-LISTASIMPLE"])], ProveedorController.listaSimple);
router.post("/list-dynamic",[checkJwt,checkRole(["ADMINISTRADOR","PROVEEDOR-LISTADINAMICA"])], ProveedorController.listaSimpleCompletaDinamica);
router.post("/list-antd",[checkJwt,checkRole(["ADMINISTRADOR","PROVEEDOR-LISTADETALLE"])], ProveedorController.listaTabla);
router.get("/:id", soloDigitos("id"), [checkJwt,checkRole(["ADMINISTRADOR","PROVEEDOR-DETALLE"])],ProveedorController.obtenerId)
router.put("/edit",[checkJwt,checkRole(["ADMINISTRADOR","PROVEEDOR-EDITAR"])],ProveedorController.editar)
router.post("/new",[checkJwt,checkRole(["ADMINISTRADOR","PROVEEDOR-NUEVO"])],ProveedorController.nuevo)
router.put("/disable/:id", soloDigitos("id"), [checkJwt,checkRole(["ADMINISTRADOR","PROVEEDOR-DESHABILITAR"])],ProveedorController.deshabilitar)
router.put("/enable/:id", soloDigitos("id"), [checkJwt,checkRole(["ADMINISTRADOR","PROVEEDOR-HABILITAR"])],ProveedorController.habilitar)

router.post("/comment",[checkJwt,checkRole(["ADMINISTRADOR","PROVEEDOR-COMENTARIONUEVO"])],ProveedorController.agregarComentario)
router.delete("/comment",[checkJwt,checkRole(["ADMINISTRADOR","PROVEEDOR-COMENTARIOBORRAR"])],ProveedorController.quitarComentario)

export default router;