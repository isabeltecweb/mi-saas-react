import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import Mensaje from './Mensaje';
import AvatarAndino from './AvatarAndino';

const LANGUAGE_CONFIG = {
  es: { label: 'Español', speechCode: 'es-PE', ttsPrefix: 'es', stopWords: ['para', 'detente', 'detener', 'silencio', 'callate'] },
  en: { label: 'English', speechCode: 'en-US', ttsPrefix: 'en', stopWords: ['stop', 'be quiet', 'silence', 'pause'] },
  fr: { label: 'Français', speechCode: 'fr-FR', ttsPrefix: 'fr', stopWords: ['arrete', 'arretez', 'stop', 'silence'] },
  de: { label: 'Deutsch', speechCode: 'de-DE', ttsPrefix: 'de', stopWords: ['stopp', 'anhalten', 'ruhe'] },
  zh: { label: '中文', speechCode: 'zh-CN', ttsPrefix: 'zh', stopWords: ['停止', '安静', '停下'] }
};

const REGION_MUSIC = {
  COSTA: '/audio/costa.mp3',
  SIERRA: '/audio/sierra.mp3',
  SELVA: '/audio/selva.mp3'
};

const DEFAULT_WELCOME = 'Saludos. Soy el Guardián del Sabor Peruano. ¿Qué misterio culinario deseas conocer hoy?';

