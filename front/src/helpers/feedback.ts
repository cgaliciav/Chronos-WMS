/**
 * `notification` y `message` de antd conectados al contexto de `<App>` (tema, locale), usables también desde
 * stores y servicios (patrón oficial de antd 5+: instancia de `App.useApp()`).
 *
 * Los métodos estáticos de antd (5 y 6) no leen el `ConfigProvider`; mientras `<RegistrarFeedback />` no se haya
 * montado (p. ej. en pruebas) se usan esos estáticos como respaldo. Mismas firmas que en antd: basta con importar
 * desde aquí en vez de desde 'antd'.
 */
import { App, message as messageEstatico, notification as notificationEstatico } from 'antd'
import type { MessageInstance } from 'antd/es/message/interface'
import type { NotificationInstance } from 'antd/es/notification/interface'

let notificacionesApp: NotificationInstance | null = null
let mensajesApp: MessageInstance | null = null

/** Se monta una vez dentro de `<App>` (index.tsx) para registrar las instancias con contexto. */
export function RegistrarFeedback(): null {
  const { notification: n, message: m } = App.useApp()
  notificacionesApp = n
  mensajesApp = m
  return null
}

const notif = (): NotificationInstance => notificacionesApp ?? notificationEstatico
const msj = (): MessageInstance => mensajesApp ?? messageEstatico

export const notification: NotificationInstance = {
  success: config => notif().success(config),
  error: config => notif().error(config),
  info: config => notif().info(config),
  warning: config => notif().warning(config),
  open: config => notif().open(config),
  destroy: clave => notif().destroy(clave),
}

export const message: MessageInstance = {
  success: (...args) => msj().success(...args),
  error: (...args) => msj().error(...args),
  info: (...args) => msj().info(...args),
  warning: (...args) => msj().warning(...args),
  loading: (...args) => msj().loading(...args),
  open: config => msj().open(config),
  destroy: clave => msj().destroy(clave),
}
