import {Connection, createConnection, createConnections} from "typeorm";
// import configuraciones from "../ormconfig.js";
export let conexion:Connection;
export let conexionV1:Connection;
// TYPEORM_CONNECTION = mysql
// TYPEORM_HOST = localhost
// TYPEORM_USERNAME = root
// TYPEORM_PASSWORD =
// TYPEORM_DATABASE = test
// TYPEORM_PORT = 3000
// TYPEORM_SYNCHRONIZE = true
// TYPEORM_LOGGING = true
// TYPEORM_ENTITIES = entity/*.js,modules/**/entity/*.js
// TYPEORM_MIGRATIONS
// TYPEORM_SUBSCRIBERS

export let conectarORM = async ()=>{
// console.log(configuraciones);
    if(process.env.NODE_ENV!=='production'){
        [conexion,conexionV1]=await createConnections();
        console.log("conectado a nuevo sistema");
        console.log("conectado viejo sistema");
    }
    else{
        conexion=await createConnection();
        console.log("conectado a nuevo sistema");
    }
    

    // conexion=await createConnection("default")
};
