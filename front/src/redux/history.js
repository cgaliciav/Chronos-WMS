// Historial hash compartido (antes se exportaba desde src/index.js, importación circular).
// Desaparece en la fase 3 del plan 01 con createHashRouter.
import { createHashHistory } from 'history'

const history = createHashHistory()

export default history
