import React from 'react';

const Mensaje = React.memo(function Mensaje({ rol, texto, imagen }) {
  return (
    <article className={rol === 'usuario' ? 'msg-usuario' : 'msg-ia'}>
      <p>{texto}</p>
      {imagen && (
        <img
          src={imagen}
          alt="Fotografía generada del plato peruano"
          className="media-render"
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />
      )}
    </article>
  );
});

export default Mensaje;