function AvatarAndino({ speaking = false, variant = 'condor' }) {
  return (
    <div className={`avatar-andino ${speaking ? 'speaking' : ''}`} aria-hidden="true">
      {variant === 'alpaca' ? (
        <div className="alpaca-avatar">
          <div className="alpaca-ears"><span></span><span></span></div>
          <div className="alpaca-face">
            <div className="alpaca-eyes"><span></span><span></span></div>
            <div className="alpaca-mouth"></div>
          </div>
        </div>
      ) : (
        <div className="condor-avatar">
          <div className="condor-wings"><span></span><span></span></div>
          <div className="condor-head">
            <div className="condor-eyes"><span></span><span></span></div>
            <div className="condor-beak"></div>
          </div>
        </div>
      )}
    </div>
  );
}
export default AvatarAndino;