import { Router } from "express";
import multer from 'multer'
import GrupoController from "../controllers/Grupo.Controller";
import { checkJwt } from "../middlewares/verificarJwt";
import { checkRole } from "../middlewares/verificarRol";
import { validarBody } from "../middlewares/validar";
import { actividadCompraSchema, actividadSchema, agregarOperacionSchema, quitarMovimientoSchema } from "../esquemas";
import { TAMANO_MAXIMO_ARCHIVO } from "../controllers/Archivo.Controller";
// import { conManejoDeErrores } from "../middlewares/manejoErrores";

const router = Router();


const upload = multer({ dest: process.env.UPLOADS, limits: { fileSize: TAMANO_MAXIMO_ARCHIVO, files: 1 } })

//Get all users


router.post("/list-antd",[checkJwt,checkRole(["ADMINISTRADOR","GRUPOS-LISTADETALLE"])], GrupoController.listaTabla);
router.post("/list-by-project-antd",[checkJwt,checkRole(["ADMINISTRADOR","GRUPOS-LISTADETALLE"])], GrupoController.listaTablaMovimientosPorProyecto);

router.post("/list-by-group-antd",[checkJwt,checkRole(["ADMINISTRADOR","GRUPOS-LISTADETALLE"])], GrupoController.listaTablaPorListado);

router.put("/disable/:id([0-9]+)",[checkJwt,checkRole(["ADMINISTRADOR","GRUPOS-DESHABILITAR"])],GrupoController.deshabilitar)
router.put("/enable/:id([0-9]+)",[checkJwt,checkRole(["ADMINISTRADOR","GRUPOS-HABILITAR"])],GrupoController.habilitar)
router.put("/closure/:id([0-9]+)",[checkJwt,checkRole(["ADMINISTRADOR","GRUPOS-FINALIZAR"])],GrupoController.finalizar)

router.get("/:id([0-9]+)",[checkJwt,checkRole(["ADMINISTRADOR","GRUPOS-DETALLE"])], GrupoController.obtenerId)
router.put("/edit",[checkJwt,checkRole(["ADMINISTRADOR","GRUPOS-EDITAR"])],GrupoController.editar)
router.post("/new",[checkJwt,checkRole(["ADMINISTRADOR","GRUPOS-NUEVO"])],GrupoController.nuevo)
router.delete("/remove",[checkJwt,checkRole(["ADMINISTRADOR","GRUPOS-BORRAR"])],GrupoController.borrar)

router.post("/new-details",[checkJwt,checkRole(["ADMINISTRADOR","GRUPOS-NUEVODETALLE"])],GrupoController.nuevoConDetalle)
router.post("/new-purchase",[checkJwt,checkRole(["ADMINISTRADOR","GRUPOS-NUEVOCOMPRA"])],GrupoController.nuevoConCompra)

router.put("/edit-details",[checkJwt,checkRole(["ADMINISTRADOR","GRUPOS-EDITARDETALLE"])],GrupoController.editarConDetalle)
router.put("/edit-purchase",[checkJwt,checkRole(["ADMINISTRADOR","GRUPOS-EDITARCOMPRA"])],GrupoController.editarConCompra)



// router.post("/activity-list",[checkJwt,checkRole(["ADMINISTRADOR","GRUPOS-LISTAMOVIMIENTOS"])],GrupoController.listaTablaMovimientos)
router.post("/activity-list-by-group",[checkJwt,checkRole(["ADMINISTRADOR","GRUPOS-LISTAMOVIMIENTOS"])],GrupoController.listaTablaMovimientosPorGrupo)
router.post("/active-activity-list",[checkJwt,checkRole(["ADMINISTRADOR","GRUPOS-LISTAMOVIMIENTOSACTIVOS"])],GrupoController.listaTablaPendientesActivos)


