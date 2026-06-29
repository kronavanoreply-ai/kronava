import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/* ─── SVGs ─────────────────────────────────────────────────────────────── */
const IllustrationRest = () => (
  <svg width="180" height="180" viewBox="0 0 180 180" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* horizonte + figura em repouso */}
    <line x1="20" y1="120" x2="160" y2="120" stroke="#1A1A1A" strokeWidth="1" strokeLinecap="round"/>
    <line x1="40" y1="120" x2="40" y2="60" stroke="#1A1A1A" strokeWidth="1" strokeLinecap="round"/>
    <path d="M30 60 Q40 40 50 60" stroke="#1A1A1A" strokeWidth="1" fill="none" strokeLinecap="round"/>
    <line x1="40" y1="80" x2="28" y2="95" stroke="#1A1A1A" strokeWidth="1" strokeLinecap="round"/>
    <line x1="40" y1="80" x2="52" y2="95" stroke="#1A1A1A" strokeWidth="1" strokeLinecap="round"/>
    {/* sol / lua no horizonte */}
    <circle cx="130" cy="90" r="18" stroke="#1A1A1A" strokeWidth="1" fill="none"/>
    <line x1="130" y1="64" x2="130" y2="58" stroke="#1A1A1A" strokeWidth="1" strokeLinecap="round"/>
    <line x1="130" y1="116" x2="130" y2="122" stroke="#1A1A1A" strokeWidth="1" strokeLinecap="round"/>
    <line x1="104" y1="90" x2="98" y2="90" stroke="#1A1A1A" strokeWidth="1" strokeLinecap="round"/>
    <line x1="156" y1="90" x2="162" y2="90" stroke="#1A1A1A" strokeWidth="1" strokeLinecap="round"/>
    {/* reflexo no chão */}
    <line x1="80" y1="128" x2="160" y2="128" stroke="#1A1A1A" strokeWidth="0.5" strokeLinecap="round" opacity="0.3"/>
    <line x1="95" y1="134" x2="160" y2="134" stroke="#1A1A1A" strokeWidth="0.5" strokeLinecap="round" opacity="0.15"/>
  </svg>
);

const IllustrationFlow = () => (
  <svg width="180" height="180" viewBox="0 0 180 180" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* constelação — pontos e linhas finas */}
    <circle cx="50"  cy="50"  r="1.5" fill="#1A1A1A"/>
    <circle cx="90"  cy="35"  r="1.5" fill="#1A1A1A"/>
    <circle cx="135" cy="55"  r="1.5" fill="#1A1A1A"/>
    <circle cx="70"  cy="90"  r="1.5" fill="#1A1A1A"/>
    <circle cx="115" cy="100" r="1.5" fill="#1A1A1A"/>
    <circle cx="55"  cy="130" r="1.5" fill="#1A1A1A"/>
    <circle cx="140" cy="135" r="1.5" fill="#1A1A1A"/>
    <circle cx="90"  cy="150" r="1.5" fill="#1A1A1A"/>

    <line x1="50"  y1="50"  x2="90"  y2="35"  stroke="#1A1A1A" strokeWidth="0.6" opacity="0.5"/>
    <line x1="90"  y1="35"  x2="135" y2="55"  stroke="#1A1A1A" strokeWidth="0.6" opacity="0.5"/>
    <line x1="135" y1="55"  x2="115" y2="100" stroke="#1A1A1A" strokeWidth="0.6" opacity="0.5"/>
    <line x1="50"  y1="50"  x2="70"  y2="90"  stroke="#1A1A1A" strokeWidth="0.6" opacity="0.5"/>
    <line x1="70"  y1="90"  x2="115" y2="100" stroke="#1A1A1A" strokeWidth="0.6" opacity="0.5"/>
    <line x1="70"  y1="90"  x2="55"  y2="130" stroke="#1A1A1A" strokeWidth="0.6" opacity="0.5"/>
    <line x1="115" y1="100" x2="140" y2="135" stroke="#1A1A1A" strokeWidth="0.6" opacity="0.5"/>
    <line x1="55"  y1="130" x2="90"  y2="150" stroke="#1A1A1A" strokeWidth="0.6" opacity="0.5"/>
    <line x1="140" y1="135" x2="90"  y2="150" stroke="#1A1A1A" strokeWidth="0.6" opacity="0.5"/>

    {/* curva de fluxo */}
    <path d="M30 90 Q90 60 150 90" stroke="#1A1A1A" strokeWidth="0.8" fill="none" strokeLinecap="round" opacity="0.25"/>
  </svg>
);

