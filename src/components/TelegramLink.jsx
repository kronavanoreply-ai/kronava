import { useState } from 'react'
import { supabase } from '../store/supabase.js'

export default function TelegramLink({ userId }) {
  const [code, setCode] = useState(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  async function generateCode() {
    setLoading(true)
    try {
      const { data, error } = await supabase.rpc('generate_telegram_link_code', {
        p_user_id: userId
      })
      if (error) throw error
      setCode(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  function copyCode() {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg-edge)', padding: '48px 24px 32px', display: 'flex', flexDirection: 'column', gap: 32 }}>
      
      {/* Header */}
      <div>
        <div style={{ color: 'var(--gold)', fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 8 }}>
          Assistente
        </div>
        <div style={{ color: 'var(--ivory)', fontSize: 26, fontWeight: 300, letterSpacing: '-0.5px' }}>
          Vincular Telegram
        </div>
      </div>

      {/* Card explicativo */}
      <div style={{ background: 'rgba(20,20,22,0.75)', border: '1px solid rgba(191,167,111,0.15)', borderRadius: 16, padding: 24, backdropFilter: 'blur(20px)', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ color: 'var(--ivory)', fontSize: 15, fontWeight: 400, lineHeight: 1.6 }}>
          Conecte seu Telegram para registrar transações por mensagem de texto, consultar saldo e receber alertas automáticos.
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            '1. Gere o código abaixo',
            '2. Abra @kronava_bot no Telegram',
            '3. Envie /vincular CODIGO',
          ].map(step => (
            <div key={step} style={{ color: 'var(--ivory-muted)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--gold)', flexShrink: 0 }} />
              {step}
            </div>
          ))}
        </div>
      </div>

      {/* Código gerado */}
      {code && (
        <div style={{ background: 'rgba(20,20,22,0.75)', border: '1px solid rgba(191,167,111,0.3)', borderRadius: 16, padding: 24, backdropFilter: 'blur(20px)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div style={{ color: 'var(--ivory-muted)', fontSize: 11, letterSpacing: 3, textTransform: 'uppercase' }}>
            Seu código — válido por 15 min
          </div>
          <div style={{ color: 'var(--gold)', fontSize: 42, fontWeight: 300, letterSpacing: 12 }}>
            {code}
          </div>
          <button
            onClick={copyCode}
            style={{
              background: copied ? 'rgba(112,193,161,0.15)' : 'rgba(191,167,111,0.1)',
              border: `1px solid ${copied ? 'var(--green)' : 'rgba(191,167,111,0.3)'}`,
              borderRadius: 10, padding: '10px 24px',
              color: copied ? 'var(--green)' : 'var(--gold)',
              fontSize: 13, cursor: 'pointer', transition: 'all 0.2s'
            }}>
            {copied ? 'Copiado' : 'Copiar código'}
          </button>
        </div>
      )}

      {/* Botão gerar */}
      <button
        onClick={generateCode}
        disabled={loading}
        style={{
          background: 'linear-gradient(135deg, rgba(191,167,111,0.2), rgba(191,167,111,0.08))',
          border: '1px solid rgba(191,167,111,0.4)',
          borderRadius: 14, padding: '16px',
          color: 'var(--gold)', fontSize: 15, fontWeight: 500,
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.6 : 1, transition: 'all 0.2s'
        }}>
        {loading ? 'Gerando...' : code ? 'Gerar novo código' : 'Gerar código'}
      </button>

      {/* Link direto pro bot */}
      <a
        href="https://t.me/kronava_bot"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          textAlign: 'center', color: 'var(--ivory-muted)',
          fontSize: 13, textDecoration: 'none', letterSpacing: 0.3
        }}>
        Abrir @kronava_bot no Telegram →
      </a>
    </div>
  )
}
