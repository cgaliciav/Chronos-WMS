import { Router } from "express";
import AuthController from "../controllers/Auth.Controller";
import { checkJwt } from "../middlewares/verificarJwt";

const router = Router();
//Login route
router.post("/login", AuthController.login);

router.post("/logout",[checkJwt], AuthController.logout);


router.get("/version", AuthController.version);

// TODO QUE HACER PARA QUE LOS USUARIOS  PUEDAN RECUPERAR SOLO SU PROPIO PASSWORD

export default router;