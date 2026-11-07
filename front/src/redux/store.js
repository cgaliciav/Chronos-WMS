// Store de redux (antes se creaba y exportaba desde src/index.js, importación circular).
// Desaparece en la fase 3 del plan 01 (Zustand).
import { createStore, applyMiddleware, compose } from 'redux'
import { logger } from 'redux-logger'
import createSagaMiddleware from 'redux-saga'
import { routerMiddleware } from 'connected-react-router'

import history from './history'
import reducers from './reducers'
import sagas from './sagas'

const sagaMiddleware = createSagaMiddleware()
const middlewares = [sagaMiddleware, routerMiddleware(history)]
if (import.meta.env.DEV) {
  middlewares.push(logger)
}

const store = createStore(reducers(history), compose(applyMiddleware(...middlewares)))

// `export { store as default }` exporta el enlace vivo de `store`, ya inicializado cuando arrancan las sagas.
// Con `export default store` el export se crearía después de run() y la saga SETUP (que importa este módulo:
// importación circular heredada) fallaría con "Cannot access before initialization".
export { store as default }

sagaMiddleware.run(sagas)