function normalizeText(text) {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

function cleanModelText(text) {
  return text.replace(/\[PLATO:.*?\]/gi, '').replace(/\[REGION:.*?\]/gi, '').trim();
}

function buildFoodImageUrl(plateName) {
  const prompt = `realistic peruvian dish ${plateName}, professional food photography, natural light, high detail, authentic plating`;
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=768&height=432&nologo=true`;
}

function ChatArea() {
  const [textoInput, setTextoInput] = useState('');
  const [escuchando, setEscuchando] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [hablando, setHablando] = useState(false);
  const [idioma, setIdioma] = useState('es');
  const [vocesDisponibles, setVocesDisponibles] = useState([]);
  const [vozSeleccionada, setVozSeleccionada] = useState('');
  const [regionMusica, setRegionMusica] = useState('');
  const [avatarTipo, setAvatarTipo] = useState('condor');
  const [listaMensajes, setListaMensajes] = useState([{ rol: 'ia', texto: DEFAULT_WELCOME }]);

  const cajaMensajesRef = useRef(null);
  const reconocimientoVozRef = useRef(null);
  const audioRef = useRef(null);

  const currentLangConfig = useMemo(() => LANGUAGE_CONFIG[idioma] || LANGUAGE_CONFIG.es, [idioma]);

  useEffect(() => {
    if (cajaMensajesRef.current) cajaMensajesRef.current.scrollTop = cajaMensajesRef.current.scrollHeight;
  }, [listaMensajes, cargando]);

  useEffect(() => {
    const synth = window.speechSynthesis;
    if (!synth) return;
    let cancelled = false;

    const cargarVoces = () => {
      if (cancelled) return;
      const voces = synth.getVoices();
      const prefijo = currentLangConfig.ttsPrefix;
      const vocesFiltradas = voces.filter((voz) => voz.lang.toLowerCase().startsWith(prefijo));
      setVocesDisponibles(vocesFiltradas);
      setVozSeleccionada((prev) => (vocesFiltradas.some((voz) => voz.name === prev) ? prev : vocesFiltradas[0]?.name || ''));
    };

    cargarVoces();
    synth.onvoiceschanged = cargarVoces;
    return () => { cancelled = true; synth.onvoiceschanged = null; };
  }, [currentLangConfig]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!regionMusica || !REGION_MUSIC[regionMusica]) {
      audio.pause();
      audio.currentTime = 0;
      return;
    }
    audio.src = REGION_MUSIC[regionMusica];
    audio.loop = true;
    audio.volume = 0.15;
    const playPromise = audio.play();
    if (playPromise !== undefined) playPromise.catch(() => console.warn("Interacción requerida para reproducir audio"));
  }, [regionMusica]);

  const detenerTodo = useCallback(() => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; }
    if (reconocimientoVozRef.current && escuchando) { try { reconocimientoVozRef.current.stop(); } catch {} }
    setHablando(false);
    setRegionMusica('');
    setTextoInput('');
  }, [escuchando]);

  const hablarRespuesta = useCallback((texto) => {
    if (!('speechSynthesis' in window) || !texto) return;
    const synth = window.speechSynthesis;
    synth.cancel();
    const textoLimpio = cleanModelText(texto).replace(/[*#]/g, '').trim();
    if (!textoLimpio) return;

    const utterance = new SpeechSynthesisUtterance(textoLimpio);
    utterance.lang = currentLangConfig.speechCode;
    const vozExacta = vocesDisponibles.find((voz) => voz.name === vozSeleccionada);
    if (vozExacta) utterance.voice = vozExacta;
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.onstart = () => setHablando(true);
    utterance.onend = () => setHablando(false);
    utterance.onerror = () => setHablando(false);
    synth.speak(utterance);
  }, [vozSeleccionada, vocesDisponibles, currentLangConfig]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = currentLangConfig.speechCode;
    rec.onstart = () => setEscuchando(true);
    rec.onend = () => setEscuchando(false);
    rec.onresult = (evento) => {
      const resultadoTexto = evento.results[evento.results.length - 1][0].transcript.trim();
      const textoNormalizado = normalizeText(resultadoTexto);
      const comandos = currentLangConfig.stopWords.map(normalizeText);

      if (comandos.some((cmd) => textoNormalizado.includes(cmd))) {
        detenerTodo();
        return;
      }
      setTextoInput(resultadoTexto);
    };
    rec.onerror = () => setEscuchando(false);
    reconocimientoVozRef.current = rec;

    return () => { try { rec.stop(); } catch {} };
  }, [currentLangConfig, detenerTodo]);

  const controlarMicrofono = useCallback(() => {
    if (!reconocimientoVozRef.current) return alert('Tu navegador no soporta control por voz.');
    if ('speechSynthesis' in window && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      setHablando(false);
    }
    try {
      if (escuchando) reconocimientoVozRef.current.stop();
      else { reconocimientoVozRef.current.lang = currentLangConfig.speechCode; reconocimientoVozRef.current.start(); }
    } catch {}
  }, [escuchando, currentLangConfig]);

  const manejarEnvio = async (evento) => {
    evento.preventDefault();
    if (!textoInput.trim() || cargando) return;

    const promptUsuario = textoInput.trim();
    const promptNormalizado = normalizeText(promptUsuario);
    const comandos = currentLangConfig.stopWords.map(normalizeText);

    if (comandos.some((cmd) => promptNormalizado === cmd || promptNormalizado.includes(cmd))) {
      detenerTodo();
      return;
    }

    setListaMensajes((prev) => [...prev, { rol: 'usuario', texto: promptUsuario }]);
    setTextoInput('');
    setCargando(true);

    try {
      const API_KEY = import.meta.env.VITE_GROQ_API_KEY;
      if (!API_KEY) throw new Error('Falta configurar VITE_GROQ_API_KEY en tu archivo .env');

      const systemPrompt = `Eres un experto en gastronomia peruana. Responde en ${currentLangConfig.label}.
Reglas obligatorias:
1. Responde máximo en 3 oraciones claras.
2. Al final agrega exactamente estas etiquetas (solo una región):
[PLATO: nombre del plato en ingles sin tildes]
[REGION: COSTA] o [REGION: SIERRA] o [REGION: SELVA]
Ejemplo final: [PLATO: ceviche] [REGION: COSTA]`;

      const respuesta = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          temperature: 0.2,
          max_tokens: 250,
          messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: promptUsuario }]
        })
      });

      const datos = await respuesta.json();
      if (!respuesta.ok) throw new Error(datos?.error?.message || 'Error en API');

      const textoIA = datos?.choices?.[0]?.message?.content || '';
      const matchPlato = textoIA.match(/\[PLATO:\s*(.+?)\]/i);
      const matchRegion = textoIA.match(/\[REGION:\s*(COSTA|SIERRA|SELVA)\]/i);

      const platoDetectado = matchPlato?.[1]?.trim() || '';
      const regionDetectada = matchRegion?.[1]?.toUpperCase() || '';
      const textoMostrar = cleanModelText(textoIA) || 'No pude generar una respuesta clara.';
      const imagenRespuesta = platoDetectado ? buildFoodImageUrl(platoDetectado) : null;

      if (regionDetectada && REGION_MUSIC[regionDetectada]) {
        setRegionMusica(regionDetectada);
        setAvatarTipo(regionDetectada === 'SIERRA' ? 'alpaca' : 'condor');
      }

      setListaMensajes((prev) => [...prev, { rol: 'ia', texto: textoMostrar, imagen: imagenRespuesta }]);
      hablarRespuesta(textoMostrar);
    } catch (error) {
      setListaMensajes((prev) => [...prev, { rol: 'ia', texto: `Error: ${error.message}` }]);
    } finally {
      setCargando(false);
    }
  };

  return (
    <main className="chat-area" role="main">
      <audio ref={audioRef} preload="none" aria-hidden="true" />
      <header className="chat-header">
        <div className="chat-header-left">
          <AvatarAndino speaking={hablando} variant={avatarTipo} />
          <div>
            <h1 className="chat-title">Guardián del Sabor</h1>
            <p className="chat-subtitle">Historia, platos y regiones del Perú</p>
          </div>
        </div>
        <div className="controles-config">
          <select aria-label="Seleccionar idioma" value={idioma} onChange={(e) => setIdioma(e.target.value)}>
            <option value="es">Español</option>
            <option value="en">English</option>
            <option value="fr">Français</option>
            <option value="de">Deutsch</option>
            <option value="zh">中文</option>
          </select>
          <select aria-label="Seleccionar voz" value={vozSeleccionada} onChange={(e) => setVozSeleccionada(e.target.value)} disabled={vocesDisponibles.length === 0}>
            {vocesDisponibles.length === 0 ? <option value="">Cargando voces...</option> : vocesDisponibles.map((voz) => <option key={voz.name} value={voz.name}>{voz.name}</option>)}
          </select>
          <button type="button" className="btn-stop" onClick={detenerTodo} aria-label="Detener voz y musica">Parar</button>
        </div>
      </header>

      <section className="mensajes-container" ref={cajaMensajesRef} aria-live="polite">
        {listaMensajes.map((msg, i) => <Mensaje key={i} rol={msg.rol} texto={msg.texto} imagen={msg.imagen} />)}
        {cargando && <div className="msg-ia"><p>Preparando ingredientes...</p></div>}
      </section>

      <footer className="input-area">
        <form className="chat-form" onSubmit={manejarEnvio}>
          <button type="button" className={`btn-icon ${escuchando ? 'mic-active' : ''}`} onClick={controlarMicrofono} aria-label="Hablar por microfono">
            {escuchando ? '🛑' : '🎙️'}
          </button>
          <input type="text" aria-label="Escribe tu mensaje" placeholder={escuchando ? `Escuchando... di 'para' o 'detente'` : 'Ej: ¿Cuál es el origen del ceviche?'} autoComplete="off" value={textoInput} onChange={(e) => setTextoInput(e.target.value)} />
          <button type="submit" className="btn-submit" disabled={cargando}>{cargando ? '...' : 'Enviar'}</button>
        </form>
      </footer>
    </main>
  );
}

export default ChatArea;