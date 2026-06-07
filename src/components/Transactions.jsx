import { useState, useEffect } from 'react'
import { getMonthTransactions, calcTotals, calcRealized, fmt, CATS_EXP, CATS_INC, MONTHS_FULL, supabase } from '../store/supabase.js'
import Confirm from './Confirm.jsx'

function TxItem({ tx, onDelete, onConfirm }) {
  const cats = tx.type === 'income' ? CATS_INC : CATS_EXP
  const cat = cats.find(c => c.id === tx.category) || { icon: '📦', label: 'Outros', color: '#9ca3af' }
  const d = new Date(tx.date_projected + 'T12:00:00')
  const dateStr = `${d.getDate()}/${d.getMonth() + 1}`
  const isProjected = tx.status === 'projetado'

  return (
    <div className="tx-item">
      <div className="tx-icon" style={{ background: cat.color + '22' }}>{cat.icon}</div>
      <div className="tx-info">
        <div className="tx-desc">{tx.description || '—'}</div>
        <div className="tx-cat">{cat.label}</div>
        <div className={`tx-status ${tx.status}`}>
          {isProjected
            ? <button onClick={() => onConfirm(tx)} style={{ background: 'none', border: 'none', color: 'var(--amber)', fontSize: 10, cursor: 'pointer', padding: 0 }}>⏳ Projetado — toque para confirmar</button>
            : '✅ Realizado'}
        </div>
      </div>
      <div className="tx-right">
        <div className={`tx-amount ${tx.type === 'income' ? 'pos' : 'neg'} ${isProjected ? 'projected' : ''}`}>
          {tx.type === 'income' ? '+' : '-'}{fmt(tx.amount)}
        </div>
        <div className="tx-date">{dateStr}</div>
      </div>
      <button className="tx-delete" onClick={() => onDelete(tx)} aria-label="Remover">
        <i className="ti ti-trash" />
      </button>
    </div>
  )
}

export default function Transactions({ userId, month, year, changeMonth, refresh, onRefresh, onAddClick }) {
  const [txs, setTxs] = useState([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [confirm, setConfirm] = useState({ open: false, tx: null, mode: null })

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const data = await getMonthTransactions(userId, year, month)
        setTxs(data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [userId, month, year, refresh])

  const { inc, exp } = calcTotals(txs)
  const realized = calcRealized(txs)
  const balance = realized.inc - realized.exp

  const filtered = filter === 'all' ? txs
    : filter === 'projetado' ? txs.filter(t => t.status === 'projetado')
    : filter === 'realizado' ? txs.filter(t => t.status === 'realizado')
    : txs.filter(t => t.type === filter)

  async function handleDelete() {
    const tx = confirm.tx
    try {
      await supabase.from('transactions').delete().eq('id', tx.id)
      onRefresh()
    } catch (err) {
      console.error(err)
    }
    setConfirm({ open: false, tx: null, mode: null })
  }

  async function handleConfirmProjected() {
    const tx = confirm.tx
    const today = new Date().toISOString().split('T')[0]
    try {
      await supabase.from('transactions').update({
        status: 'realizado',
        date_realized: today
      }).eq('id', tx.id)
      onRefresh()
    } catch (err) {
      console.error(err)
    }
    setConfirm({ open: false, tx: null, mode: null })
  }

  return (
    <>
      <div className="header">
        <div className="page-title">Transações</div>
        <button className="header-btn" onClick={onAddClick}>
          <i className="ti ti-plus" />
        </button>
      </div>

      <div className="month-nav">
        <button className="month-nav-btn" onClick={() => changeMonth(-1)}>‹</button>
        <div className="month-nav-label">{MONTHS_FULL[month]} {year}</div>
        <button className="month-nav-btn" onClick={() => changeMonth(1)}>›</button>
      </div>

      <div className="section">
        <div className="summary-cards">
          <div className="summary-card">
            <div className="summary-card-label">Receitas</div>
            <div className="summary-card-value" style={{ color: 'var(--green)' }}>{fmt(realized.inc)}</div>
          </div>
          <div className="summary-card">
            <div className="summary-card-label">Despesas</div>
            <div className="summary-card-value" style={{ color: 'var(--red)' }}>{fmt(realized.exp)}</div>
          </div>
          <div className="summary-card">
            <div className="summary-card-label">Saldo</div>
            <div className="summary-card-value" style={{ color: balance >= 0 ? 'var(--green)' : 'var(--red)' }}>{fmt(balance)}</div>
          </div>
        </div>
      </div>

      <div className="section">
        <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
          {[['all','Todas'],['expense','Despesas'],['income','Receitas'],['projetado','Projetadas'],['realizado','Realizadas']].map(([v, l]) => (
            <button key={v} onClick={() => setFilter(v)} style={{
              padding: '5px 12px', borderRadius: 30, border: '1px solid',
              borderColor: filter === v ? 'var(--purple)' : 'var(--border)',
              background: filter === v ? 'rgba(124,111,247,0.15)' : 'var(--bg2)',
              color: filter === v ? 'var(--purple3)' : 'var(--text3)',
              fontSize: 11, fontWeight: 500
            }}>{l}</button>
          ))}
        </div>

        <div className="tx-list">
          {loading
            ? <div className="tx-empty">Carregando...</div>
            : filtered.length === 0
              ? <div className="tx-empty">Nenhuma transação encontrada.</div>
              : filtered.map(t => (
                <TxItem key={t.id} tx={t}
                  onDelete={tx => setConfirm({ open: true, tx, mode: 'delete' })}
                  onConfirm={tx => setConfirm({ open: true, tx, mode: 'confirm' })} />
              ))
          }
        </div>
      </div>

      <Confirm
        open={confirm.open}
        title={confirm.mode === 'delete' ? 'Remover transação' : 'Confirmar lançamento'}
        message={confirm.mode === 'delete'
          ? 'Esta ação não pode ser desfeita.'
          : `Confirmar "${confirm.tx?.description || 'este lançamento'}" como realizado?`}
        onConfirm={confirm.mode === 'delete' ? handleDelete : handleConfirmProjected}
        onCancel={() => setConfirm({ open: false, tx: null, mode: null })}
      />
    </>
  )
}