import auth from 'services/axios/autorizacion'
import user from 'services/axios/usuarios'
import store from 'store'

export async function login(email, password) {
  return auth
    .login(email,password)
//     .then(response => {
//       console.log("response",response);
//       if (response) {
//         // const { accessToken } = response.data
//         // if (accessToken) {
//         //   store.set('accessToken', accessToken)
//         // }
//         return response.data
//       }
//       return false
//     })
//     .catch(err => console.log(err))
}

// export async function register(email, password, name) {
//   return apiClient
//     .post('/auth/register', {
//       email,
//       password,
//       name,
//     })
//     .then(response => {
//       if (response) {
//         const { accessToken } = response.data
//         if (accessToken) {
//           store.set('accessToken', accessToken)
//         }
//         return response.data
//       }
//       return false
//     })
//     .catch(err => console.log(err))
// }

export async function currentAccount() {
  return user
    .actual()
    // .then(response => {
    //   if (response) {
    //     return response.data
    //   }
    //   return false
    // })
    // .catch(err => console.log(err))
}

export async function logout() {
  return auth
    .logout()
    .then(() => {
      store.remove('t')
      return true
    })
    .catch(err => console.log(err))
}
