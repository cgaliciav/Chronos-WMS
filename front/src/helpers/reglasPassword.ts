import type { FormRule } from 'antd'

/** Reglas de la contraseña nueva: las mismas que valida el API (`passGenerator.esPasswordValido`). */
export const reglasPasswordNuevo: FormRule[] = [
  { required: true, message: 'Coloca el password nuevo' },
  { min: 8, message: 'Mínimo 8 caracteres' },
  { max: 20, message: 'Máximo 20 caracteres' },
  { pattern: /[A-Z]/, message: 'Debe contener al menos una mayúscula' },
  { pattern: /[a-z]/, message: 'Debe contener al menos una minúscula' },
  { pattern: /\d/, message: 'Debe contener al menos un número' },
]

/** La confirmación debe coincidir con `passwordNuevo`. */
export const reglaConfirmacion: FormRule = ({ getFieldValue }) => ({
  validator(_regla, value: unknown) {
    if (value !== getFieldValue('passwordNuevo')) {
      return Promise.reject(new Error('Confirmación y nuevo deben ser iguales'))
    }
    return Promise.resolve()
  },
})

/** La nueva no puede ser igual a la actual. */
export const reglaDistintaDeActual: FormRule = ({ getFieldValue }) => ({
  validator(_regla, value: unknown) {
    if (value && value === getFieldValue('passwordAnterior')) {
      return Promise.reject(new Error('El password nuevo no debe ser igual al password actual'))
    }
    return Promise.resolve()
  },
})
