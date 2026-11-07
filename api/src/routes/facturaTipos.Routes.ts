import { Router } from "express";
import FacturaTipoController from "../controllers/FacturaTipo.Controller";
import { checkJwt } from "../middlewares/verificarJwt";
import { checkRole } from "../middlewares/verificarRol";

const router = Router();

//Get all users


router.get("/list-names",[checkJwt,checkRole(["TIPOSFACTURA-LISTASIMPLE","ADMINISTRADOR"])], FacturaTipoController.listaSimple);

export default router;