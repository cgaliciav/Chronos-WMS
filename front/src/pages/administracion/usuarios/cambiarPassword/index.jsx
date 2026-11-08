import { Button, Col, Form, Input, Row } from 'antd'
import { notification } from 'helpers/feedback'
import React, { useState } from 'react'
import Titulo from 'components/Titulo'
import { useNavigate } from 'react-router'
import UsuarioPeticiones from 'services/axios/usuarios'

const FormItem = Form.Item


const UsuarioCambiarPassword = () => {
  const [habilitado,setHabilitado]=useState(true);
  const [guardando,setGuardando]=useState(false);
  const [validacionPassNuevoConfirmacion,setValidacionPassNuevoConfirmacion]=useState('error');
  const [ayudaPassNuevoConfirmacion,setAyudaPassNuevoConfirmacion]=useState('');

  const [form] = Form.useForm();
  const navigate = useNavigate();
  

  const handleFinish = async values =>{
    try {
      setGuardando(true);
      setHabilitado(false);
      const respuesta = await UsuarioPeticiones.cambiarPassword({
        pa: values.passwordAnterior,
        pn: values.passwordNuevo,
      });

      if(respuesta!==undefined){
        navigate(-1)
        notification.success({
          title: 'Password actualizado',
          description: 'Tu acceso será con el nuevo password.',
        })
      }
    // } catch (error) {
    //   if(error.message){
    //     notification.error({
    //       message: error.message,
    //     })
    //   } else {
    //     console.log(error);
    //   }
      
    } catch {
      // El interceptor de axios ya mostró el error.
    } finally {
      setGuardando(false);
      setHabilitado(true);
    }
  } 


  const handleValidacionPassNuevoConfirmacion = e => {
    // const [ form ] = Form.useForm();
    const valoresForma = { ...form.getFieldsValue() }
    if (valoresForma.passwordNuevo === valoresForma.passwordAnterior) {
      setAyudaPassNuevoConfirmacion('El password nuevo no debe ser igual al password anterior');
      setValidacionPassNuevoConfirmacion('error');
      // this.setState({
      //   ayudaPassNuevoConfirmacion: 'El password nuevo no debe ser igual al password anterior',
      //   validacionPassNuevoConfirmacion: 'error',
      // })
    } else if (valoresForma.passwordNuevo !== e.target.value) {
      setAyudaPassNuevoConfirmacion('La confirmacion no es igual al password nuevo');
      setValidacionPassNuevoConfirmacion('error');
      // this.setState({
      //   ayudaPassNuevoConfirmacion: 'La confirmacion no es igual al password nuevo',
      //   validacionPassNuevoConfirmacion: 'error',
      // })
    } else {
      setAyudaPassNuevoConfirmacion('');
      setValidacionPassNuevoConfirmacion('success');
      // this.setState({
      //   ayudaPassNuevoConfirmacion: '',
      //   validacionPassNuevoConfirmacion: 'success',
      // })
    }
  }

  return (
    <div>
      <Titulo texto="Editar usuario" />
      <div className="card">
        <div className="card-header">
          <div className="utils__title">
            <strong>Cambiar Password</strong>
          </div>
          <div className="utils__titleDescription">
            Los password deben der de por lo menos 8 caracteres y un máximo de 20, deben tener al
            menos una minúscula, una mayúscula y un número
          </div>
          <div className="card-body">
            <Form form={form} layout="vertical" onFinish={handleFinish}>
              <div className="row">
                <div className="row col-lg-12">
                  <div className="col-lg-4">
                    <FormItem 
                      label="Password actual"
                      name="passwordAnterior"
                      rules={[
                        {
                          required: true,
                          message: 'Coloca el password actual',
                        },
                      ]}
                    >
                      <Input.Password placeholder="password actual" disabled={!habilitado} />
                    </FormItem>
                  </div>
                </div>
                <div className="row form-group col-lg-12">
                  <div className="col-lg-4">
                    <FormItem 
                      label="Password nuevo"
                      name="passwordNuevo"
                      rules={[
                        {
                          required: true,
                          // min:8,
                          // max:20,
                          message: 'Coloca el password nuevo',
                        },
                        {
                          min: 8,
                          message: 'Mínimo 8 caracteres',
                        },
                        {
                          max: 20,
                          message: 'Máximo 20 caracteres',
                        },
                        {
                          pattern: /([A-Z])/g,
                          message: 'Debe contener al menos una mayúscula',
                        },
                        {
                          pattern: /([a-z])/g,
                          message: 'Debe contener al menos una minúscula',
                        },
                        {
                          pattern: /([\d])/g,
                          message: 'Debe contener al menos un número',
                        },
                      ]}
                    >
                      <Input.Password placeholder="password nuevo" disabled={!habilitado} />
                    </FormItem> 
                  </div>
                  <div className="col-lg-4">
                    <FormItem
                      label="Confirmar password nuevo"
                      name="passwordNuevoConfirmacion"
                      validateStatus={validacionPassNuevoConfirmacion}
                      help={ayudaPassNuevoConfirmacion}
                      dependencies={["passwordNuevo"]}
                      rules={[
                        {
                          required: true,
                          message: 'Confirma el password nuevo',
                        },
                        ({getFieldValue})=>({
                          validator(rule,value){
                            if (value !==  getFieldValue('passwordNuevo')){
                              return Promise.reject(new Error('Confirmación y nuevo deben ser iguales'))
                            }
                            return Promise.resolve();
                          }

                        }),
                      ]}
                    >
                      <Input.Password
                        placeholder="confirmar password nuevo"
                        disabled={!habilitado}
                        onChange={handleValidacionPassNuevoConfirmacion}
                      />
                    </FormItem>
                  </div>
                </div>
                <div className="col-lg-12">
                  <div className="row">
                    <div className="col-lg-12">
                      <div className="form-actions">
                        <Row>
                          <Col span={8}>
                            <Button
                              type="primary"
                              htmlType="submit"
                              className="mr-2"
                              disabled={!habilitado}
                              loading={guardando}
                            >
                              {' '}
                              Guardar{' '}
                            </Button>
                          </Col>
                        </Row>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Form>
          </div>
        </div>
      </div>
    </div>
  )


};

export default UsuarioCambiarPassword
