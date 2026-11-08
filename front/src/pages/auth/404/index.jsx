import React from 'react'
import Titulo from 'components/Titulo'
import Error404 from 'components/cleanui/system/Errors/404'

const System404 = () => {
  return (
    <div>
      <Titulo texto="Error 404" />
      <Error404 />
    </div>
  )
}

export default System404
