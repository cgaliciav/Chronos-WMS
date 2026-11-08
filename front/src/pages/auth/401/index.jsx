import React from 'react'
import Titulo from 'components/Titulo'
import Error401 from 'components/cleanui/system/Errors/401'

const System404 = () => {
  return (
    <div>
      <Titulo texto="Error 401" />
      <Error401 />
    </div>
  )
}

export default System404
