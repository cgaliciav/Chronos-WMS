import { NextFunction, Request, Response } from "express";
import { getRepository } from "typeorm";
import { Comentario } from "../entity/Comentario";
import { Sesion } from "../entity/Sesion";



class ComentarioController{

    static guardar = async (comentarioStr:string,sesionId:number,) =>{

        const comentario = new Comentario();
        comentario.comentario=comentarioStr;
        comentario.sesionId=sesionId;
        comentario.sesion=await getRepository(Sesion).findOneOrFail(sesionId);

        // console.log("comentario",comentario);

        return (
            await getRepository(Comentario).save(comentario)
        )
    }

    static quitar = async (comentario:Comentario,sesionId:number) => {
        // const archivo = await getRepository(Archivo).findOneOrFail(archivoId);
        comentario.sesionId = sesionId;
        return (await getRepository(Comentario).remove(comentario));
    }


    static agregarComentario = async (req: any, res: Response, next: NextFunction) => {
        const {id,relacion,comentario}=req.body;
        const {jwtPayload}=res.locals;
        try {
            // console.log("jwtPayload",jwtPayload)
            const repoItem:any=await getRepository(relacion).findOneOrFail(id,{relations:["comentarios"]});
            repoItem.sesionId=jwtPayload.si;
            const comentarioResultado=await ComentarioController.guardar(comentario,jwtPayload.si);

            repoItem.comentarios.push(comentarioResultado);
            await getRepository(relacion).save(repoItem);

            res.json(
                // await CommonController.agregarArchivo(getRepository(relacion),id,jwtPayload.si,file)
                );
        } catch (error) {
            next(error)
        }
    }

    static quitarComentario = async (req: Request, res: Response, next: NextFunction) => {
        const {id,comentarioId,relacion}=req.body;
        const {jwtPayload}=res.locals;
        try {
            const repoItem:any=await getRepository(relacion).findOneOrFail(id,{relations:["comentarios"]});
            repoItem.sesionId=jwtPayload.si;
            repoItem.comentarios = repoItem.comentarios.filter(comentario=>comentario.id!==comentarioId);
            repoItem.sessionId = jwtPayload.si;

            await ComentarioController.quitar(
                await getRepository(Comentario).findOneOrFail(comentarioId), 
                jwtPayload.si
            );


            await  getRepository(relacion).save(repoItem);
            res.json();
        } catch (error) {
            next(error)
        }
    }

};

export default ComentarioController;