function Sidebar() {
  return (
    <aside className="sidebar" aria-label="Menu lateral">
      <header className="logo-area">
        <h2>Guardián del Sabor</h2>
        <p className="sidebar-subtitle">Gastronomía peruana interactiva</p>
      </header>
      <nav className="menu-lateral" aria-label="Navegacion principal">
        <button type="button">+ Nueva Consulta</button>
        <div className="historial">
          <p>Misterios descubiertos:</p>
          <ul>
            <li tabIndex="0">Origen de la Pachamanca</li>
            <li tabIndex="0">Ingredientes del Ceviche</li>
            <li tabIndex="0">Historia del Ají Panca</li>
          </ul>
        </div>
      </nav>
      <footer className="perfil">
        <span>Chef Pro</span>
      </footer>
    </aside>
  );
}

export default Sidebar;