import { Router } from "express";

// import ProductoValidadoController from "../controllers/ProductoValidado.Controller";
import ProductoInventarioController from "../controllers/ProductoInventariado.Controller";
import { checkJwt } from "../middlewares/verificarJwt";
import { checkRole } from "../middlewares/verificarRol";

const router = Router();

router.post(
  "/in-balance",
  [checkJwt, checkRole(["ADMINISTRADOR", "VALIDACIONES"])],
  ProductoInventarioController.InventarioExiste
);

router.post(
  "/out-balance",
  [checkJwt, checkRole(["ADMINISTRADOR", "VALIDACIONES"])],
  ProductoInventarioController.InventarioNoExiste
);


router.post(
  "/no-review",
  [checkJwt, checkRole(["ADMINISTRADOR", "VALIDACIONES"])],
  ProductoInventarioController.NoRevisado
  );
  
  router.get(
    "/:id",
    [checkJwt, checkRole(["ADMINISTRADOR", "VALIDACIONES"])],
    ProductoInventarioController.Detalle
  );

export default router;
