import { useState, useEffect } from 'react';
import { PRIZES, type Prize } from '@ruleta/shared';
import './App.css';

type AppState = 'form' | 'roulette' | 'result';

interface UserData {
  cedula: string;
  nombre: string;
  correo: string;
}

// Paleta Bellapelle para los segmentos de la ruleta
const COLORS = ['#3aaa96', '#5dbfae', '#e8698a', '#2d8e7c', '#f2bfca'];

function App() {
  const [appState, setAppState] = useState<AppState>('form');
  const [userData, setUserData] = useState<UserData | null>(null);
  const [prizeWon, setPrizeWon] = useState<Prize | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [hasSpun, setHasSpun] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modal states para resultado previo
  const [showSavedModal, setShowSavedModal] = useState(false);
  const [savedData, setSavedData] = useState<{ userData: UserData, prize: Prize } | null>(null);

  // Al cargar la app, verificamos si ya existe una participación exitosa.
  // Solo mostramos el modal informativo — NO bloqueamos la ruleta para nuevas cédulas.
  useEffect(() => {
    const saved = localStorage.getItem('ruleta_resultado');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setSavedData(data);
        setShowSavedModal(true);
        // hasSpun se mantiene en false para que una nueva cédula pueda participar.
        // El backend es quien valida y rechaza si la misma cédula ya jugó (HTTP 409).
      } catch (e) {
        console.error('Error leyendo localStorage', e);
      }
    }
  }, []);

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setUserData({
      cedula: formData.get('cedula') as string,
      nombre: formData.get('nombre') as string,
      correo: formData.get('correo') as string,
    });
    setErrorMsg(null);
    setAppState('roulette');
  };

  const spinRoulette = async () => {
    if (isSpinning || hasSpun || !userData) return;

    setIsSpinning(true);
    setErrorMsg(null);

    try {
      // Tomamos las variables de entorno inyectadas por Vite
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !anonKey) {
        throw new Error('Falta configuración de variables de entorno de Supabase.');
      }

      // Hacemos el POST a la Edge Function
      const response = await fetch(`${supabaseUrl}/functions/v1/spin-roulette`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${anonKey}`
        },
        body: JSON.stringify(userData)
      });

      const data = await response.json();

      if (!response.ok) {
        // Lanzamos el error para que caiga en el catch y se muestre en pantalla
        throw new Error(data.error || 'Ocurrió un error al contactar el servidor.');
      }

      setHasSpun(true);

      // Obtenemos el valor que devuelve el backend (ya sea en data.premio o data.prize, texto u objeto)
      const serverRawPrize = data.premio || data.prize;

      // Buscamos el índice correcto en nuestra constante PRIZES
      const randomIndex = PRIZES.findIndex(p =>
        p.id === serverRawPrize?.id || // Si es un objeto { id: '1' }
        p.name === serverRawPrize ||   // Si es el texto "Limpieza facial"
        p.id === serverRawPrize        // Si es el id "1"
      );

      if (randomIndex === -1) {
        throw new Error('El premio devuelto por el servidor no fue reconocido.');
      }

      const selectedPrize = PRIZES[randomIndex];

      // Calculamos la rotación exacta
      const segmentAngle = 360 / PRIZES.length;
      const prizeCenterAngle = (randomIndex * segmentAngle) + (segmentAngle / 2);
      const targetRotation = 360 - prizeCenterAngle;

      // Agregamos rotaciones extra para el efecto visual
      const extraSpins = 360 * 5;
      const finalRotation = rotation + extraSpins + (targetRotation - (rotation % 360));

      setRotation(finalRotation);

      // Esperamos a que la animación de CSS termine (5s)
      setTimeout(() => {
        setIsSpinning(false);
        setPrizeWon(selectedPrize);

        // Guardamos el resultado en el navegador para mostrarlo en futuras visitas
        localStorage.setItem('ruleta_resultado', JSON.stringify({
          userData: userData,
          prize: selectedPrize
        }));

        setTimeout(() => setAppState('result'), 1200);
      }, 5000);

    } catch (error) {
      setIsSpinning(false);
      // Mostramos el error devuelto por la Edge Function (ej. "Esta cédula ya participó")
      setErrorMsg(error instanceof Error ? error.message : 'Error inesperado.');
    }
  };

  const gradientParts = PRIZES.map((_, i) => {
    const start = i * (360 / PRIZES.length);
    const end = (i + 1) * (360 / PRIZES.length);
    return `${COLORS[i % COLORS.length]} ${start}deg ${end}deg`;
  }).join(', ');

  const conicBackground = `conic-gradient(${gradientParts})`;

  return (
    <div className="app-container">
      {/* ── Logo Bellapelle ─────────────────────────── */}
      <header className="app-header">
        <div className="brand-logo">
          bella<span className="petal">🌸</span>pelle
        </div>
        <div className="brand-tagline-row">Skin Care&nbsp;·&nbsp;Wellness</div>
        <p className="brand-subtitle">by Dra. Mai Ling Torres</p>
        <h2>Ruleta de Promociones</h2>
      </header>

      <main className="app-main">
        {appState === 'form' && (
          <form className="glass-panel registration-form" onSubmit={handleFormSubmit}>
            <h3>Ingresa tus datos para participar</h3>

            <div className="form-group">
              <label htmlFor="cedula">Cédula</label>
              <input type="text" id="cedula" name="cedula" required placeholder="Ej: 123456789" />
            </div>

            <div className="form-group">
              <label htmlFor="nombre">Nombre Completo</label>
              <input type="text" id="nombre" name="nombre" required placeholder="Ej: María Pérez" />
            </div>

            <div className="form-group">
              <label htmlFor="correo">Correo Electrónico</label>
              <input type="email" id="correo" name="correo" required placeholder="ejemplo@correo.com" />
            </div>

            <button type="submit" className="btn-primary">¡Ir a la ruleta!</button>
          </form>
        )}

        {appState === 'roulette' && (
          <div className="glass-panel roulette-container">
            <h3>¡Prueba tu suerte!</h3>
            <p>Hola, <strong>{userData?.nombre}</strong>. Tienes un intento para girar la ruleta.</p>

            <div className="roulette-wrapper">
              <div className="pointer"></div>
              <div
                className="roulette-wheel"
                style={{
                  background: conicBackground,
                  transform: `rotate(${rotation}deg)`,
                  transition: isSpinning ? 'transform 5s cubic-bezier(0.2, 0.8, 0.1, 1)' : 'none'
                }}
              >
                {PRIZES.map((prize, i) => {
                  const angle = (i * (360 / PRIZES.length)) + ((360 / PRIZES.length) / 2);
                  return (
                    <div
                      key={prize.id}
                      className="segment-text"
                      style={{
                        transform: `rotate(${angle - 90}deg) translate(25px, -50%)`
                      }}
                    >
                      {prize.name}
                    </div>
                  );
                })}
              </div>
            </div>

            {errorMsg && (
              <div className="error-message">
                <p>⚠️ {errorMsg}</p>
              </div>
            )}

            <button
              className="btn-primary spin-btn"
              onClick={spinRoulette}
              disabled={isSpinning || hasSpun}
            >
              {isSpinning ? 'Procesando...' : hasSpun ? 'Ruleta girada' : '¡GIRAR RULETA!'}
            </button>
          </div>
        )}

        {appState === 'result' && (
          <div className="glass-panel result-container">
            <div className="confetti-icon">🎉</div>
            <h2>¡Felicidades!</h2>
            <div className="prize-won">
              <h3>Has ganado:</h3>
              <p className="prize-name">{prizeWon?.name}</p>
            </div>

            <div className="user-details">
              <p><strong>A nombre de:</strong> {userData?.nombre}</p>
              <p><strong>Cédula:</strong> {userData?.cedula}</p>
            </div>

            <div className="screenshot-instructions">
              <p className="main-instruction">📸 <strong>¡Toma un screenshot de esta pantalla!</strong></p>

              <div className="rules-block">
                <p>⚠️ <strong>Términos para reclamar:</strong></p>
                <ul>
                  <li>Debes presentar tu <strong>cédula original</strong> física en el local.</li>
                  <li>Promoción válida hasta el <strong>31 de agosto</strong>.</li>
                  <li>Promoción válida <strong>solo una vez</strong> y únicamente para la persona ganadora.</li>
                  <li><strong>No se permite</strong> transferir ni reclamar el premio con otra identidad.</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </main>

      {showSavedModal && savedData && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content">
            {/* Mini logo de marca en el modal */}
            <div className="modal-brand">
              <div className="brand-logo">bella<span className="petal">🌸</span>pelle</div>
              <div className="brand-tagline-row">Skin Care&nbsp;·&nbsp;Wellness</div>
            </div>

            <p className="modal-title">Tu participación ya fue registrada.</p>

            <div className="user-details" style={{ width: '100%' }}>
              <p><strong>Nombre:</strong> {savedData.userData.nombre}</p>
              <p><strong>Cédula:</strong> {savedData.userData.cedula}</p>
            </div>

            <div className="prize-won" style={{ width: '100%' }}>
              <h3>Premio ganado</h3>
              <p className="prize-name">{savedData.prize.name}</p>
            </div>

            <div className="rules-block" style={{ width: '100%', textAlign: 'left' }}>
              <p>⚠️ Para reclamarlo:</p>
              <ul>
                <li>Presenta tu <strong>cédula original</strong> en el local.</li>
                <li>Válido hasta el <strong>31 de agosto</strong>.</li>
                <li>La promoción es válida <strong>una sola vez</strong>.</li>
              </ul>
            </div>

            <button className="mt-4" onClick={() => setShowSavedModal(false)}>
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