const IllustrationArrival = () => (
  <svg width="180" height="180" viewBox="0 0 180 180" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* porta aberta — minimalista */}
    <rect x="60" y="40" width="60" height="100" rx="1" stroke="#1A1A1A" strokeWidth="1" fill="none"/>
    {/* batente interno — porta entreaberta */}
    <path d="M90 40 L115 50 L115 140 L90 140" stroke="#1A1A1A" strokeWidth="0.8" fill="none" opacity="0.4"/>
    {/* maçaneta */}
    <circle cx="95" cy="93" r="2.5" stroke="#1A1A1A" strokeWidth="0.8" fill="none"/>
    {/* luz vinda de dentro — irradiação sutil */}
    <line x1="118" y1="90" x2="128" y2="85" stroke="#1A1A1A" strokeWidth="0.5" strokeLinecap="round" opacity="0.3"/>
    <line x1="118" y1="90" x2="130" y2="90" stroke="#1A1A1A" strokeWidth="0.5" strokeLinecap="round" opacity="0.25"/>
    <line x1="118" y1="90" x2="128" y2="95" stroke="#1A1A1A" strokeWidth="0.5" strokeLinecap="round" opacity="0.3"/>
    {/* chão */}
    <line x1="45" y1="140" x2="135" y2="140" stroke="#1A1A1A" strokeWidth="1" strokeLinecap="round"/>
    <line x1="38" y1="145" x2="142" y2="145" stroke="#1A1A1A" strokeWidth="0.5" strokeLinecap="round" opacity="0.3"/>
  </svg>
);

/* ─── Dados dos steps ───────────────────────────────────────────────────── */
const STEPS = [
  {
    illustration: <IllustrationRest />,
    headline: 'Sua mente merece espaço.',
    body: 'Você não deveria acordar pensando em contas ou vencimentos.\nO Kronava cuida disso — enquanto você cuida do que importa.',
    cta: 'Continuar',
    ctaSolid: false,
  },
  {
    illustration: <IllustrationFlow />,
    headline: 'Inteligência que trabalha no silêncio.',
    body: 'Sem planilhas. Sem notificações invasivas.\nSó clareza — quando você precisar, onde você estiver.',
    cta: 'Continuar',
    ctaSolid: false,
  },
  {
    illustration: <IllustrationArrival />,
    headline: 'Tudo pronto.',
    body: 'Seu painel já te espera.\nComece com o que você tem hoje.',
    cta: 'Entrar no Kronava',
    ctaSolid: true,
  },
];

