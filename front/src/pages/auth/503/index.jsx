import React from 'react'
import Titulo from 'components/Titulo'
import Error503 from 'components/cleanui/system/Errors/503'

const System503 = () => {
  return (
    <div>
      <Titulo texto="Error 500" />
      <Error503 />
    </div>
  )
}

export default System503
