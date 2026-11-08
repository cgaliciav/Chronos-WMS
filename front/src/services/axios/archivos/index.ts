import { PeticionBase, conToken } from '..'

const recurso = 'file'

/** Fichas de antd `Upload` que devuelve `get-response-interface`. */
export interface ArchivoUpload {
  uid: number | string
  name: string
  status?: string
  type?: string
  url?: string
  thumbUrl?: string
  [otro: string]: unknown
}

/** Archivos (`/file`). La subida la hace antd `Upload` contra `/file/file`. */
export default class ArchivoPeticiones {
  static quitarArchivo = (parametros: object = {}) => PeticionBase.generalDelete(recurso, 'file', parametros)
  /** Fichas de los archivos con sus URLs ya firmadas con el token (`conToken`). */
  static obtenerResponseFileDeId = async (parametros: { ids: Array<number | string> }) => {
    const fichas = await PeticionBase.generalPost<ArchivoUpload[]>(
      recurso,
      'get-response-interface',
      parametros,
    )
    return fichas.map(ficha => ({ ...ficha, url: conToken(ficha.url), thumbUrl: conToken(ficha.thumbUrl) }))
  }
}
