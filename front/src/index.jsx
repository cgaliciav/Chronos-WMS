// Mismo orden de cascada que el build de CRA: antd, Bootstrap, perfect-scrollbar y la plantilla.
import 'antd/lib/style/index.less' // estilos base de antd 4
import './styles/antd.less' // componentes de antd 4 con el tema claro de la app
import 'bootstrap/dist/css/bootstrap.min.css'
import 'react-perfect-scrollbar/dist/css/styles.css'
import './global.scss' // estilos de la plantilla aún en uso (se retiran en las fases 4-6)

import React from 'react'
import ReactDOM from 'react-dom'
import { Provider } from 'react-redux'

import store from './redux/store'
import history from './redux/history'
import Localization from './localization'
import Router from './router'

ReactDOM.render(
  <Provider store={store}>
    <Localization>
      <Router history={history} />
    </Localization>
  </Provider>,
  document.getElementById('root'),
)