// router.post("/file",[checkJwt,checkRole(["ADMINISTRADOR","GRUPOS-ARCHIVOSUBIR"])],upload.single('file'),GrupoController.agregarArchivo) // esta peticion tiene que ser post por requerimiento del componente.
// router.delete("/file",[checkJwt,checkRole(["ADMINISTRADOR","GRUPOS-ARCHIVOBORRAR"])],GrupoController.quitarArchivo)


// router.put("/comment",[checkJwt,checkRole(["ADMINISTRADOR","GRUPOS-COMENTARIONUEVO"])],GrupoController.agregarComentario)
// router.delete("/comment",[checkJwt,checkRole(["ADMINISTRADOR","GRUPOS-COMENTARIOBORRAR"])],GrupoController.quitarComentario)

router.put("/activity",[checkJwt,checkRole(["ADMINISTRADOR","GRUPOS-MOVIMIENTONUEVO"]),validarBody(actividadSchema)],GrupoController.agregarMovimiento)
router.put("/activity-purchase",[checkJwt,checkRole(["ADMINISTRADOR","GRUPOS-MOVIMIENTONUEVOCOMPRA"]),validarBody(actividadCompraSchema)],GrupoController.agregarMovimientoCompra)
router.put("/activity-add-transaction",[checkJwt,checkRole(["ADMINISTRADOR","GRUPOS-MOVIMIENTOAGREGAROPERACION"]),validarBody(agregarOperacionSchema)],GrupoController.agregarOperacionAMovimiento)
router.delete("/activity",[checkJwt,checkRole(["ADMINISTRADOR","GRUPOS-QUITARMOVIMIENTO"]),validarBody(quitarMovimientoSchema)],GrupoController.quitarMovimiento)

router.post("/create-list-from-group",[checkJwt,checkRole(["ADMINISTRADOR","GRUPOS-CREARLISTADEGRUPO"])],GrupoController.nuevoListadoDeGrupo)
router.post("/create-list-from-catalog",[checkJwt,checkRole(["ADMINISTRADOR","GRUPOS-CREARLISTADECATALOGOGENERAL"])],GrupoController.nuevoListadoDeCatalogoGeneral)
router.post("/create-list-from-catalog-codes",[checkJwt,checkRole(["ADMINISTRADOR","GRUPOS-CREARLISTADECATALOGOCODIGOS"])],GrupoController.nuevoListadoDeCatalogoCodigo)
router.post("/create-list-from-catalog-deregister",[checkJwt,checkRole(["ADMINISTRADOR","GRUPOS-CREARLISTADECATALOGOBAJAS"])],GrupoController.nuevoListadoDeCatalogoBajas)
router.post("/create-list-from-catalog-projects",[checkJwt,checkRole(["ADMINISTRADOR","GRUPOS-CREARLISTADECATALOGOPROYECTOS"])],GrupoController.nuevoListadoDeCatalogoProyectos)
router.post("/create-list-from-catalog-invoices",[checkJwt,checkRole(["ADMINISTRADOR","GRUPOS-CREARLISTADEFACTURAS"])],GrupoController.nuevoListadoDeCatalogoFacturas)
router.post("/create-list-from-active-activity-list",[checkJwt,checkRole(["ADMINISTRADOR","GRUPOS-CREARLISTADEPENDIENTESACTIVOS"])],GrupoController.nuevoListadoDePendientesActivos)
router.post("/create-list-from-report-use",[checkJwt,checkRole(["ADMINISTRADOR","GRUPOS-CREARLISTADEREPORTEUSO"])],GrupoController.nuevoListadoDeReporteUso)
router.post("/create-list-from-report-activity",[checkJwt,checkRole(["ADMINISTRADOR","GRUPOS-CREARLISTADEREPORTEOPERACIONES"])],GrupoController.nuevoListadoDeReporteMovimiento)

router.post("/similar-names-count",[checkJwt],GrupoController.obtenerCanteoNombresSimilares)



export default router;