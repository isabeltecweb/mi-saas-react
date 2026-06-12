import { useState, useRef, useEffect, useCallback } from 'react';
import Mensaje from './Mensaje';

function ChatArea() {
  // 🧠 MEMORIA DE ESTADO
  const [textoInput, setTextoInput] = useState("");
  const [escuchando, setEscuchando] = useState(false);
  const [listaMensajes, setListaMensajes] = useState([
    { 
      rol: "ia", 
      texto: "Saludos. Soy el Guardián del Sabor Peruano. ¿Qué misterio de nuestra historia culinaria deseas conocer hoy? Dime 'para' en cualquier momento si deseas silenciarme." 
    }
  ]);

  const cajaMensajesRef = useRef(null);
  const reconocimientoVozRef = useRef(null);

  // Auto-scroll
  useEffect(() => {
    if (cajaMensajesRef.current) {
      cajaMensajesRef.current.scrollTop = cajaMensajesRef.current.scrollHeight;
    }
  }, [listaMensajes]);

  // 🔊 SÍNTESIS DE VOZ (La IA Habla)
  const hablarRespuesta = useCallback((texto) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel(); // Detiene cualquier audio anterior
    
    const textoLimpio = texto.replace(/[*#]/g, ''); // Limpia formatos
    const enunciado = new SpeechSynthesisUtterance(textoLimpio);
    enunciado.lang = 'es-PE'; // Acento peruano
    enunciado.rate = 1.0;     
    enunciado.pitch = 0.95;   
    window.speechSynthesis.speak(enunciado);
  }, []);

  // 🎙️ RECONOCIMIENTO DE VOZ (El Usuario habla)
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'es-PE';

      rec.onstart = () => setEscuchando(true);
      rec.onend = () => setEscuchando(false);
      rec.onresult = (evento) => {
        const resultadoTexto = evento.results[0][0].transcript.trim();
        const comandoOpcion = resultadoTexto.toLowerCase();

        // 🛑 CONTROL POR VOZ: Detecta si el usuario dijo "para", "detente" o "silencio"
        if (comandoOpcion === "para" || comandoOpcion === "detente" || comandoOpcion === "silencio") {
          if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel(); // Silencia a la IA de inmediato
          }
          setTextoInput("");
          return;
        }

        setTextoInput(resultadoTexto);
      };

      reconocimientoVozRef.current = rec;
    }
  }, []);

  const controlarMicrofono = () => {
    if (!reconocimientoVozRef.current) {
      alert("El reconocimiento de voz no es soportado en este navegador.");
      return;
    }
    // Si el usuario hace clic mientras la IA habla, también actúa como botón de pánico
    if ('speechSynthesis' in window && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }

    if (escuchando) {
      reconocimientoVozRef.current.stop();
    } else {
      reconocimientoVozRef.current.start();
    }
  };

  // 📷 CONTROL DE IMÁGENES LOCALES (SUBIDA MANUAL)
  const manejarImagenLocal = (evento) => {
    const archivo = evento.target.files[0];
    if (!archivo) return;
    const urlTemporal = URL.createObjectURL(archivo);
    setListaMensajes(lista => [
      ...lista,
      { rol: "usuario", texto: "He adjuntado una imagen para análisis.", imagen: urlTemporal }
    ]);
  };

  // ⚙️ CONEXIÓN API GROQ
  const manejarEnvio = async (evento) => {
    evento.preventDefault();
    if (textoInput.trim() === "") return;

    const promptUsuario = textoInput;

    // Si el usuario escribe manualmente "para", detenemos la voz y salimos
    if (promptUsuario.toLowerCase() === "para" || promptUsuario.toLowerCase() === "detente") {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      setTextoInput("");
      return;
    }

    setListaMensajes(lista => [...lista, { rol: "usuario", texto: promptUsuario }, { rol: "ia", texto: "Analizando..." }]);
    setTextoInput(""); 

    try {
      const API_KEY = import.meta.env.VITE_GROQ_API_KEY;
      const URL_API = "https://api.groq.com/openai/v1/chat/completions";
      const respuesta = await fetch(URL_API, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${API_KEY}` 
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant", 
          messages: [
            { 
              role: "system", 
              content: "Eres un historiador experto en gastronomía peruana milenaria. Tu tono es respetuoso y conciso. REGLAS ESTRICTAS: 1) Tus respuestas deben ser muy cortas y directas, de máximo 2 o 3 oraciones. 2) Si el usuario te pide ver una foto, mostrar una imagen o conocer visualmente un plato o insumo (ej. papa, olluco, pachamanca, ceviche, cuy), incluye OBLIGATORIAMENTE la palabra clave '[MOSTRAR_IMAGEN]' al final de tu respuesta." 
            },
            { role: "user", content: promptUsuario }
          ],
          temperature: 0.3
        })
      });

      const datos = await respuesta.json();
      if (!respuesta.ok) throw new Error(datos.error?.message || "Error de conexión");

      let textoIA = datos.choices[0].message.content;

      // Lógica de inyección automática de imágenes bajo demanda
      let imagenRespuesta = null;
      
      if (textoIA.includes("[MOSTRAR_IMAGEN]") || promptUsuario.toLowerCase().match(/(muestra|foto|imagen|vea|ver)/)) {
        // Removemos la etiqueta del texto para que no sea leída por el sintetizador de voz
        textoIA = textoIA.replace("[MOSTRAR_IMAGEN]", "").trim();
        
        // Mapeo inteligente rápido y ligero de imágenes optimizadas de Unsplash
        const consulta = promptUsuario.toLowerCase();
        if (consulta.includes("pachamanca") || consulta.includes("huatia")) {
          imagenRespuesta = "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?auto=format&fit=crop&w=500&q=80";
        } else if (consulta.includes("papa") || consulta.includes("causa") || consulta.includes("tuberculo")) {
          imagenRespuesta = "https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=500&q=80";
        } else if (consulta.includes("maiz") || consulta.includes("chicha") || consulta.includes("choclo")) {
          imagenRespuesta = "https://images.unsplash.com/photo-1551754655-cd27e38d2076?auto=format&fit=crop&w=500&q=80";
        } else if (consulta.includes("ceviche") || consulta.includes("cebiche") || consulta.includes("pescado")) {
          imagenRespuesta = "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=500&q=80";
        } else {
          // Imagen gastronómica peruana genérica por defecto si pide otra cosa
          imagenRespuesta = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=500&q=80";
        }
      }

      setListaMensajes((listaActual) => {
        const listaSinPensando = listaActual.slice(0, -1);
        return [...listaSinPensando, { rol: "ia", texto: textoIA, imagen: imagenRespuesta }];
      });

      // La IA lee la respuesta corta
      hablarRespuesta(textoIA);

    } catch (error) {
      console.error(error);
      setListaMensajes((listaActual) => {
        const listaSinPensando = listaActual.slice(0, -1);
        return [...listaSinPensando, { rol: "ia", texto: `Error: ${error.message}` }];
      });
    }
  };

  return (
    <main className="chat-area">
      <header className="chat-header">
        <h3>SISTEMA DE INTELIGENCIA CULINARIA ANCESTRAL</h3>
      </header>
      
      <section className="mensajes-container" id="caja-mensajes" ref={cajaMensajesRef}>
        {listaMensajes.map((msg, indice) => (
          <Mensaje 
            key={indice} 
            rol={msg.rol} 
            texto={msg.texto} 
            imagen={msg.imagen}
            video={msg.video}
          />
        ))}
      </section>

      <footer className="input-area">
        <form className="chat-form" onSubmit={manejarEnvio}>
          
          {/* BOTÓN ADJUNTAR IMAGEN */}
          <label htmlFor="input-file-imagen" style={{ cursor: 'pointer', padding: '0 8px', fontSize: '1.3rem' }} title="Adjuntar imagen">
            📷
            <input 
              type="file" 
              id="input-file-imagen" 
              accept="image/*" 
              style={{ display: 'none' }} 
              onChange={manejarImagenLocal}
            />
          </label>

          {/* BOTÓN ACTIVACIÓN MICRÓFONO */}
          <button 
            type="button" 
            onClick={controlarMicrofono}
            style={{
              background: 'none',
              padding: '0 8px',
              fontSize: '1.3rem',
              border: 'none',
              cursor: 'pointer',
              animation: escuchando ? 'pulse 1.2s infinite ease-in-out' : 'none',
              color: escuchando ? '#C04000' : 'inherit'
            }}
            title="Interactuar por voz (Di 'para' para silenciar)"
          >
            {escuchando ? "🛑" : "🎙️"}
          </button>

          <input
            type="text"
            id="mensaje-input"
            placeholder={escuchando ? "Escuchando... di 'para' si quieres callarme" : "Pide una explicación corta o imágenes..."}
            autoComplete="off"
            value={textoInput}
            onChange={(evento) => setTextoInput(evento.target.value)}
          />
          <button type="submit">Consultar</button>
        </form>
      </footer>
    </main>
  );
}

export default ChatArea;