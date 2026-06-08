import { useState } from 'react'

const steps = [
  {
    icon: '💰',
    title: 'Suas finanças, claras',
    desc: 'Lance receitas e despesas, planeje o mês com projetados e acompanhe tudo em tempo real.',
    color: '#7c6ff7'
  },
  {
    icon: '⏳',
    title: 'Projetado vs Realizado',
    desc: 'Planeje antes de gastar. Marque o que já aconteceu e veja o que ainda está por vir no mês.',
    color: '#4a9eff'
  },
  {
    icon: '🤖',
    title: 'Bot no Telegram',
    desc: 'Em breve: lance transações por mensagem de texto direto no Telegram, com categorização automática por IA.',
    color: '#4ade80'
  },
  {
    icon: '🎯',
    title: 'Tudo pronto!',
    desc: 'Comece definindo seu saldo inicial e lançando sua primeira transação.',
    color: '#fbbf24'
  }
]

export default function Onboarding({ onFinish }) {
  const [step, setStep] = useState(0)
  const current = steps[step]
  const isLast = step === steps.length - 1

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'var(--bg)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: 32, zIndex: 500
    }}>
      {/* Logo */}
      <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--purple2)', marginBottom: 48, letterSpacing: -0.5 }}>
        Kronava
      </div>

      {/* Card */}
      <div style={{
        width: '100%', maxWidth: 360,
        background: 'var(--bg2)', border: '1px solid var(--border2)',
        borderRadius: 24, padding: '40px 28px', textAlign: 'center'
      }}>
        <div style={{ fontSize: 56, marginBottom: 20 }}>{current.icon}</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>
          {current.title}
        </div>
        <div style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.7 }}>
          {current.desc}
        </div>
      </div>

      {/* Dots */}
      <div style={{ display: 'flex', gap: 8, margin: '28px 0' }}>
        {steps.map((_, i) => (
          <div key={i} style={{
            width: i === step ? 20 : 8, height: 8,
            borderRadius: 4, transition: 'all 0.3s',
            background: i === step ? current.color : 'var(--bg4)'
          }} />
        ))}
      </div>

      {/* Buttons */}
      <div style={{ width: '100%', maxWidth: 360, display: 'flex', gap: 10 }}>
        {step > 0 && (
          <button onClick={() => setStep(s => s - 1)} style={{
            flex: 1, padding: 14, borderRadius: 12,
            border: '1px solid var(--border)', background: 'var(--bg2)',
            color: 'var(--text2)', fontSize: 14, fontWeight: 600
          }}>Voltar</button>
        )}
        <button onClick={() => isLast ? onFinish() : setStep(s => s + 1)} style={{
          flex: 1, padding: 14, borderRadius: 12, border: 'none',
          background: current.color, color: '#0f0f1a',
          fontSize: 14, fontWeight: 700, cursor: 'pointer'
        }}>
          {isLast ? 'Começar agora' : 'Próximo'}
        </button>
      </div>

      {/* Skip */}
      {!isLast && (
        <button onClick={onFinish} style={{
          background: 'none', border: 'none', color: 'var(--text3)',
          fontSize: 13, marginTop: 16, cursor: 'pointer'
        }}>Pular introdução</button>
      )}
    </div>
  )
}