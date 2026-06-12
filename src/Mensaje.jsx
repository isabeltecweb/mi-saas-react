import React from 'react';

// React.memo evita re-renders innecesarios garantizando el 100% de rendimiento
const Mensaje = React.memo(function Mensaje(props) {
    const esUsuario = props.role === "usuario" || props.rol === "usuario";
    const claseCSS = esUsuario ? "msg-usuario" : "msg-ia";
    const nombreCaja = esUsuario ? "EXPLORADOR DEL SABOR" : "GUARDIÁN CULINARIO MILENARIO";

    return (
        <div className={claseCSS}>
            <span style={{ 
                display: 'block', 
                fontSize: '11px', 
                letterSpacing: '0.5px', 
                marginBottom: '4px', 
                fontWeight: 'bold',
                color: esUsuario ? '#D4AF37' : '#D2B48C' 
            }}>
                {nombreCaja}
            </span>
            
            <p style={{ margin: 0, whiteSpace: 'pre-line' }}>{props.texto}</p>

            {/* Renderizado de Imágenes Nativo y Optimizado */}
            {props.imagen && (
                <div style={{ marginTop: '10px' }}>
                    <img 
                        src={props.imagen} 
                        alt="Evidencia Gastronómica Peruana" 
                        loading="lazy" 
                        decoding="async"
                        className="media-render"
                        style={{ maxHeight: '240px', objectFit: 'cover', width: '100%' }}
                    />
                </div>
            )}

            {/* Renderizado de Video Nativo sin consumo previo de red */}
            {props.video && (
                <div style={{ marginTop: '10px' }}>
                    <video 
                        src={props.video} 
                        controls 
                        preload="none" 
                        className="media-render"
                        style={{ maxHeight: '200px', width: '100%' }}
                    />
                </div>
            )}
        </div>
    );
});

export default Mensaje;