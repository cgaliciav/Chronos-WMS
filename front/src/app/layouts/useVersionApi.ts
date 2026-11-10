import { useEffect, useState } from 'react'
import AutorizacionPeticiones from 'services/axios/autorizacion'

/** Versión del API (`GET /auth/version`); se recuerda en localStorage como antes (`apiVersion`). */
export function useVersionApi(): string {
  const [version, setVersion] = useState(() => localStorage.getItem('apiVersion') ?? '')
  useEffect(() => {
    AutorizacionPeticiones.version()
      .then(resp => {
        if (resp?.version !== undefined) {
          setVersion(resp.version)
          localStorage.setItem('apiVersion', resp.version)
        }
      })
      .catch(() => {
        // El interceptor de axios ya mostró el error.
      })
  }, [])
  return version
}
