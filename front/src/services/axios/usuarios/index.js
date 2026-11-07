import { apiClient, PeticionBase } from '..'

/* 
*******************
*******************
USUARIOS
*******************
*******************
*/

//
const portionEndPoint = 'user'
export default class UsuarioPeticiones extends PeticionBase {
  static listadoSimple = () => super.listadoSimple(portionEndPoint)

  static listado = (parametros = {}) => super.listado(portionEndPoint, parametros)

  static listadoSimpleCompleto = () => super.generalGetNoParam(portionEndPoint, 'list-names-full')

  static listadoSimpleDinamico = (parametros = {}) =>
    super.generalPost(portionEndPoint, 'list-names-dynamic', parametros)

  // regenera password del usuario con el correo específico
  static regenerarPassword = email =>
    new Promise((resolve, reject) => {
      apiClient({
        method: 'put',
        url: `/user/renewpassword/`,
        data: {
          email,
        },
      })
        .then(resp => resolve(resp.data))
        .catch(error => reject(error))
    })

  // inhabilita al usuario especificado para su acceso al sistema
  static inhabilitar = id => super.inhabilitar(portionEndPoint, id)

  // rehabilita al usuario especificado para su acceso al sistema
  static habilitar = id => super.habilitar(portionEndPoint, id)

  // obtiene los datos del usuario especificado
  static obtenerId = id => super.obtenerId(portionEndPoint, id)

  // editar un usuario
  static editar = (parametros = {}) => super.editar(portionEndPoint, parametros)

  // crear nuevo usuario
  static nuevo = async (parametros = {}) => super.nuevo(portionEndPoint, parametros)

  // cambiar contraseña del usuario de la sesion.
  static cambiarPassword = (parametros = {}) =>
    new Promise((resolve, reject) => {
      if (Object.keys(parametros).length === 0 && parametros.constructor === Object)
        throw new Error('objeto vacio . cambiarPasswordUsuario')
      // Keys esperadas: old_usua_password,new_usua_password
      apiClient({
        method: 'put',
        url: '/user/password',
        data: {
          ...parametros,
        },
      })
        .then(resp => resolve(resp.data))
        .catch(error => reject(error))
    })

  static actual = async () =>
    new Promise((resolve, reject) => {
      apiClient({
        method: 'get',
        url: '/user/current',
      })
        .then(resp => {
          resolve(resp.data)
        })
        .catch(error => reject(error))
    })

  static obtenerAreas = () => super.generalGetNoParam(portionEndPoint, 'get-areas')

  static obtenerBodegas = () => super.generalGetNoParam(portionEndPoint, 'get-warehouses')

  static obtenerProyectos = () => super.generalGetNoParam(portionEndPoint, 'get-projects')
}

// obtiene datos del usuario segun su token
