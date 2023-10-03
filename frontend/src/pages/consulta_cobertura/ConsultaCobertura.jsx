import React from 'react';
import "./ConsultaCobertura.css";
  

function ConsultaCobertura() {
    return(
        <div className='contenedor-cobertura-principal'>
        <div className="contenedor-cobertura">
        <iframe src='https://rocket-net-p3d7.vercel.app/' height= "100%" width= "100%" frameborder="0" scrolling="yes" id="iframe" allowfullscreen></iframe>
        </div>
        </div>
    )
}

export default ConsultaCobertura;