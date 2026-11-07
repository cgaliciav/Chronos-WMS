import { Router } from "express";

import ProductoValidadoController from "../controllers/ProductoValidado.Controller";
import { checkJwt } from "../middlewares/verificarJwt";
import { checkRole } from "../middlewares/verificarRol";

const router = Router();

router.post(
  "/approve",
  [checkJwt, checkRole(["ADMINISTRADOR", "VALIDACIONES"])],
  ProductoValidadoController.Validar
);

router.post(
  "/refuse",
  [checkJwt, checkRole(["ADMINISTRADOR", "VALIDACIONES"])],
  ProductoValidadoController.Invalidar
);

router.post(
  "/no-review",
  [checkJwt, checkRole(["ADMINISTRADOR", "VALIDACIONES"])],
  ProductoValidadoController.NoRevisado
);

export default router;
