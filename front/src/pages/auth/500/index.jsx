import React from 'react'
import Titulo from 'components/Titulo'
import Error500 from 'components/cleanui/system/Errors/500'

const System500 = () => {
  return (
    <div>
      <Titulo texto="Error 500" />
      <Error500 />
    </div>
  )
}

export default System500
