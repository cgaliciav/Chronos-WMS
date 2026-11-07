import React from 'react'
import { Link } from 'react-router-dom'

const Error503 = () => {
  return (
    <div className="container pl-5 pr-5 pt-5 pb-5 mb-auto text-dark font-size-32">
      <div className="font-weight-bold mb-3">Error</div>
      <div className="text-gray-6 font-size-24">
        Ups... hay en error en la aplicacion, por favor reingresa al sistema o comunicate con tu administrador. 
      </div>
      <div className="font-weight-bold font-size-70 mb-1">503 —</div>
      <Link to="/" className="btn btn-outline-primary width-100">
        Inicio
      </Link>
    </div>
  )
}

export default Error503
