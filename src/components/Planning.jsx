import { useState, useEffect } from 'react'
import { getMonthTransactions, getMonthBudgets, saveMonthBudgets, calcRealized, fmt, CATS_EXP, MONTHS_FULL } from '../store/supabase.js'

function BudgetModal({ userId, month, year, onClose, onSave }) {
  const [values, setValues] = useState({})

  useEffect(() => {
    getMonthBudgets(userId, year, month).then(b => {
      const init = {}
      CATS_EXP.forEach(c => { init[c.id] = b[c.id] ? String(b[c.id]) : '' })
      setValues(init)
    })
  }, [userId, month, year])

  async function handleSave() {
    const map = {}
    Object.entries(values).forEach(([k, v]) => {
      const n = parseFloat(v)
      if (n > 0) map[k] = n
    })
    await saveMonthBudgets(userId, year, month, map)
    onSave()
  }

  return (
    <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">
          Orçamentos — {MONTHS_FULL[month]}
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 16 }}>
          Deixe em branco para sem limite.
        </p>
        {CATS_EXP.map(cat => (
          <div key={cat.id} className="form-group">
            <label className="form-label">{cat.icon} {cat.label} (R$)</label>
            <input className="form-input" type="number" placeholder="Sem limite"
              value={values[cat.id] || ''} step="0.01" min="0" inputMode="decimal"
              onChange={e => setValues(v => ({ ...v, [cat.id]: e.target.value }))} />
          </div>
        ))}
        <button className="submit-btn" onClick={handleSave}>Salvar orçamentos</button>
      </div>
    </div>
  )
}

export default function Planning({ userId, month, year, changeMonth, refresh, onRefresh }) {
  const [catTotals, setCatTotals] = useState({})
  const [budgets, setBudgets] = useState({})
  const [showBudget, setShowBudget] = useState(false)
  const [projTotals, setProjTotals] = useState({})

  useEffect(() => {
    async function load() {
      const [txs, b] = await Promise.all([
        getMonthTransactions(userId, year, month),
        getMonthBudgets(userId, year, month)
      ])
      const realized = {}, projected = {}
      txs.filter(t => t.type === 'expense').forEach(t => {
        if (t.status === 'realizado') realized[t.category] = (realized[t.category] || 0) + parseFloat(t.amount)
        else projected[t.category] = (projected[t.category] || 0) + parseFloat(t.amount)
      })
      setCatTotals(realized)
      setProjTotals(projected)
      setBudgets(b)
    }
    load()
  }, [userId, month, year, refresh])

  const totalBudgeted = Object.values(budgets).reduce((a, b) => a + b, 0)
  const totalSpent = Object.values(catTotals).reduce((a, b) => a + b, 0)
  const overallPct = totalBudgeted > 0 ? Math.min(Math.round(totalSpent / totalBudgeted * 100), 100) : 0
  const overallColor = overallPct >= 90 ? 'var(--red)' : overallPct >= 60 ? 'var(--amber)' : 'var(--green)'

  return (
    <>
      <div className="header">
        <div className="page-title">Planejamento</div>
        <button className="header-btn" onClick={() => setShowBudget(true)}>
          <i className="ti ti-edit" />
        </button>
      </div>

      <div className="month-nav">
        <button className="month-nav-btn" onClick={() => changeMonth(-1)}>‹</button>
        <div className="month-nav-label">{MONTHS_FULL[month]} {year}</div>
        <button className="month-nav-btn" onClick={() => changeMonth(1)}>›</button>
      </div>

      {totalBudgeted > 0 && (
        <div className="section">
          <div className="chart-wrap">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--text2)', fontWeight: 500 }}>Orçamento total</span>
              <span style={{ fontSize: 13, color: overallColor, fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                {overallPct}% usado
              </span>
            </div>
            <div className="plan-progress-bg">
              <div className="plan-progress-fill" style={{ width: `${overallPct}%`, background: overallColor }} />
            </div>
            <div className="plan-amounts" style={{ marginTop: 6 }}>
              <span className="used" style={{ color: overallColor }}>{fmt(totalSpent)} realizado</span>
              <span>{fmt(Math.max(totalBudgeted - totalSpent, 0))} restante</span>
            </div>
          </div>
        </div>
      )}

      <div className="section" style={{ marginBottom: 8 }}>
        <div className="section-header">
          <span className="section-title">Por categoria</span>
          <button className="section-link" onClick={() => setShowBudget(true)}>Editar limites</button>
        </div>

        {CATS_EXP.map(cat => {
          const limit = budgets[cat.id] || 0
          const used = catTotals[cat.id] || 0
          const proj = projTotals[cat.id] || 0
          const pct = limit > 0 ? Math.min(Math.round(used / limit * 100), 100) : 0
          const color = pct >= 90 ? 'var(--red)' : pct >= 60 ? 'var(--amber)' : cat.color

          return (
            <div key={cat.id} className="plan-card">
              <div className="plan-cat-row">
                <span className="plan-cat-icon">{cat.icon}</span>
                <span className="plan-cat-label">{cat.label}</span>
                {limit > 0
                  ? <span className="plan-limit">{fmt(limit)}</span>
                  : <span className="plan-limit" style={{ color: 'var(--text3)' }}>sem limite</span>
                }
              </div>
              {limit > 0 ? (
                <>
                  <div className="plan-progress-bg">
                    <div className="plan-progress-fill" style={{ width: `${pct}%`, background: color }} />
                  </div>
                  <div className="plan-amounts">
                    <span className="used" style={{ color }}>{fmt(used)} realizado</span>
                    <span>{fmt(Math.max(limit - used, 0))} restante</span>
                  </div>
                  {proj > 0 && (
                    <div style={{ fontSize: 10, color: 'var(--amber)', marginTop: 4 }}>
                      ⏳ {fmt(proj)} projetado pendente
                    </div>
                  )}
                </>
              ) : (
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                  {used > 0 ? `${fmt(used)} realizado` : 'Nenhum gasto registrado'}
                  {proj > 0 && ` · ⏳ ${fmt(proj)} projetado`}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {showBudget && (
        <BudgetModal
          userId={userId} month={month} year={year}
          onClose={() => setShowBudget(false)}
          onSave={() => { setShowBudget(false); onRefresh() }}
        />
      )}
    </>
  )
}