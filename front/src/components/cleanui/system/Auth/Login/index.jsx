import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { Input, Button, Form } from 'antd'
import { useUsuarioStore } from 'stores/usuario.store'
import { limpiarCache } from "helpers/limpiarCache"
// import { Link } from 'react-router'
import AutorizacionPeticiones from 'services/axios/autorizacion';
import { version } from "../../../../../../package.json";
import style from '../style.module.scss'


const LOGO = 'Sony Almacén México'

const Login = () => {
  const logo = LOGO
  const login = useUsuarioStore(estado => estado.login)
  const cargando = useUsuarioStore(estado => estado.cargando)
  const navigate = useNavigate()
  const [apiVersion, setApiVersion] = useState("");
  
  // const [nuevaVersion, setNuevaVersion] = useState(false);
  
  useEffect(() => {
    AutorizacionPeticiones.version()
    .then( resp =>{
      // console.log("-------------------->",resp)
      if(resp?.version!==undefined){
        setApiVersion(resp.version);
        localStorage.setItem('apiVersion', resp.version);
        if(resp.version!==version){
          // setNuevaVersion(true);
          console.log({version})
        }
      }
    })
    .catch(error=>{
      console.error("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<",error);
    })
  }, []);
  
  const onFinish = async ({ email, password }) => {
    if (await login(email, password)) {
      // Vuelve a la última ruta visitada (la guarda el layout raíz) o al inicio.
      navigate(localStorage.getItem('ultimaVisitada') ?? '/')
    }
  }

  const onFinishFailed = errorInfo => {
    console.log('Failed:', errorInfo)
  }


  const actualizar=(e)=>{
    e.preventDefault()
    limpiarCache();

  }

  return (
    <div>
      <div className="text-center mb-5">
        <h1 className="mb-5 px-3">
          <strong>Bienvenido a {logo}</strong>
        </h1>
        {/* <p>
          Pluggable enterprise-level application framework.
          <br />
          An excellent front-end solution for web applications built upon Ant Design.
          <br />
          Credentials for testing purposes - <strong>demo@sellpixels.com</strong> /{' '}
          <strong>demo123</strong>
        </p> */}
      </div>
      <div className={`card ${style.container}`}>
        <div className="text-dark font-size-24 mb-3">
          <strong>Información de acceso</strong>
        </div>
        <Form
          layout="vertical"
          requiredMark={false}
          onFinish={onFinish}
          onFinishFailed={onFinishFailed}
          className="mb-4"
          // initialValues={{ email: 'demo@sellpixels.com', password: 'demo123' }}
        >
          <Form.Item
            name="email"
            rules={[{ required: true, message: 'Por favor introduce tu correo electrónico' }]}
          >
            <Input size="large" placeholder="Email" />
          </Form.Item>
          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Por favor introduce tu password' }]}
          >
            <Input size="large" type="password" placeholder="Password" />
          </Form.Item>
          <Button
            type="primary"
            size="large"
            className="text-center w-100"
            htmlType="submit"
            loading={cargando}
          >
            <strong>Acceso</strong>
          </Button>
        </Form>
        {/* <Link to="/auth/forgot-password" className="kit__utils__link font-size-16">
          Forgot Password?
        </Link> */}
      </div>
      <div className="text-center pt-2 mb-auto">
        <span className="mr-2">Si no recuerda su acceso, por favor comuníquese con el administrador del sistema</span>
        {/* <Link to="/auth/register" className="kit__utils__link font-size-16">
          Sign up
        </Link> */}
      </div>
      <div className="text-center text-strong pt-2 mb-auto">
        <span className="mr-2">{`Versión: ${version}`}</span>
        {/* {nuevaVersion?( */}
        <Button
          type="primary"
          ghost
          onClick={actualizar}
        >
          <strong>Actualizar</strong>
        </Button>
        {/* ):null} */}
        
        {/* <Link to="/auth/register" className="kit__utils__link font-size-16">
          Sign up
        </Link> */}
      </div>
      <div className="text-center text-strong pt-2 mb-auto">
        <strong><span className="mr-2">{`Versión API: ${apiVersion}`}</span></strong>
      </div>
      
    </div>
  )
}

export default Login
