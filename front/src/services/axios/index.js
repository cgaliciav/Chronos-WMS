import axios from 'axios'
import store from 'store'
import { notification } from 'antd'
// import apiLocation from './apiLocation.json'

if (import.meta.env.DEV) console.log(import.meta.env.MODE, import.meta.env.VITE_API_URL)

const getAPIConfig = () => {
  // Obtener protocolo, dominio y puerto
  const {protocol, hostname, port} = window.location;
  
  // Construir el dominio incluyendo el puerto solo si es necesario
  const currentDomain = port && port !== '80' && port !== '443' 
    ? `${protocol}//${hostname}:${port}`
    : `${protocol}//${hostname}`;
  
  // La ruta de la API desde variables de entorno o valor por defecto
  const apiPath = import.meta.env.VITE_API_URL || '/api/';

  // Asegurarnos que apiPath comience con /
  const normalizedAPIPath = apiPath.startsWith('/') ? apiPath : `/${apiPath}`;

  return {
    domainURL: currentDomain,
    apiPath: normalizedAPIPath,
    fullURL: `${currentDomain}${normalizedAPIPath}`
  };
};


export const apiURLBase = getAPIConfig().fullURL;
  
  // process.env.NODE_ENV === 'production' ? apiLocation.production : apiLocation.development

  // "development":"http://62db786d5ee7.ngrok.io",

export const apiClient = axios.create({
  baseURL: apiURLBase,
  timeout: 25000,
})

apiClient.interceptors.request.use(request => {
  const accessToken = store.get('t')
  if (accessToken) {
    // request.headers.Authorization = `Bearer ${accessToken}`
    // request.headers.AccessToken = accessToken
    request.headers.auth=accessToken;
  }
  return request
})

apiClient.interceptors.response.use(
  response =>{
    const { t } = response.headers
    if (t) {
      localStorage.setItem('t', t)
    }
    return response
  }, 
  error => {
  // Errors handling
  console.log("error ApiClient error",{error})
  const { response } = error
  const { data } = response??{data:undefined}
  // console.log("error ApiClient",data)
  if (data) {
    notification.error({
      message: data.message,
    })
  } else {
    notification.error({
      message: error.message,
    })
  }
  return error;
})

// export default apiClient
export class PeticionBase {
  static listadoSimple = portionEndPoint =>
    new Promise((resolve, reject) => {
      apiClient({
        method: 'get',
        url: `/${portionEndPoint}/list-names`,
      })
        .then(resp => resolve(resp.data))
        .catch(error => reject(error))
    })

  static listado = (portionEndPoint, parametros = {}) =>
    new Promise((resolve, reject) => {
      if (import.meta.env.DEV) console.log('---PARAMETROS listado', parametros)
      apiClient({
        method: 'post',
        url: `/${portionEndPoint}/list-antd`,
        data: {
          ...parametros,
        },
      })
        .then(resp => resolve(resp.data))
        .catch(error => reject(error))
    })

  static obtenerId = (portionEndPoint, id) =>
    new Promise((resolve, reject) => {
      apiClient({
        method: 'get',
        url: `/${portionEndPoint}/${id}`,
      })
        .then(resp => resolve(resp.data))
        .catch(error => reject(error))
    })

  static editar = (portionEndPoint, parametros = {}) =>
    new Promise((resolve, reject) => {
      if (import.meta.env.DEV) console.log('---PARAMETROS editar', parametros)
      apiClient({
        method: 'put',
        url: `/${portionEndPoint}/edit`,
        data: {
          ...parametros,
        },
      })
        .then(resp => resolve(resp.data))
        .catch(error => reject(error))
    })

  static nuevo = (portionEndPoint, parametros = {}) =>
    new Promise((resolve, reject) => {
      if (import.meta.env.DEV) console.log('---PARAMETROS nuevo', parametros)
      apiClient({
        method: 'post',
        url: `/${portionEndPoint}/new`,
        data: {
          ...parametros,
        },
      })
        .then(resp => resolve(resp.data))
        .catch(error => reject(error))
    })

  static habilitar = (portionEndPoint, id) =>
    new Promise((resolve, reject) => {
      apiClient({
        method: 'put',
        url: `/${portionEndPoint}/enable/${id}`,
      })
        .then(resp => resolve(resp.data))
        .catch(error => reject(error))
    })

  static inhabilitar = (portionEndPoint, id) =>
    new Promise((resolve, reject) => {
      apiClient({
        method: 'put',
        url: `/${portionEndPoint}/disable/${id}`,
      })
        .then(resp => resolve(resp.data))
        .catch(error => reject(error))
    })

  static finalizar = (portionEndPoint, id) =>
    new Promise((resolve, reject) => {
      apiClient({
        method: 'put',
        url: `/${portionEndPoint}/closure/${id}`,
      })
        .then(resp => resolve(resp.data))
        .catch(error => reject(error))
    })

  static generalPut = (portionEndPoint, endEndPoint, parametros = {}) =>
    new Promise((resolve, reject) => {
      if (import.meta.env.DEV) console.log('---PARAMETROS PUT', parametros)
      apiClient({
        method: 'put',
        url: `/${portionEndPoint}/${endEndPoint}`,
        data: {
          ...parametros,
        },
      })
        .then(resp => resolve(resp.data))
        .catch(error => reject(error))
    })

  static generalPost = (portionEndPoint, endEndPoint, parametros = {}) =>
    new Promise((resolve, reject) => {
      if (import.meta.env.DEV) console.log('---PARAMETROS POST', parametros)
      apiClient({
        method: 'post',
        url: `/${portionEndPoint}/${endEndPoint}`,
        data: {
          ...parametros,
        },
      })
        .then(resp => resolve(resp.data))
        .catch(error => reject(error))
    })

  static generalPostBlob = (portionEndPoint, endEndPoint, parametros = {}) =>
    new Promise((resolve, reject) => {
      if (import.meta.env.DEV) console.log('---PARAMETROS POST', parametros)
      apiClient({
        method: 'post',
        url: `/${portionEndPoint}/${endEndPoint}`,
        data: {
          ...parametros,
        },
        responseType: 'blob',
      })
        .then(resp => resolve(resp.data))
        .catch(error => reject(error))
    })

  static generalGet = (portionEndPoint, endEndPoint, param) =>
    new Promise((resolve, reject) => {
      apiClient({
        method: 'get',
        url: `/${portionEndPoint}/${endEndPoint}/${param}`,
      })
        .then(resp => resolve(resp.data))
        .catch(error => reject(error))
    })

  static generalGetNoParam = (portionEndPoint, endEndPoint) =>
    new Promise((resolve, reject) => {
      apiClient({
        method: 'get',
        url: `/${portionEndPoint}/${endEndPoint}`,
      })
        .then(resp => resolve(resp.data))
        .catch(error => reject(error))
    })

  static generalDelete = (portionEndPoint, endEndPoint, parametros) =>
    new Promise((resolve, reject) => {
      apiClient({
        method: 'delete',
        url: `/${portionEndPoint}/${endEndPoint}`,
        data: {
          ...parametros,
        },
      })
        .then(resp => resolve(resp.data))
        .catch(error => reject(error))
    })
}
