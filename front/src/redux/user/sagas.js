import { all, takeEvery, put, call, select } from 'redux-saga/effects'
import { notification } from 'antd'
import history from 'redux/history'
// import * as firebase from 'services/firebase'
import * as jwt from 'services/jwt'
import actions from './actions'

const mapAuthProviders = {
  // firebase: {
  //   login: firebase.login,
  //   register: firebase.register,
  //   currentAccount: firebase.currentAccount,
  //   logout: firebase.logout,
  // },
  jwt: {
    login: jwt.login,
    // register: jwt.register,
    currentAccount: jwt.currentAccount,
    logout: jwt.logout,
  },
}

export function* LOGIN({ payload }) {
  const { email, password } = payload
  yield put({
    type: 'user/SET_STATE',
    payload: {
      loading: true,
    },
  })
  const { authProvider: autProviderName } = yield select(state => state.settings)
  const success = yield call(mapAuthProviders[autProviderName].login, email, password)
  // console.log("success",success);
  if (success) {
    yield put({
      type: 'user/LOAD_CURRENT_ACCOUNT',
    })
    const ultimaVisitada=localStorage.getItem('ultimaVisitada');
    if(ultimaVisitada===null){
      yield history.push('/')
    }
    else{
      yield history.push(ultimaVisitada)
    }
    notification.success({
      message: '¡Bienvenido!',
      description: 'Has entrado correctamente al Almacén de Sony México',
    })
  }
  if (!success) {
    yield put({
      type: 'user/SET_STATE',
      payload: {
        loading: false,
      },
    })
  }
}

// export function* REGISTER({ payload }) {
//   const { email, password, name } = payload
//   yield put({
//     type: 'user/SET_STATE',
//     payload: {
//       loading: true,
//     },
//   })
//   const { authProvider } = yield select(state => state.settings)
//   const success = yield call(mapAuthProviders[authProvider].register, email, password, name)
//   if (success) {
//     yield put({
//       type: 'user/LOAD_CURRENT_ACCOUNT',
//     })
//     yield history.push('/')
//     notification.success({
//       message: 'Succesful Registered',
//       description: 'You have successfully registered!',
//     })
//   }
//   if (!success) {
//     yield put({
//       type: 'user/SET_STATE',
//       payload: {
//         loading: false,
//       },
//     })
//   }
// }

export function* LOAD_CURRENT_ACCOUNT() {
  yield put({
    type: 'user/SET_STATE',
    payload: {
      loading: true,
    },
  })
  const { authProvider } = yield select(state => state.settings)
  const response = yield call(mapAuthProviders[authProvider].currentAccount)
  if (response) {
    const { id, correo, nombre, avatar, roles } = response
    yield put({
      type: 'user/SET_STATE',
      payload: {
        id,
        nombre,
        correo,
        avatar,
        permisos:[...roles],
        authorized: true,
      },
    })
  }
  yield put({
    type: 'user/SET_STATE',
    payload: {
      loading: false,
      // authorized: false,
    },
  })
}

export function* LOGOUT() {
  const { authProvider } = yield select(state => state.settings)
  yield call(mapAuthProviders[authProvider].logout)
  localStorage.removeItem('ultimaVisitada')
  yield put({
    type: 'user/SET_STATE',
    payload: {
      id: '',
      name: '',
      role: '',
      email: '',
      avatar: '',
      authorized: false,
      loading: false,
    },
  })
}

export default function* rootSaga() {
  yield all([
    takeEvery(actions.LOGIN, LOGIN),
    // takeEvery(actions.REGISTER, REGISTER),
    takeEvery(actions.LOAD_CURRENT_ACCOUNT, LOAD_CURRENT_ACCOUNT),
    takeEvery(actions.LOGOUT, LOGOUT),
    LOAD_CURRENT_ACCOUNT(), // run once on app load to check user auth
  ])
}
