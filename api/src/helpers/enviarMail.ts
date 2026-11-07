import { method } from "lodash";
import * as nodemailer from "nodemailer";
import LogGeneralController from "../controllers/LogGeneral.Controller";
import { LogTipo } from "../entity/LogGeneral";

let transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.postmarkapp.com",
    port: +(process.env.SMTP_PORT || 2525),
    headers: {
        "X-PM-Message-Stream": "outbound",
    },
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
        method: "PLAIN",
    },
  });

const SMTP_FROM = process.env.SMTP_FROM || 'telesetalmacen@exogrid.xyz';

transporter.verify()
  .then(success => {
      console.log("SMTP correcto");
  })
  .catch(error =>{
      console.log("SMTP error:", error);
  });

  let enviarCorreoHTML = (correoDestino:string,subject:string, text:string) =>
    transporter.sendMail({
        from: SMTP_FROM, // sender address
        to: correoDestino, // list of receivers
        // html:
        subject,
        text
        // subject: "Hello ✔", // Subject line
        // text: "Hello world?", // plain text body
        // html: "<b>Hello world?</b>" // html body
        }).then(info=>{
            // console.log(`Correo Enviado:`, info.rejected,info.response);
            LogGeneralController.InsertarLog(LogTipo.INFO,"Correo Enviado",info);
        })
        .catch(err=>{
            LogGeneralController.InsertarLog(LogTipo.ERROR,"Correo NO Enviado",err);
            // console.log(`ERROR: Al intentar enviar correo`, err);
        });


let enviarCorreoSimple = (correoDestino:string,subject:string, text:string) =>
    transporter.sendMail({
        from: SMTP_FROM, // sender address
        to: correoDestino, // list of receivers
        subject,
        text
        // subject: "Hello ✔", // Subject line
        // text: "Hello world?", // plain text body
        // html: "<b>Hello world?</b>" // html body
        }).then(info=>{
            // console.log(`Correo Enviado:`, info.rejected,info.response);
            LogGeneralController.InsertarLog(LogTipo.INFO,"Correo Enviado",info);
        })
        .catch(err=>{
            LogGeneralController.InsertarLog(LogTipo.ERROR,"Correo NO Enviado",err);
            // console.log(`ERROR: Al intentar enviar correo`, err);
        });

let enviarCorreoConAnexos = (correoDestino:string,subject:string, text:string, archivos:{filename:string,path:string}[]) =>
        transporter.sendMail({
            from: SMTP_FROM, // sender address
            to: correoDestino, // list of receivers
            subject,
            text,
            attachments:archivos,
            // subject: "Hello ✔", // Subject line
            // text: "Hello world?", // plain text body
            // html: "<b>Hello world?</b>" // html body
            }).then(info=>{
                // console.log(`Correo Enviado:`, info.rejected,info.response);
                LogGeneralController.InsertarLog(LogTipo.INFO,"Correo Enviado",info);
            })
            .catch(err=>{
                LogGeneralController.InsertarLog(LogTipo.ERROR,"Correo NO Enviado",err);
                // console.log(`ERROR: Al intentar enviar correo`, err);
            });

export default class EnviarMail{
    static correoNuevoUsuario = (correoDestino:string,password:string) =>{
        enviarCorreoSimple(correoDestino,
            'BIENVENIDO AL ALMACEN DE SONY MX',
            'Bienvenido al Almacen, \n\n '+
            'Fuiste dado de alta al almacén por el administrador, tu acceso es mediante los siguientes datos: \n'+
            'correo:' +correoDestino + '\n'+
            'clave:' +password + '\n\n'+
            'Si lo deseas, podrás cambiar la contraseña dentro del sistema. Si tienes dudas comunicate con tu administrador. \n\n\n\n'+
            'Este correo se genera automáticamente si tienes problemas técnicos con el sistema por favor escribenos a soporte@exogrid.io para auxiliarte a resolver el problema,  GRACIAS :D .\n\n'
            );    

    }

