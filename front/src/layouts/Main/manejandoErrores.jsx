

// import history from 'redux/history'
import React from 'react'
import System503 from 'pages/auth/503'

export default class ManejandoErrores extends React.Component {
  
  state = {
    hasError: false
  };

  static getDerivedStateFromError(error) {
    // Actualiza el estado para que el siguiente renderizado muestre la interfaz de repuesto
    console.log('getDerivedStateFromError',error);
    return { hasError: true };
  }
  
  componentDidCatch(error, errorInfo) {
    console.log(error,errorInfo);   
    
    // this.props.history.push("/first"); 
    // const {history}=this.props;
    // console.log('PROSP',this.props)
    // navigate("/auth/500");
  }

  render(){
    const {children}=this.props;
    const {hasError}=this.state;
    if(hasError){
      return(
        <System503 />
        // <div>
        //   <div className="font-weight-bold mb-3">Error Inesperado</div>
        //   <div className="text-gray-6 font-size-24">
        //     Esto es vergonzoso, pero hay un error en el sistema, por favor sal del sistema y vuelve a entrar, si el problema persiste contacta al administrador. 
        //   </div>
        //   <div className="font-weight-bold font-size-70 mb-1">503 —</div>
        //   <a href="" className="btn btn-outline-primary width-100">
        //     Inicio
        //   </a>
        // </div>
      )
    }
    return (
      <div className="cui__utils__content">{children}</div>
    )
  }
}