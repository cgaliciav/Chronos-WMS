import * as dotenv from "dotenv";
import "reflect-metadata";

import {conectarORM, /* conexionV1, conexion */ } from "./conexionORM";
import { reporteGeneral, reportePorGrupo } from "./helpers/excelFunctions";


  process.on('message', async ({tipo,body}: any) => {
    console.log("mensage recibido....iniciando ORM",{tipo,body});
    (async ()=>{
        if(process.env.NODE_ENV!=='production')
            dotenv.config();
        await conectarORM();
    })();
    if(tipo===1){
        // process.send(await reportePorGrupo(body));
        console.log("iniciando reporte",{tipo,body});
        process.send({r:1,message:await reportePorGrupo(body)});
    }
    else {
        process.send(await reporteGeneral(body.proyectoId, body.conFoto));
    }
    process.disconnect();
    // process.exit();
  });
