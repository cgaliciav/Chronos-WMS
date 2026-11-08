/**
 * Configuración única de dayjs (sustituye a moment, plan 01 fase 4). Se importa una vez en `index.tsx` y en
 * las pruebas; los componentes usan `import dayjs from 'dayjs'` directamente.
 */
import dayjs from 'dayjs'
import 'dayjs/locale/es-mx'
import advancedFormat from 'dayjs/plugin/advancedFormat'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter'
import localizedFormat from 'dayjs/plugin/localizedFormat'
import relativeTime from 'dayjs/plugin/relativeTime'
import utc from 'dayjs/plugin/utc'

// advancedFormat: `format('x')` (marca de tiempo en ms); localizedFormat: `format('ll')`; relativeTime: `fromNow()`.
dayjs.extend(advancedFormat)
dayjs.extend(customParseFormat)
dayjs.extend(isSameOrAfter)
dayjs.extend(localizedFormat)
dayjs.extend(relativeTime)
dayjs.extend(utc)
dayjs.locale('es-mx')

export default dayjs
