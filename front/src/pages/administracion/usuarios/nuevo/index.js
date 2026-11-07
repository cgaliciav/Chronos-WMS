import React, { useState } from 'react'
import { Helmet } from 'react-helmet'
import { useHistory } from 'react-router-dom'
import { notification, Divider } from 'antd'
import moment from 'moment'
import ACL from 'components/cleanui/system/ACL'
import UsuarioPeticiones from 'services/axios/usuarios'
import FormaUsuario from '../componentes/forma'

const UsuarioNuevo = () => {
  const [guardando, setGuardando] = useState(false)
  const history = useHistory()

  const handleFinish = async values => {
    try {
      setGuardando(true)
      // console.log('*******************************FINISH', values)
      const proyectosIds = []
      if (values.proyectosInternos) {
        proyectosIds.concat(values.proyectosInternos)
      }
      if (values.proyectosExternos) {
        proyectosIds.concat(values.proyectosExternos)
      }
      const respuesta = await UsuarioPeticiones.nuevo({
        nombre: values.nombre,
        correo: values.correo,
        rolesIds: values.roles,
        vencimiento: values.fechaVencimiento.format('YYYY-MM-DD HH:mm:ss'),
        proyectosIds,
        bodegasIds: values.bodegas,
        areasIds: values.areas,
      })
      if (respuesta !== undefined) {
        // console.log('*******************************USUARIO GUARDADO', respuesta)
        history.push('/usuarios/listado')
        notification.success({
          message: 'Creado correctamente',
          description: 'El usuario fue creado correctamente',
        })
      }
    } finally {
      setGuardando(false)
    }
  }

  // console.log("***********************BODEGAS",interno,externo)
  return (
    <ACL roles={['USUARIO-NUEVO', 'ADMINISTRADOR']} redirect>
      <Helmet title="Nuevo usuario" />
      <div className="kit__utils__heading">
        <h5>
          <span className="mr-3">Nuevo Usuario</span>
        </h5>
      </div>
      <div className="card">
        <div className="card-body">
          <FormaUsuario
            handleFinish={handleFinish}
            guardando={guardando}
            habilitado
            valoresIniciales={{
              fechaVencimiento: moment().add(3, 'months'),
            }}
          />
          <Divider />
        </div>
      </div>
    </ACL>
  )
}

export default UsuarioNuevo