/* ─── Componente principal ──────────────────────────────────────────────── */
export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(true);

  // Guard: se já completou, vai direto ao dashboard
  useEffect(() => {
    if (localStorage.getItem('onboarding_completed') === 'true') {
      navigate('/dashboard', { replace: true });
    }
  }, [navigate]);

  const goTo = (next) => {
    setVisible(false);
    setTimeout(() => {
      setStep(next);
      setVisible(true);
    }, 300);
  };

  const handleCTA = () => {
    if (step < STEPS.length - 1) {
      goTo(step + 1);
    } else {
      localStorage.setItem('onboarding_completed', 'true');
      navigate('/dashboard', { replace: true });
    }
  };

  const handleSkip = () => {
    localStorage.setItem('onboarding_completed', 'true');
    navigate('/dashboard', { replace: true });
  };

  const current = STEPS[step];

  return (
    <>
      {/* Google Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400&family=Inter:wght@300;400&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .onb-root {
          min-height: 100dvh;
          background: #F5F3EF;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Inter', sans-serif;
          -webkit-font-smoothing: antialiased;
        }

        .onb-card {
          width: 100%;
          max-width: 420px;
          min-height: 100dvh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-between;
          padding: 28px 32px 40px;
          position: relative;
        }

        /* skip */
        .onb-skip {
          align-self: flex-end;
          background: none;
          border: none;
          cursor: pointer;
          font-family: 'Inter', sans-serif;
          font-weight: 300;
          font-size: 13px;
          color: #6B6B6B;
          letter-spacing: 0.02em;
          padding: 4px 0;
        }
        .onb-skip:hover { color: #1A1A1A; }

        /* conteúdo central */
        .onb-body {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 28px;
          text-align: center;
          opacity: 1;
          transition: opacity 300ms ease-in-out;
          width: 100%;
        }
        .onb-body.hidden { opacity: 0; }

        .onb-headline {
          font-family: 'Cormorant Garamond', serif;
          font-weight: 300;
          font-size: 32px;
          color: #1A1A1A;
          line-height: 1.2;
          letter-spacing: -0.01em;
        }
        .onb-headline.large { font-size: 38px; }

        .onb-text {
          font-family: 'Inter', sans-serif;
          font-weight: 300;
          font-size: 15px;
          color: #6B6B6B;
          line-height: 1.6;
          white-space: pre-line;
          max-width: 320px;
        }

        /* footer */
        .onb-footer {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 24px;
          width: 100%;
        }

        /* dots */
        .onb-dots {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        .onb-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #D4D4D0;
          transition: background 300ms ease;
        }
        .onb-dot.active { background: #1A1A1A; }

        /* CTA ghost */
        .onb-cta-ghost {
          background: none;
          border: 1px solid #2C2C2C;
          color: #2C2C2C;
          font-family: 'Inter', sans-serif;
          font-weight: 400;
          font-size: 15px;
          letter-spacing: 0.04em;
          padding: 14px 40px;
          border-radius: 6px;
          cursor: pointer;
          width: 100%;
          max-width: 280px;
          transition: background 200ms ease, color 200ms ease;
        }
        .onb-cta-ghost:hover {
          background: #2C2C2C;
          color: #F5F3EF;
        }

        /* CTA solid */
        .onb-cta-solid {
          background: #2C2C2C;
          border: 1px solid #2C2C2C;
          color: #F5F3EF;
          font-family: 'Inter', sans-serif;
          font-weight: 400;
          font-size: 15px;
          letter-spacing: 0.04em;
          padding: 16px 32px;
          border-radius: 6px;
          cursor: pointer;
          width: 100%;
          max-width: 280px;
          transition: opacity 200ms ease;
        }
        .onb-cta-solid:hover { opacity: 0.85; }
      `}</style>

      <div className="onb-root">
        <div className="onb-card">

          {/* Skip */}
          <button className="onb-skip" onClick={handleSkip}>
            Pular
          </button>

          {/* Conteúdo — fade controlado */}
          <div className={`onb-body ${visible ? '' : 'hidden'}`}>
            {current.illustration}

            <h1 className={`onb-headline ${step === 2 ? 'large' : ''}`}>
              {current.headline}
            </h1>

            <p className="onb-text">{current.body}</p>
          </div>

          {/* Footer: dots + CTA */}
          <div className="onb-footer">
            <div className="onb-dots">
              {STEPS.map((_, i) => (
                <div key={i} className={`onb-dot ${i === step ? 'active' : ''}`} />
              ))}
            </div>

            <button
              className={current.ctaSolid ? 'onb-cta-solid' : 'onb-cta-ghost'}
              onClick={handleCTA}
            >
              {current.cta}
            </button>
          </div>

        </div>
      </div>
    </>
  );
}
