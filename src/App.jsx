import { useState, useEffect } from 'react'
import { supabase } from './store/supabase.js'
import { getProfile } from './store/auth.js'
import Auth from './components/Auth.jsx'
import Dashboard from './components/Dashboard.jsx'
import Transactions from './components/Transactions.jsx'
import Charts from './components/Charts.jsx'
import Planning from './components/Planning.jsx'
import TelegramLink from './components/TelegramLink.jsx'
import AddModal from './components/AddModal.jsx'
import Toast from './components/Toast.jsx'

export default function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [screen, setScreen] = useState('home')
  const [showAdd, setShowAdd] = useState(false)
  const [month, setMonth] = useState(new Date().getMonth())
  const [year, setYear] = useState(new Date().getFullYear())
  const [refresh, setRefresh] = useState(0)
  const [toast, setToast] = useState('')
  const [showWelcome, setShowWelcome] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) loadProfile(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) loadProfile(session.user.id)
      else { setProfile(null); setLoading(false) }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function loadProfile(userId) {
    try {
      const p = await getProfile(userId)
      setProfile(p)
      const createdAt = new Date(p.created_at)
      const now = new Date()
      const diffMs = now - createdAt
      if (diffMs < 60000) setShowWelcome(true)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  function changeMonth(dir) {
    let m = month + dir, y = year
    if (m < 0)  { m = 11; y-- }
    if (m > 11) { m = 0;  y++ }
    setMonth(m); setYear(y)
  }

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 2600)
  }

  function doRefresh() { setRefresh(r => r + 1) }

  function addMonths(dateStr, n) {
    const d = new Date(dateStr + 'T00:00:00')
    const day = d.getDate()
    d.setDate(1)
    d.setMonth(d.getMonth() + n)
    const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
    d.setDate(Math.min(day, lastDay))
    return d.toISOString().split('T')[0]
  }

  async function handleSaveTx(tx) {
    const userId = session.user.id
    let ruleId = null

    if (tx.isRecurring) {
      const { data: rule, error: ruleErr } = await supabase
        .from('recurring_rules')
        .insert({
          user_id: userId,
          type: tx.type,
          amount: tx.amount,
          description: tx.description,
          category: tx.category,
          subcategory: tx.subcategory,
          day_of_month: tx.dayOfMonth,
          active: true,
          months_count: tx.months,
        })
        .select()
        .single()

      if (ruleErr) throw ruleErr
      ruleId = rule.id
    }

    const total = tx.isRecurring ? tx.months : 1
    const rows = []

    for (let i = 0; i < total; i++) {
      const occDate = i === 0 ? tx.date : addMonths(tx.date, i)
      const occStatus = i === 0 ? tx.status : 'projetado'
      rows.push({
        user_id: userId,
        type: tx.type,
        status: occStatus,
        amount: tx.amount,
        description: tx.description,
        date_projected: occDate,
        date_realized: occStatus === 'realizado' ? occDate : null,
        category: tx.category,
        subcategory: tx.subcategory,
        is_recurring: tx.isRecurring,
        recurring_rule_id: ruleId,
      })
    }

    const { error } = await supabase.from('transactions').insert(rows)
    if (error) throw error

    doRefresh()
    setShowAdd(false)
    showToast(rows.length > 1 ? `${rows.length} transações salvas ✓` : 'Transação salva ✓')
  }

  async function handleLogout() {
    await supabase.auth.signOut()
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-edge)' }}>
        <div style={{ color: 'var(--gold)', fontSize: 24, fontWeight: 300, letterSpacing: '-0.5px' }}>Kronava</div>
      </div>
    )
  }

  if (!session) return <Auth onAuth={() => {}} />

  const sharedProps = {
    userId: session.user.id,
    profile, month, year,
    changeMonth, refresh,
    onRefresh: doRefresh,
  }

  return (
    <div className="app">
      <div className={`screen ${screen === 'home' ? 'active' : ''}`}>
        <Dashboard {...sharedProps}
          onAddClick={() => setShowAdd(true)}
          onViewAll={() => setScreen('transactions')}
          onPrevMonth={() => changeMonth(-1)}
          onNextMonth={() => changeMonth(1)}
          onLogout={handleLogout} />
      </div>
      <div className={`screen ${screen === 'transactions' ? 'active' : ''}`}>
        <Transactions {...sharedProps} onAddClick={() => setShowAdd(true)} />
      </div>
      <div className={`screen ${screen === 'charts' ? 'active' : ''}`}>
        <Charts {...sharedProps} />
      </div>
      <div className={`screen ${screen === 'planning' ? 'active' : ''}`}>
        <Planning {...sharedProps} />
      </div>
      <div className={`screen ${screen === 'telegram' ? 'active' : ''}`}>
        <TelegramLink userId={session.user.id} />
      </div>

      <nav className="bottom-nav">
        {[
          { id: 'home',         icon: 'ti-home',      label: 'Início'     },
          { id: 'transactions', icon: 'ti-list',       label: 'Transações' },
          { id: 'charts',       icon: 'ti-chart-bar',  label: 'Análise'    },
          { id: 'planning',     icon: 'ti-target',     label: 'Planejar'   },
          { id: 'telegram',     icon: 'ti-brand-telegram', label: 'Telegram' },
        ].map(nav => (
          <button key={nav.id}
            className={`nav-item ${screen === nav.id ? 'active' : ''}`}
            onClick={() => setScreen(nav.id)}>
            <i className={`ti ${nav.icon}`} />
            <span>{nav.label}</span>
          </button>
        ))}
      </nav>

      <button className="fab" onClick={() => setShowAdd(true)}>+</button>

      {showAdd && (
        <AddModal
          onClose={() => setShowAdd(false)}
          onSave={handleSaveTx} />
      )}

      {showWelcome && (
        <div className="welcome-overlay">
          <div className="welcome-box">
            <div className="welcome-title">Sua mente livre.</div>
            <div className="welcome-text">
              O Kronava está configurando seu espaço. Para começar a experimentar
              a tranquilidade do controle automático, insira seu saldo atual
              clicando em "Definir saldo inicial".
            </div>
            <button className="welcome-btn" onClick={() => setShowWelcome(false)}>
              Entrar no Painel
            </button>
          </div>
        </div>
      )}

      <Toast message={toast} />
    </div>
  )
}
