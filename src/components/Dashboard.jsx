import { useState, useEffect } from 'react'
import {
  getMonthTransactions, getAccumulatedBalance,
  calcRealized, fmt,
  MONTHS_FULL, supabase
} from '../store/supabase.js'
import ScoreFinanceiro from './ScoreFinanceiro.jsx'

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
          <button className="modal-close" onClick={onClose}>×</button>
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
  const label = tx.category || 'Outros'
  const initial = label.charAt(0).toUpperCase()
  const d = new Date(tx.date_projected + 'T12:00:00')
  const dateStr = `${d.getDate()}/${d.getMonth() + 1}`
  const isProjected = tx.status === 'projetado'

  return (
    <div className="tx-item">
      <div className="tx-icon">{initial}</div>
      <div className="tx-info">
        <div className="tx-desc">{tx.description || label}</div>
        <div className="tx-cat">{label}{tx.subcategory ? ` · ${tx.subcategory}` : ''}</div>
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

// Calcula receitas/despesas separando realizado de projetado
function calcSplit(txs) {
  let realInc = 0, realExp = 0, projInc = 0, projExp = 0
  for (const t of txs) {
    const val = parseFloat(t.amount) || 0
    if (t.status === 'realizado') {
      t.type === 'income' ? (realInc += val) : (realExp += val)
    } else {
      t.type === 'income' ? (projInc += val) : (projExp += val)
    }
  }
  return {
    realInc, realExp,
    realBalance: realInc - realExp,
    projInc: realInc + projInc,
    projExp: realExp + projExp,
    projBalance: (realInc + projInc) - (realExp + projExp)
  }
}

function pad2(n) { return String(n).padStart(2, '0') }

function lastDayOfMonth(year, month) {
  const d = new Date(year, month + 1, 0)
  return d.getDate()
}

function toISODate(year, month, day) {
  return `${year}-${pad2(month + 1)}-${pad2(day)}`
}

export default function Dashboard({
  userId, profile, month, year, refresh,
  onAddClick, onViewAll, onPrevMonth, onNextMonth, onLogout
}) {
  const [txs, setTxs] = useState([])
  const [accumulated, setAccumulated] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showSaldoModal, setShowSaldoModal] = useState(false)
  const [initialBalance, setInitialBalance] = useState(0)
  const [showProjected, setShowProjected] = useState(false)
  const [projDate, setProjDate] = useState(() => toISODate(year, month, lastDayOfMonth(year, month)))

  useEffect(() => {
    setInitialBalance(parseFloat(profile?.initial_balance || 0))
  }, [profile])

  // Reseta a data projetada para o último dia sempre que trocar de mês
  useEffect(() => {
    setProjDate(toISODate(year, month, lastDayOfMonth(year, month)))
  }, [month, year])

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

  const splitAll = calcSplit(txs)
  const txsUntilProjDate = txs.filter(t => t.date_projected <= projDate)
  const splitProj = calcSplit(txsUntilProjDate)
  const realized = calcRealized(txs)

  // Saldo realizado: saldo inicial + acumulado meses anteriores + só realizados do mês
  const saldoRealizado = initialBalance + accumulated + splitAll.realBalance

  // Saldo projetado até a data escolhida: saldo inicial + acumulado + (realizados+projetados até projDate)
  const saldoProjetado = initialBalance + accumulated + splitProj.projBalance

  // Saldo projetado ao fim do mês (independente do seletor) — usado no Score Financeiro
  const saldoProjetadoFimMes = initialBalance + accumulated + splitAll.projBalance

  const activeBalance = showProjected ? saldoProjetado : saldoRealizado
  const activeInc = showProjected ? splitProj.projInc : splitAll.realInc
  const activeExp = showProjected ? splitProj.projExp : splitAll.realExp

  const saving = splitAll.realInc > 0
    ? ((splitAll.realInc - splitAll.realExp) / splitAll.realInc * 100)
    : 0

  const topExp = txs
    .filter(t => t.type === 'expense' && t.status === 'realizado')
    .sort((a, b) => b.amount - a.amount)[0]
  const topCatLabel = topExp ? (topExp.category || 'Outros') : null

  const pending = txs.filter(t => t.status === 'projetado')
  const recent = [...txs].slice(0, 5)

  const minDate = toISODate(year, month, 1)
  const maxDate = toISODate(year, month, lastDayOfMonth(year, month))

  const projDateObj = new Date(projDate + 'T12:00:00')
  const projDateLabel = `${projDateObj.getDate()}/${projDateObj.getMonth() + 1}`

  return (
    <>
      <div className="header" style={{ alignItems: 'flex-start' }}>
        <div>
          <div className="greeting">Olá, {profile?.name?.split(' ')[0] || 'Ricardo'}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 2 }}>
            <button onClick={onPrevMonth} aria-label="Mês anterior" style={{
              background: 'none', border: 'none', color: 'var(--gold)',
              fontSize: 18, cursor: 'pointer', padding: '0 4px', lineHeight: 1
            }}>‹</button>
            <div className="page-title">{MONTHS_FULL[month]} {year}</div>
            <button onClick={onNextMonth} aria-label="Próximo mês" style={{
              background: 'none', border: 'none', color: 'var(--gold)',
              fontSize: 18, cursor: 'pointer', padding: '0 4px', lineHeight: 1
            }}>›</button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="header-btn" onClick={onAddClick} aria-label="Adicionar transação">
            <i className="ti ti-plus" style={{ fontSize: 16 }} />
          </button>
          <button className="header-btn" onClick={onLogout} aria-label="Sair da conta" title="Sair">
            <i className="ti ti-logout" style={{ fontSize: 16 }} />
          </button>
        </div>
      </div>

      <div className="balance-card">
        {/* Toggle realizado / projetado */}
        <div style={{
          display: 'flex', gap: 4, marginBottom: 14,
          background: 'rgba(255,255,255,0.04)', borderRadius: 8,
          padding: 3, width: 'fit-content'
        }}>
          {['Realizado', 'Projetado'].map((label, i) => {
            const active = showProjected === !!i
            return (
              <button key={label} onClick={() => setShowProjected(!!i)} style={{
                background: active ? 'rgba(191,167,111,0.15)' : 'none',
                border: active ? '0.5px solid rgba(191,167,111,0.35)' : '0.5px solid transparent',
                borderRadius: 6, color: active ? 'var(--gold)' : 'var(--ivory-muted)',
                fontSize: 11, fontWeight: active ? 500 : 300,
                padding: '4px 12px', cursor: 'pointer', letterSpacing: '0.4px',
                transition: 'all 0.2s'
              }}>
                {label}
              </button>
            )
          })}
        </div>

        <div className="balance-label">
          Saldo {showProjected ? `projetado até ${projDateLabel}` : 'realizado'}
        </div>
        <div className="balance-value">
          {activeBalance < 0 ? '-' : ''}{fmt(Math.abs(activeBalance))}
        </div>
        <div className="balance-sub">
          <span className="balance-inc">↑ {fmt(activeInc)}</span>
          <span className="balance-exp">↓ {fmt(activeExp)}</span>
        </div>

        {/* Seletor de data no modo projetado */}
        {showProjected && (
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: 11, color: 'var(--ivory-muted)', fontWeight: 300, letterSpacing: '0.3px' }}>
              Projetar até
            </label>
            <input
              type="date"
              value={projDate}
              min={minDate}
              max={maxDate}
              onChange={e => setProjDate(e.target.value)}
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '0.5px solid rgba(191,167,111,0.25)',
                borderRadius: 6, color: 'var(--ivory)',
                fontSize: 12, padding: '4px 8px',
                fontFamily: 'var(--font-mono)', colorScheme: 'dark'
              }}
            />
          </div>
        )}

        {/* Indicador de diferença entre projetado e realizado */}
        {!showProjected && pending.length > 0 && (
          <div style={{
            marginTop: 10, fontSize: 11, color: 'var(--ivory-muted)',
            fontWeight: 300, letterSpacing: '0.3px'
          }}>
            Projetado ao fim do mês:{' '}
            <span style={{
              color: saldoProjetadoFimMes >= saldoRealizado ? 'var(--green)' : 'var(--red)',
              fontFamily: 'var(--font-mono)'
            }}>
              {saldoProjetadoFimMes < 0 ? '-' : ''}{fmt(Math.abs(saldoProjetadoFimMes))}
            </span>
          </div>
        )}

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

      <ScoreFinanceiro
        saldoRealizado={saldoRealizado}
        saldoProjetado={saldoProjetadoFimMes}
      />

      {pending.length > 0 && (
        <div className="proj-banner">
          <div className="proj-row">
            <span className="proj-label">A realizar este mês</span>
            <span className="proj-value" style={{ color: 'var(--amber)' }}>
              {pending.length} lançamento{pending.length > 1 ? 's' : ''}
            </span>
          </div>
          {pending.map(t => {
            const label = t.category || 'Outros'
            return (
              <div key={t.id} style={{
                display: 'flex', justifyContent: 'space-between',
                fontSize: 12, color: 'var(--ivory-dim)', marginTop: 8, fontWeight: 300
              }}>
                <span style={{ textTransform: 'capitalize' }}>{t.description || label}</span>
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  color: t.type === 'income' ? 'var(--green)' : 'var(--red)'
                }}>
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
          <div className="stat-value">{fmt(Math.abs(splitAll.realBalance))}</div>
          <div className={`stat-badge ${saving >= 0 ? 'badge-up' : 'badge-down'}`}>
            {saving.toFixed(0)}% da renda
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Maior despesa</div>
          <div className="stat-value">{topExp ? fmt(topExp.amount) : '—'}</div>
          <div className="stat-badge badge-neutral">
            {topCatLabel || '—'}
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

