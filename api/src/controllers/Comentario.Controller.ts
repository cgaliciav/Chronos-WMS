import { NextFunction, Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Comentario } from "../entity/Comentario";
import { Sesion } from "../entity/Sesion";
import { AppError } from "../helpers/errorClases";
import { idSeguro } from "../helpers/ids";
import { repositorioDeRelacion } from "./Archivo.Controller";



class ComentarioController{

    static guardar = async (comentarioStr:string,sesionId:number,) =>{

        const comentario = new Comentario();
        comentario.comentario=comentarioStr;
        comentario.sesionId=sesionId;
        comentario.sesion=await AppDataSource.getRepository(Sesion).findOneByOrFail({ id: sesionId });

        // console.log("comentario",comentario);

        return (
            await AppDataSource.getRepository(Comentario).save(comentario)
        )
    }

    static quitar = async (comentario:Comentario,sesionId:number) => {
        // const archivo = await getRepository(Archivo).findOneOrFail(archivoId);
        comentario.sesionId = sesionId;
        return (await AppDataSource.getRepository(Comentario).remove(comentario));
    }


    static agregarComentario = async (req: any, res: Response, next: NextFunction) => {
        const {id,relacion,comentario}=req.body;
        const {jwtPayload}=res.locals;
        try {
            // console.log("jwtPayload",jwtPayload)
            if (typeof comentario !== "string" || comentario.trim().length === 0) {
                throw new AppError("El comentario no puede estar vacío", 400);
            }
            const repo = repositorioDeRelacion(relacion);
            const repoItem:any=await repo.findOneOrFail({ where: { id: idSeguro(id) }, relations:{ comentarios: true }});
            repoItem.sesionId=jwtPayload.si;
            const comentarioResultado=await ComentarioController.guardar(comentario,jwtPayload.si);

            repoItem.comentarios.push(comentarioResultado);
            await repo.save(repoItem);

            res.json();
        } catch (error) {
            next(error)
        }
    }

    static quitarComentario = async (req: Request, res: Response, next: NextFunction) => {
        const {id,comentarioId,relacion}=req.body;
        const {jwtPayload}=res.locals;
        try {
            const repo = repositorioDeRelacion(relacion);
            const idComentario = idSeguro(comentarioId, "comentarioId");
            const repoItem:any=await repo.findOneOrFail({ where: { id: idSeguro(id) }, relations:{ comentarios: true }});
            // Solo se borra un comentario que pertenezca al registro (hallazgo M8: IDOR y comparación número/string)
            if (!repoItem.comentarios.some((c: Comentario) => c.id === idComentario)) {
                throw new AppError("El comentario no pertenece al registro", 404);
            }
            repoItem.sesionId=jwtPayload.si;
            repoItem.comentarios = repoItem.comentarios.filter((c: Comentario) => c.id !== idComentario);
            await repo.save(repoItem);

            await ComentarioController.quitar(
                await AppDataSource.getRepository(Comentario).findOneByOrFail({ id: idComentario }), 
                jwtPayload.si
            );
            res.json();
        } catch (error) {
            next(error)
        }
    }

};

export default ComentarioController;