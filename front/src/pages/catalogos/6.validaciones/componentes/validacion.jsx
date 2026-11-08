import React, { useEffect, useState } from 'react'
import { Dropdown, Button } from 'antd'
import { notification } from 'helpers/feedback'
import { DownOutlined, CheckCircleTwoTone, CloseCircleTwoTone, QuestionCircleTwoTone } from '@ant-design/icons'
import ProductoValidado from 'services/axios/productoValidado'

const Validacion = ({
  productoId, 
  productoValidado=null,
  disabled=false,
}) => {


  const [guardandoValidacion, setGuardandoValidacion] = useState(false);
  const [validacionProducto, setValidacionProducto] = useState(null);

  useEffect(() => {
    console.log({ productoValidado })
    if (productoValidado !== null)
      setValidacionProducto(productoValidado.validacion ?? 'no-revisado');
    else
      setValidacionProducto('no-revisado');

  }, [productoValidado]);

  const handleMenuClick = async (e) => {
    const { key } = e;
    console.log({ productoId, validacion: key });
    setGuardandoValidacion(true);
    const peticiones = {
      valido: () => {
        console.log("peticion valido", { key });
        return ProductoValidado.validar({
          productoId,
          nombre: "",
          key,
        })
      },
      invalido: () => {
        console.log("peticion invalido", { key });
        return ProductoValidado.invalidar({
          productoId,
          nombre: "",
          key,
        })
      },
      'no-revisado': () => {
        console.log("peticion no-revisado", { key });
        return ProductoValidado.noRevisado({
          productoId,
          nombre: "",
          key,
        })
      },
    }
    let respValidacion;
    try {
      respValidacion = await peticiones[key]();
    } catch {
      // El interceptor de axios ya mostró el error; se trata como respuesta vacía (aviso de abajo).
      respValidacion = undefined;
    }
    console.log({ respValidacion });
    if (respValidacion ?? false) {
      setValidacionProducto(key);
    }
    else {
      notification.error({
        description: 'No se puede cambiar el estado',
        title: 'Intente más tarde, si el problema persiste verifique con su administrador',
      })

    }

    setGuardandoValidacion(false);


  }

  const iconosJsx = {
    valido: (<CheckCircleTwoTone style={{ fontSize: '150%' }} twoToneColor="#52c41a" />),
    invalido: (<CloseCircleTwoTone style={{ fontSize: '150%' }} twoToneColor="#eb2f2f" />),
    'no-revisado': (<QuestionCircleTwoTone style={{ fontSize: '150%' }} twoToneColor="#eba02f" />),
  }

  const menuValidacion = {
    onClick: handleMenuClick,
    items: [
      { key: 'valido', icon: iconosJsx.valido, label: 'Válido' },
      { key: 'invalido', icon: iconosJsx.invalido, label: 'Inválido' },
      { key: 'no-revisado', icon: iconosJsx['no-revisado'], label: 'No revisado' },
    ],
  }


  return (
    <>
      {
          disabled ? (
            <Button 
              type="text" 
              icon={iconosJsx[validacionProducto]} 
              loading={guardandoValidacion}
            />
          ) : (
            <Dropdown menu={menuValidacion}>
              <Button 
                type="text"
                icon={iconosJsx[validacionProducto]} 
                loading={guardandoValidacion} 
              >
                <DownOutlined />
              </Button>
            </Dropdown>
      )}
    </>
)
};

export default Validacion;