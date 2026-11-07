
import { Router } from "express";
import AuthController from "../controllers/Auth.Controller";


import archivos from "./archivos.Routes";
import areas from "./areas.Routes";
import auth from "./autorizaciones.Routes";
import bodegas from "./bodegas.Routes";
import comentarios from "./comentarios.Routes";
// import facturaDetalle from "./facturaDetalle.Routes";
import facturaTipo from "./facturaTipos.Routes";
import grupos from "./grupos.Routes";
// import grupoDetalle from "./grupoDetalle.Routes";
import inventarioActual from "./inventarioActual.Routes";
// import inventarioActualHistorico from "./inventarioActualHistorico.Routes";
// import inventarioDetalle from "./inventarioDetalle.Routes";
import movimientos from "./movimientos.Routes";
import operacion from "./operacion.Routes";
// import operacionDetalle from "./operacionDetalle.Routes";
import parametros from "./parametros.Routes";
import producto from "./productos.Routes";
import productoCaracteristica from "./productoCaracteristica.Routes";
import productoClave from "./productoClave.Routes";
import productoPrecio from "./productoPrecio.Routes";
import productoValidado from "./productoValidado.Routes" 

import proveedores from "./proveedores.Routes";
import proyectos from "./proyectos.Routes";
import reportes from "./reportes.Routes";
import roles from "./roles.Routes";
import usuarios from "./usuarios.Routes";
import productoInventariado from "./productoInventariado.Routes";


const routes = Router();

routes.use("/file", archivos);
routes.use("/area", areas);
routes.use("/auth", auth);
routes.use("/warehouse", bodegas);
routes.use("/comments", comentarios);

routes.use("/invoice-kind", facturaTipo);
routes.use("/groups", grupos);

routes.use("/current-inventory", inventarioActual);
// routes.use("/current-inventory-log", inventarioActualHistorico);
// routes.use("/inventory-detail", inventarioDetalle);
routes.use("/activity", movimientos);
routes.use("/transaction", operacion);
// routes.use("/transaction-detail", operacionDetalle);
routes.use("/parameters", parametros);
routes.use("/item", producto);
routes.use("/item-spec", productoCaracteristica);
routes.use("/item-code", productoClave);
routes.use("/item-price", productoPrecio);
routes.use("/item-review", productoValidado);
routes.use("/item-balance", productoInventariado);


routes.use("/supplier", proveedores);
routes.use("/project", proyectos);
routes.use("/reports", reportes);
routes.use("/role", roles);
routes.use("/user", usuarios);

routes.get("/", AuthController.version);


export default routes;

