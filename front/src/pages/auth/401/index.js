import React from 'react'
import { Helmet } from 'react-helmet'
import Error401 from 'components/cleanui/system/Errors/401'

const System404 = () => {
  return (
    <div>
      <Helmet title="Error 401" />
      <Error401 />
    </div>
  )
}

export default System404
