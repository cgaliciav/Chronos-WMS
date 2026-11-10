import { horasPasswordTemporal } from "../services/PasswordService";
import * as nodemailer from "nodemailer";
import LogGeneralController from "../controllers/LogGeneral.Controller";
import { LogTipo } from "../entity/LogGeneral";
import { logger } from "./logger";

/** Identidad por defecto del producto (plan 03, fase 0); en la fase 2 la toman de la configuración (`correo`). */
const NOMBRE_PRODUCTO = 'Chronos WMS';
const SOPORTE_CORREO = process.env.SOPORTE_CORREO || 'soporte@exogrid.io';
// Remitente: SMTP_FROM del entorno. El valor por defecto ya no lleva el nombre de un cliente.
const SMTP_FROM = process.env.SMTP_FROM || 'chronoswms@exogrid.xyz';

// La cabecera de Postmark es un valor por defecto de cada MENSAJE (segundo argumento). Antes iba entre las opciones del
// transporte, donde nodemailer la ignora (hallazgo M22).
let transporter = nodemailer.createTransport(
  {
    host: process.env.SMTP_HOST || "smtp.postmarkapp.com",
    port: +(process.env.SMTP_PORT || 2525),
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
      method: "PLAIN",
    },
  },
  { from: SMTP_FROM, headers: { "X-PM-Message-Stream": "outbound" } }
);

/** Comprueba la conexión SMTP. Se llama al arrancar (index.ts), no al importar el módulo: antes cada importación (y cada prueba) abría una conexión (M22). */
export const verificarCorreo = () =>
  transporter
    .verify()
    .then(() => logger.info("SMTP correcto"))
    .catch((error) => logger.error("SMTP error:", error));

  let enviarCorreoHTML = (correoDestino:string,subject:string, html:string) =>
    transporter.sendMail({
        from: SMTP_FROM, // sender address
        to: correoDestino, // list of receivers
        subject,
        html // antes se enviaba como `text` y el destinatario veía el HTML crudo (M22)
        }).then(info=>{
            LogGeneralController.InsertarLog(LogTipo.INFO,"Correo Enviado",info);
        })
        .catch(err=>{
            LogGeneralController.InsertarLog(LogTipo.ERROR,"Correo NO Enviado",err);
        });


let enviarCorreoSimple = (correoDestino:string,subject:string, text:string) =>
    transporter.sendMail({
        from: SMTP_FROM, // sender address
        to: correoDestino, // list of receivers
        subject,
        text
        }).then(info=>{
            LogGeneralController.InsertarLog(LogTipo.INFO,"Correo Enviado",info);
        })
        .catch(err=>{
            LogGeneralController.InsertarLog(LogTipo.ERROR,"Correo NO Enviado",err);
        });

let enviarCorreoConAnexos = (correoDestino:string,subject:string, text:string, archivos:{filename:string,path:string}[]) =>
        transporter.sendMail({
            from: SMTP_FROM, // sender address
            to: correoDestino, // list of receivers
            subject,
            text,
            attachments:archivos,
            }).then(info=>{
                LogGeneralController.InsertarLog(LogTipo.INFO,"Correo Enviado",info);
            })
            .catch(err=>{
                LogGeneralController.InsertarLog(LogTipo.ERROR,"Correo NO Enviado",err);
            });

const PIE_CORREO = `Este correo se genera automáticamente si tienes problemas técnicos con el sistema por favor escribenos a ${SOPORTE_CORREO} para auxiliarte a resolver el problema,  GRACIAS :D .\n\n`;

const textoTemporal = () =>
    `Es una contraseña temporal: vence en ${horasPasswordTemporal()} horas y al entrar el sistema te pedirá elegir una nueva. ` +
    'Si venció, pide a tu administrador que genere otra. \n\n\n\n';

export default class EnviarMail{
    /**
     * Correos con la contraseña TEMPORAL (hallazgo L2): vence a las `HORAS_PASSWORD_TEMPORAL` horas y el sistema obliga
     * a cambiarla al entrar, así que la que viaja por correo deja de servir en cuanto el usuario elige la suya.
     */
    static correoNuevoUsuario = (correoDestino:string,password:string) =>{
        enviarCorreoSimple(correoDestino,
            `BIENVENIDO A ${NOMBRE_PRODUCTO}`,
            `Bienvenido a ${NOMBRE_PRODUCTO}, \n\n `+
            'Fuiste dado de alta por el administrador, tu acceso es mediante los siguientes datos: \n'+
            'correo: ' +correoDestino + '\n'+
            'contraseña temporal: ' +password + '\n\n'+
            textoTemporal() +
            PIE_CORREO
            );
    }

    static correoNuevoPassword = (correoDestino:string,password:string) =>{
        enviarCorreoSimple(correoDestino,
            `NUEVA CONTRASEÑA TEMPORAL - ${NOMBRE_PRODUCTO}`,
            'El administrador generó una nueva contraseña para tu acceso: \n'+
            'correo: ' +correoDestino + '\n'+
            'contraseña temporal: ' +password + '\n\n'+
            textoTemporal() +
            PIE_CORREO
            );
    }

    static correoConAnexos = (correoDestino:string,archvivos:{filename:string,path:string}[]) =>{
        enviarCorreoConAnexos(
            correoDestino,
            `GENERACION DE REPORTE EXITOSO - ${NOMBRE_PRODUCTO}`,
            'En el archivo anexo encontrará el reporte solicitado:, \n\n\n'+
            PIE_CORREO,
            archvivos)
    }

    static correoAlerta = (correoDestino:string,alerta:string) =>{
        enviarCorreoSimple(correoDestino,
            `${NOMBRE_PRODUCTO} - ALERTA`,
            'Se generó la siguiente alerta en el sistema:, \n\n'+
            alerta + '\n\n'+
            'Si tienes dudas comunicate con tu administrador. \n\n\n\n'+
            PIE_CORREO
            );
    }

    static correorReporteDescarga = (correoDestino:string,archvivo:{filename:string,path:string}) =>{
        enviarCorreoSimple(correoDestino,
            `${NOMBRE_PRODUCTO} - REPORTE PARA DESCARGA`,
            'Se generó la siguiente reporte:, \n\n'+
            archvivo.filename + '\n\n'+
            'Copia y pega el linkn de descarga: ' +archvivo.path + '\n\n'+
            'Si tienes dudas comunicate con tu administrador. \n\n\n\n'+
            PIE_CORREO
            );
    }

    static correoHTML=(correoDestino:string,titulo:string,html:string)=>{
        enviarCorreoHTML(correoDestino,titulo,html);
    }
}
