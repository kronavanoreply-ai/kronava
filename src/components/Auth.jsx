import { useState } from 'react'
import { signIn, signUp } from '../store/auth.js'

export default function Auth({ onAuth }) {
  const [mode, setMode] = useState('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    setError('')
    if (!email || !password) { setError('Preencha todos os campos'); return }
    if (mode === 'register' && !name) { setError('Informe seu nome'); return }
    if (password.length < 6) { setError('Senha deve ter no mínimo 6 caracteres'); return }

    setLoading(true)
    try {
      if (mode === 'login') {
        await signIn(email, password)
      } else {
        await signUp(email, password, name)
      }
      onAuth()
    } catch (err) {
      setError(err.message || 'Erro ao autenticar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-logo">Kronava</div>
      <div className="auth-tagline">Finanças · Agenda · Tarefas</div>

      <div className="auth-card">
        <div className="auth-title">
          {mode === 'login' ? 'Entrar na sua conta' : 'Criar conta'}
        </div>

        {mode === 'register' && (
          <div className="form-group">
            <label className="form-label">Nome</label>
            <input className="form-input" type="text" placeholder="Seu nome"
              value={name} onChange={e => setName(e.target.value)} />
          </div>
        )}

        <div className="form-group">
          <label className="form-label">E-mail</label>
          <input className="form-input" type="email" placeholder="seu@email.com"
            value={email} onChange={e => setEmail(e.target.value)} />
        </div>

        <div className="form-group">
          <label className="form-label">Senha</label>
          <input className="form-input" type="password" placeholder="••••••••"
            value={password} onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
        </div>

        {error && <div className="error-msg">{error}</div>}

        <button className="submit-btn" onClick={handleSubmit} disabled={loading}>
          {loading ? 'Aguarde...' : mode === 'login' ? 'Entrar' : 'Criar conta'}
        </button>

        <div className="auth-switch">
          {mode === 'login' ? (
            <>Não tem conta?{' '}
              <button onClick={() => { setMode('register'); setError('') }}>Criar conta</button>
            </>
          ) : (
            <>Já tem conta?{' '}
              <button onClick={() => { setMode('login'); setError('') }}>Entrar</button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}