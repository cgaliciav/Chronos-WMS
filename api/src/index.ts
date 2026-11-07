import * as dotenv from "dotenv";
import "reflect-metadata";

import express from "express";
import bodyParser from "body-parser";
import helmet from "helmet";
import cors from "cors";
// import * as Sentry from "@sentry/node";
// import * as Tracing from "@sentry/tracing";
import routes from "./routes";
import { conectarORM, /* conexionV1, conexion */ } from "./conexionORM";
import { errorMiddlewere } from "./middlewares/manejoErrores";
import { pasadas } from "./middlewares/pasada";

import { LogPeticiones } from "./entity/LogPeticiones";

import requestStats from "request-stats";
import { getRepository } from "typeorm";
// import { supabase } from "./helpers/_SupabaseConfig";


(async () => {
  console.log("******PROCESO EN", process.env.NODE_ENV)
  if (process.env.NODE_ENV !== 'production')
    dotenv.config();
  await conectarORM();

  // const metricsMiddleware = promBundle({includeMethod: true, includePath:true,metricType:"summary"});

  const app = express();


  // if(process.env.NODE_ENV==='production' || process.env.PORT_ALMACEN_API==='4100'){
  //     Sentry.init({
  //         dsn: "https://5f57240f728b4500a86d2bf5040e56bf@o517503.ingest.sentry.io/5625392",
  //         integrations: [
  //             // enable HTTP calls tracing
  //             new Sentry.Integrations.Http({ tracing: true }),
  //             // enable Express.js middleware tracing
  //             new Tracing.Integrations.Express({ app }),
  //         ],

  //         // We recommend adjusting this value in production, or using tracesSampler
  //         // for finer control
  //         tracesSampleRate: 1.0,
  //     })
  // }


  // app.disable('x-powered-by');
  app.use(cors());
  app.use(helmet());
  // app.use(helmet);
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(bodyParser.json());
  app.use(pasadas)

  // if(process.env.NODE_ENV==='production'  || process.env.PORT_ALMACEN_API==='4100' ){
  //     // RequestHandler creates a separate execution context using domains, so that every
  //     // transaction/span/breadcrumb is attached to its own Hub instance
  //     app.use(Sentry.Handlers.requestHandler());
  //     // TracingHandler creates a trace for every incoming request
  //     app.use(Sentry.Handlers.tracingHandler());
  // }

  // app.use((res:express.Request)  );

  // app.use(metricsMiddleware);

  app.use("/", routes);


  // The error handler must be before any other error middleware and after all controllers
  // app.use(Sentry.Handlers.errorHandler());

  app.use(errorMiddlewere)

  // if(process.env.PORT_ALMACEN_API === undefined)
  //     puertoAPI=8000;
  // else 
  const PUERTO_API = (process.env.PORT_ALMACEN_API) ? +process.env.PORT_ALMACEN_API : 8000;


  const http_server = app.listen(PUERTO_API, '0.0.0.0', () => {
    console.log(
      `Express funcionando en el puerto ${process.env.PORT_ALMACEN_API}. http://localhost:${process.env.PORT_ALMACEN_API}/`
    );
  });
  app.on("error", (e) => {
    // if (e === "EADDRINUSE") {
    //   console.log("ERROR, PUERTO EN USO... FINALIZANDO PROGRAMA");
    //   process.exit();
    // }
    console.log("ERROR EXPRESS LISEN", { e });
  });

  process.on("SIGTERM", async () => {
    console.log("Señal SIGTERM recibida: Cerrando servidor HTTP ");
    http_server.close(() => {
      console.log("Servidor HTTP cerrado");
    });
    // await supabase.auth.signOut();
    await closeDatabaseConnection();
    process.exit( 0 );
    
  });

  process.on("SIGINT", async () => {
    console.log("Señal SIGINT recibida: Cerrando  ");
    if (http_server.listening) {
      http_server.close(() => {
        console.log("Servidor HTTP cerrado");
      });
    }

    // await supabase.auth.signOut();
    await closeDatabaseConnection();
    process.exit( 0 );

  });

  process.on("exit", async (code) => {
    console.log("Señal exit recibida: Cerrando  ", code);
    if (http_server.listening) {
      http_server.close(() => {
        console.log("Servidor HTTP cerrado");
      });
    }
    await closeDatabaseConnection();
    process.exit( 0 );

    // await supabase.auth.signOut();
  });

  requestStats(http_server, async (stats) => {
    // stats.ok
    //stats.time
    const { ok, time, req, res } = stats;

    const logPeticiones = new LogPeticiones();
    logPeticiones.ok = ok;
    logPeticiones.time = time;

    const {
      bytes: reqBytes,
      ip: reqIp,
      method: reqMethod,
      path: reqPath
    } = req;

    const {
      bytes: resBytes,
      status: resStatus,
    } = res;

    logPeticiones.reqBytes = reqBytes;
    logPeticiones.reqIp = reqIp;
    logPeticiones.reqMethod = reqMethod;
    logPeticiones.reqPath = reqPath;

    logPeticiones.resBytes = resBytes;
    logPeticiones.resStatus = resStatus;

    await getRepository(LogPeticiones).save(logPeticiones);

  })

  // const { data, error } = await supabase.auth.signInWithPassword({ email: process.env.SUPABASE_USER, password: process.env.SUPABASE_PASS });
  // console.log('SUPABASE', { data, error });


  // "host": "192.168.1.79",
  //   "port": 3306,
  //   "username": "almacen-admin",
  //   "password": "<secreto>",
})();


async function closeDatabaseConnection() {
  const connection = getRepository(LogPeticiones).manager.connection;
  if (connection.isConnected) {
    await connection.close();
    console.log("Conexión a la base de datos cerrada");
  }
}

