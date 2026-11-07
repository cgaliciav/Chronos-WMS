import { Request, Response, NextFunction } from "express";
import * as jwt from "jsonwebtoken";
import { AppError } from "../helpers/errorClases";
// import config from "../config/config";

interface jwtPaylodType{
  ui:number,
  u:string,
  si:number
}

export const checkJwt = (req: Request, res: Response, next: NextFunction) => {
  //Get the jwt token from the head
  const token = <string>req.headers["auth"];
  // let jwtPayload;
  
  //Try to validate the token and get data
  try {
      //DONE: Poner 'JWTSECRET' en una variable de entorno.
      // console.log("token recibido",token);
    const jwtPayload:jwtPaylodType = jwt.verify(token, process.env.JWTSECRET) as jwtPaylodType;
    res.locals.jwtPayload = jwtPayload;
    const { ui, u, si } = jwtPayload;
    console.log(`checkJwt>>>>> ${jwtPayload.u}`);
    //The token is valid for 1 hour
    //We want to send a new token on every request
    const newToken = jwt.sign({ ui, u, si }, process.env.JWTSECRET, {
        expiresIn: "90d"
      });
    res.setHeader("Access-Control-Expose-Headers", "t");
    res.setHeader("t", token);
  } catch (error) {
    console.log(`checkJwt !!!!!!!!!!!!! ${error.name}`);
    next(error);
    return;
  }



  //Call the next middleware or controller
  next();
};