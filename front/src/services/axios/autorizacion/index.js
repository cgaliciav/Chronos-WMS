import Axios from 'axios'
import { apiClient }  from "../index"

/* 
*******************
*******************
Autorizacion
*******************
*******************
*/
// validacion de usuario
export default class AutorizacionPeticiones {
  static login = (email, password) => {
    return new Promise((resolve, reject) => {
      Axios('https://api.ipify.org')
        .then(respuesta => {
          let ip = respuesta.data
          // console.log('IP', ip)
          if (ip === undefined) ip = 'no-definida'
          return apiClient({
            method: 'post',
            url: '/auth/login',
            data: {
              c: email,
              p: password,
              ip,
            },
          })
        })
        .then(resp => {
          const { t } = resp.data
          localStorage.setItem('t', t)
          // console.log("respuestota",resp.data)
          resolve(resp.data)
        })
        .catch(error => {
          reject(error)
        })
    })
  }

  static logout = async () => (
    apiClient({
          method:'post',
          url: '/auth/logout',
      })

  )

  static version = async ()=>(
    new Promise((resolve, reject) => 
    apiClient({
      method: 'get',
      url: '/auth/version',
    })
    .then(resp => {
      resolve(resp.data)
    })
    .catch(error => {
      reject(error)
    })
  ))
  
  
}
