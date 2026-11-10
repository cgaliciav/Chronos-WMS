import { Router } from "express";
import AuthController from "../controllers/Auth.Controller";
import { checkJwt } from "../middlewares/verificarJwt";
import { validarBody } from "../middlewares/validar";
import { loginSchema } from "../esquemas";

const router = Router();
//Login route
router.post("/login", [validarBody(loginSchema)], AuthController.login);

router.post("/logout",[checkJwt], AuthController.logout);


router.get("/version", AuthController.version);

// Recuperación de acceso: el administrador genera una contraseña temporal (PUT /user/renewpassword) y el usuario
// debe cambiarla al entrar (hallazgo L2). No hay autoservicio de "olvidé mi contraseña".

export default router;