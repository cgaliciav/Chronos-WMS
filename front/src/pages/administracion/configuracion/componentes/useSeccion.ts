import { useCallback, useEffect, useState } from 'react'
import type { FormInstance } from 'antd'
import { isAxiosError } from 'axios'
import { notification } from 'helpers/feedback'
import ConfiguracionPeticiones, {
  type SeccionConfig,
  type SeccionConValor,
} from 'services/axios/configuracion'
import { useMarcaStore } from 'stores/marca.store'

interface ErrorCampo {
  campo: string
  mensaje: string
}

/**
 * Carga y guarda una sección de `/config` con su `version` (bloqueo optimista). Un 409 recarga la sección y avisa; un
 * 400 marca en el formulario los campos que el API rechazó. Tras guardar se recarga la marca para verla al momento.
 */
export function useSeccion<T extends object>(seccion: SeccionConfig, form?: FormInstance) {
  const [datos, setDatos] = useState<SeccionConValor<T> | null>(null)
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)

  const recargar = useCallback(async () => {
    setCargando(true)
    try {
      const todas = await ConfiguracionPeticiones.todas()
      setDatos(todas[seccion] as unknown as SeccionConValor<T>)
    } catch {
      // El interceptor de axios ya mostró el error.
    } finally {
      setCargando(false)
    }
  }, [seccion])

  useEffect(() => {
    void recargar()
  }, [recargar])

  const guardar = async (valor: T) => {
    if (!datos) return false
    setGuardando(true)
    try {
      const nueva = await ConfiguracionPeticiones.guardar(seccion, datos.version, valor)
      setDatos(nueva as unknown as SeccionConValor<T>)
      notification.success({ title: 'Configuración guardada' })
      void useMarcaStore.getState().cargar()
      return true
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 409) {
        notification.warning({
          title: 'Otra persona cambió esta sección',
          description: 'Se recargó con sus cambios; revisa y vuelve a aplicar los tuyos.',
        })
        await recargar()
      } else if (isAxiosError<{ errores?: ErrorCampo[] }>(error) && form) {
        form.setFields(
          (error.response?.data?.errores ?? []).map(({ campo, mensaje }) => ({
            name: campo.split('.'),
            errors: [mensaje],
          })),
        )
      }
      return false
    } finally {
      setGuardando(false)
    }
  }

  return { datos, setDatos, cargando, guardando, guardar, recargar }
}