    static correoNuevoPassword = (correoDestino:string,password:string) =>{
        enviarCorreoSimple(correoDestino,
            'CAMBIO DE CONTRASEÑA ALMACEN SONY MX',
            'Se cambió exitosamente tu contraseña, tus nuevos datos son:, \n'+
            'correo:' +correoDestino + '\n'+
            'clave:' +password + '\n\n'+
            'Si lo deseas, podrás cambiar la contraseña dentro del sistema. Si tienes dudas comunicate con tu administrador. \n\n\n\n'+
            'Este correo se genera automáticamente si tienes problemas técnicos con el sistema por favor escribenos a soporte@exogrid.io para auxiliarte a resolver el problema,  GRACIAS :D .\n\n'
            );
    }

    static correoPasswordPerdido = (correoDestino:string,password:string) =>{
        enviarCorreoSimple(correoDestino,
            'RECUPERACION DE ACCESO ALMACEN TELESET/SONY',
            'Tus nuevos datos de acceso son:, \n'+
            'correo:' +correoDestino + '\n'+
            'clave:' +password + '\n\n'+
            'Si lo deseas, podrás cambiar la contraseña dentro del sistema. Si tienes dudas comunicate con tu administrador. \n\n\n\n'+
            'Este correo se genera automáticamente si tienes problemas técnicos con el sistema por favor escribenos a soporte@exogrid.io para auxiliarte a resolver el problema,  GRACIAS :D .\n\n'
            );
    }

    static correoConAnexos = (correoDestino:string,archvivos:{filename:string,path:string}[]) =>{
        enviarCorreoConAnexos(
            correoDestino,
            'GENERACION DE REPORTE EXITOSO - ALMACEN SONY',
            'En el archivo anexo encontrará el reporte solicitado:, \n\n\n'+
            'Este correo se genera automáticamente si tienes problemas técnicos con el sistema por favor escribenos a soporte@exogrid.io para auxiliarte a resolver el problema,  GRACIAS :D .\n\n',
            archvivos)
    }

    static correoAlerta = (correoDestino:string,alerta:string) =>{
        enviarCorreoSimple(correoDestino,
            'ALMACEN SONY MX - ALERTA',
            'Se generó la siguiente alerta en el sistema:, \n\n'+
            alerta + '\n\n'+
            'Si tienes dudas comunicate con tu administrador. \n\n\n\n'+
            'Este correo se genera automáticamente si tienes problemas técnicos con el sistema por favor escribenos a soporte@exogrid.io para auxiliarte a resolver el problema,  GRACIAS :D .\n\n'
            );
    }

    static correorReporteDescarga = (correoDestino:string,archvivo:{filename:string,path:string}) =>{
        enviarCorreoSimple(correoDestino,
            'ALMACEN SONY MX - REPORTE PARA DESCARGA',
            'Se generó la siguiente reporte:, \n\n'+
            archvivo.filename + '\n\n'+
            'Copia y pega el linkn de descarga: ' +archvivo.path + '\n\n'+
            'Si tienes dudas comunicate con tu administrador. \n\n\n\n'+
            'Este correo se genera automáticamente si tienes problemas técnicos con el sistema por favor escribenos a soporte@exogrid.io para auxiliarte a resolver el problema,  GRACIAS :D .\n\n'
            );
    }

    static correoHTML=(correoDestino:string,titulo:string,html:string)=>{
        enviarCorreoHTML(correoDestino,titulo,html);
    }
}
// async function enviarCorreoSimple(correodestino,subject, text){
//     let info = await transporter.sendMail({
//         from: SMTP_FROM, // sender address
//         to: correodestino, // list of receivers
//         subject,
//         text
//         // subject: "Hello ✔", // Subject line
//         // text: "Hello world?", // plain text body
//         // html: "<b>Hello world?</b>" // html body
//       });
// }