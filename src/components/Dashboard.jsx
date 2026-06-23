import { useState, useEffect } from 'react'
import {
  getMonthTransactions, getAccumulatedBalance,
  calcRealized, fmt,
  CATS_EXP, CATS_INC, MONTHS_FULL, supabase
} from '../store/supabase.js'

const CAT_INITIALS = {
  food: 'A', home: 'M', transport: 'T', health: 'S',
  leisure: 'L', personal: 'P', travel: 'V', other: 'O',
  salary: 'S', bonus: 'B', invest: 'I', freelance: 'F'
}

function SaldoInicialModal({ current, onClose, onSave }) {
  const [value, setValue] = useState(current ? String(current) : '')
  const [loading, setLoading] = useState(false)

  async function handleSave() {
    const val = parseFloat(value)
    if (isNaN(val)) return
    setLoading(true)
    await onSave(val)
    setLoading(false)
    onClose()
  }

  return (
    <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">
          Saldo inicial
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <p style={{ fontSize: 13, color: 'var(--ivory-muted)', marginBottom: 20, lineHeight: 1.7, fontWeight: 300 }}>
          Informe quanto você tinha na conta antes de começar a usar o Kronava.
        </p>
        <div className="form-group">
          <label className="form-label">Valor (R$)</label>
          <input className="form-input" type="number" placeholder="0,00"
            step="0.01" inputMode="decimal"
            value={value} onChange={e => setValue(e.target.value)} />
        </div>
        <button className="submit-btn" onClick={handleSave} disabled={loading}>
          {loading ? 'Salvando...' : 'Salvar saldo inicial'}
        </button>
      </div>
    </div>
  )
}

function TxItem({ tx }) {
  const cats = tx.type === 'income' ? CATS_INC : CATS_EXP
  const cat = cats.find(c => c.id === tx.category) || { label: 'Outros' }
  const initial = CAT_INITIALS[tx.category] || cat.label[0].toUpperCase()
  const d = new Date(tx.date_projected + 'T12:00:00')
  const dateStr = `${d.getDate()}/${d.getMonth() + 1}`
  const isProjected = tx.status === 'projetado'

  return (
    <div className="tx-item">
      <div className="tx-icon">{initial}</div>
      <div className="tx-info">
        <div className="tx-desc">{tx.description || cat.label}</div>
        <div className="tx-cat">{cat.label}</div>
        <div className={`tx-status ${tx.status}`}>
          {isProjected ? 'Projetado' : 'Realizado'}
        </div>
      </div>
      <div className="tx-right">
        <div className={`tx-amount ${tx.type === 'income' ? 'pos' : 'neg'} ${isProjected ? 'projected' : ''}`}>
          {tx.type === 'income' ? '+' : '-'}{fmt(tx.amount)}
        </div>
        <div className="tx-date">{dateStr}</div>
      </div>
    </div>
  )
}

