import { useState, useEffect } from 'react'
import { supabase } from './store/supabase.js'
import { getProfile } from './store/auth.js'
import Auth from './components/Auth.jsx'
import Dashboard from './components/Dashboard.jsx'
import Transactions from './components/Transactions.jsx'
import Charts from './components/Charts.jsx'
import Planning from './components/Planning.jsx'
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

  function doRefresh() {
    setRefresh(r => r + 1)
  }

  async function handleSaveTx(tx) {
    const { error } = await supabase.from('transactions').insert({
      ...tx,
      user_id: session.user.id
    })
    if (error) throw error
    doRefresh()
    setShowAdd(false)
    showToast('Transação salva ✓')
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <div style={{ color: 'var(--purple2)', fontSize: 24, fontWeight: 700 }}>Kronava</div>
      </div>
    )
  }

  if (!session) {
    return <Auth onAuth={() => {}} />
  }

  const sharedProps = {
    userId: session.user.id,
    profile,
    month, year,
    changeMonth,
    refresh,
    onRefresh: doRefresh,
  }

  return (
    <div className="app">
      <div className={`screen ${screen === 'home' ? 'active' : ''}`}>
        <Dashboard {...sharedProps}
          onAddClick={() => setShowAdd(true)}
          onViewAll={() => setScreen('transactions')} />
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

      <nav className="bottom-nav">
        {[
          { id: 'home',         icon: 'ti-home',     label: 'Início'     },
          { id: 'transactions', icon: 'ti-list',      label: 'Transações' },
          { id: 'charts',       icon: 'ti-chart-bar', label: 'Análise'    },
          { id: 'planning',     icon: 'ti-target',    label: 'Planejar'   },
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

      <Toast message={toast} />
    </div>
  )
}