export default function Dashboard({ userId, profile, month, year, refresh, onAddClick, onViewAll }) {
  const [txs, setTxs] = useState([])
  const [accumulated, setAccumulated] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showSaldoModal, setShowSaldoModal] = useState(false)
  const [initialBalance, setInitialBalance] = useState(0)

  useEffect(() => {
    setInitialBalance(parseFloat(profile?.initial_balance || 0))
  }, [profile])

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const [data, acc] = await Promise.all([
          getMonthTransactions(userId, year, month),
          getAccumulatedBalance(userId, year, month)
        ])
        setTxs(data)
        setAccumulated(acc)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [userId, month, year, refresh])

  async function handleSaveInitialBalance(val) {
    await supabase.from('profiles').update({ initial_balance: val }).eq('id', userId)
    setInitialBalance(val)
  }

  const realized = calcRealized(txs)
  const totalBalance = initialBalance + accumulated + realized.balance
  const saving = realized.inc > 0 ? ((realized.inc - realized.exp) / realized.inc * 100) : 0

  const topExp = txs
    .filter(t => t.type === 'expense' && t.status === 'realizado')
    .sort((a, b) => b.amount - a.amount)[0]
  const topCat = topExp
    ? (CATS_EXP.find(c => c.id === topExp.category) || { label: 'Outros' })
    : null

  const pending = txs.filter(t => t.status === 'projetado')
  const recent = [...txs].slice(0, 5)

  return (
    <>
      <div className="header">
        <div>
          <div className="greeting">Olá, {profile?.name?.split(' ')[0] || 'Ricardo'}</div>
          <div className="page-title">{MONTHS_FULL[month]} {year}</div>
        </div>
        <button className="header-btn" onClick={onAddClick} aria-label="Adicionar transação">
          <i className="ti ti-plus" style={{ fontSize: 16 }} />
        </button>
      </div>

      <div className="balance-card">
        <div className="balance-label">Saldo acumulado</div>
        <div className="balance-value">
          {totalBalance < 0 ? '-' : ''}{fmt(totalBalance)}
        </div>
        <div className="balance-sub">
          <span className="balance-inc">↑ {fmt(realized.inc)}</span>
          <span className="balance-exp">↓ {fmt(realized.exp)}</span>
        </div>
        <div style={{ marginTop: 16, paddingTop: 14, borderTop: '0.5px solid rgba(191,167,111,0.1)' }}>
          <button onClick={() => setShowSaldoModal(true)} style={{
            background: 'none', border: 'none',
            color: 'var(--ivory-muted)', fontSize: 11,
            cursor: 'pointer', fontWeight: 300, letterSpacing: '0.3px'
          }}>
            {initialBalance > 0 ? `Saldo inicial · ${fmt(initialBalance)} · Editar` : '+ Definir saldo inicial'}
          </button>
        </div>
      </div>

      {pending.length > 0 && (
        <div className="proj-banner">
          <div className="proj-row">
            <span className="proj-label">A realizar este mês</span>
            <span className="proj-value" style={{ color: 'var(--amber)' }}>
              {pending.length} lançamento{pending.length > 1 ? 's' : ''}
            </span>
          </div>
          {pending.map(t => {
            const cats = t.type === 'income' ? CATS_INC : CATS_EXP
            const cat = cats.find(c => c.id === t.category) || { label: 'Outros' }
            return (
              <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--ivory-dim)', marginTop: 8, fontWeight: 300 }}>
                <span style={{ textTransform: 'capitalize' }}>{t.description || cat.label}</span>
                <span style={{ fontFamily: 'var(--font-mono)', color: t.type === 'income' ? 'var(--green)' : 'var(--red)' }}>
                  {t.type === 'income' ? '+' : '-'}{fmt(t.amount)}
                </span>
              </div>
            )
          })}
        </div>
      )}

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-label">Economia</div>
          <div className="stat-value">{fmt(Math.abs(realized.balance))}</div>
          <div className={`stat-badge ${saving >= 0 ? 'badge-up' : 'badge-down'}`}>
            {saving.toFixed(0)}% da renda
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Maior despesa</div>
          <div className="stat-value">{topExp ? fmt(topExp.amount) : '—'}</div>
          <div className="stat-badge badge-neutral">
            {topCat ? topCat.label : '—'}
          </div>
        </div>
      </div>

      <div className="section">
        <div className="section-header">
          <span className="section-title">Últimas transações</span>
          <button className="section-link" onClick={onViewAll}>Ver todas</button>
        </div>
        <div className="tx-list">
          {loading
            ? <div className="tx-empty">Carregando...</div>
            : recent.length === 0
              ? <div className="tx-empty">Nenhuma transação ainda.<br />Toque em + para adicionar.</div>
              : recent.map(t => <TxItem key={t.id} tx={t} />)
          }
        </div>
      </div>

      {showSaldoModal && (
        <SaldoInicialModal
          current={initialBalance}
          onClose={() => setShowSaldoModal(false)}
          onSave={handleSaveInitialBalance} />
      )}
    </>
  )
}