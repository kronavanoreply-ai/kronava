import { useState, useEffect } from 'react'
import { getMonthTransactions, calcRealized, fmt, CATS_EXP, CATS_INC, MONTHS_FULL, supabase } from '../store/supabase.js'
import Confirm from './Confirm.jsx'

function EditModal({ tx, onClose, onSave }) {
  const [type, setType] = useState(tx.type)
  const [status, setStatus] = useState(tx.status)
  const [amount, setAmount] = useState(String(tx.amount))
  const [desc, setDesc] = useState(tx.description || '')
  const [date, setDate] = useState(tx.date_projected)
  const [cat, setCat] = useState(tx.category)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const cats = type === 'expense' ? CATS_EXP : CATS_INC

  async function handleSave() {
    const val = parseFloat(amount)
    if (!amount || val <= 0) { setError('Informe um valor válido'); return }
    if (!date) { setError('Informe a data'); return }
    if (!cat) { setError('Selecione uma categoria'); return }
    setLoading(true)
    try {
      await onSave(tx.id, {
        type, status, amount: val,
        description: desc.trim(),
        date_projected: date,
        date_realized: status === 'realizado' ? date : null,
        category: cat,
      })
    } catch (err) {
      setError(err.message || 'Erro ao salvar')
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">
          Editar transação
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="type-toggle">
          <button className={`type-btn ${type === 'expense' ? 'active-exp' : ''}`}
            onClick={() => { setType('expense'); setCat('') }}>Despesa</button>
          <button className={`type-btn ${type === 'income' ? 'active-inc' : ''}`}
            onClick={() => { setType('income'); setCat('') }}>Receita</button>
        </div>

        <div className="status-toggle">
          <button className={`status-btn ${status === 'projetado' ? 'active-proj' : ''}`}
            onClick={() => setStatus('projetado')}>⏳ Projetado</button>
          <button className={`status-btn ${status === 'realizado' ? 'active-real' : ''}`}
            onClick={() => setStatus('realizado')}>✅ Realizado</button>
        </div>

        <div className="form-group">
          <label className="form-label">Valor (R$)</label>
          <input className="form-input" type="number" placeholder="0,00"
            step="0.01" min="0.01" inputMode="decimal"
            value={amount}
            onChange={e => {
              const val = e.target.value
              if (val === '' || parseFloat(val) > 0) setAmount(val)
            }} />
        </div>

        <div className="form-group">
          <label className="form-label">Descrição</label>
          <input className="form-input" type="text" placeholder="Ex: Supermercado"
            value={desc} onChange={e => setDesc(e.target.value)} />
        </div>

        <div className="form-group">
          <label className="form-label">Data</label>
          <input className="form-input" type="date"
            value={date} onChange={e => setDate(e.target.value)} />
        </div>

        <div className="form-group">
          <label className="form-label">Categoria</label>
          <div className="cat-grid">
            {cats.map(c => (
              <button key={c.id}
                className={`cat-option ${cat === c.id ? 'selected' : ''}`}
                onClick={() => { setCat(c.id); setError('') }}>
                <span>{c.icon}</span>{c.label}
              </button>
            ))}
          </div>
        </div>

        {error && <div className="error-msg">{error}</div>}

        <button className="submit-btn" onClick={handleSave} disabled={loading}>
          {loading ? 'Salvando...' : 'Salvar alterações'}
        </button>
      </div>
    </div>
  )
}

function TxItem({ tx, onDelete, onConfirm, onEdit }) {
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
            ? <button onClick={() => onConfirm(tx)} style={{ background: 'none', border: 'none', color: 'var(--amber)', fontSize: 10, cursor: 'pointer', padding: 0 }}>
                ⏳ Projetado — toque para confirmar
              </button>
            : '✅ Realizado'}
        </div>
      </div>
      <div className="tx-right">
        <div className={`tx-amount ${tx.type === 'income' ? 'pos' : 'neg'} ${isProjected ? 'projected' : ''}`}>
          {tx.type === 'income' ? '+' : '-'}{fmt(tx.amount)}
        </div>
        <div className="tx-date">{dateStr}</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <button className="tx-delete" onClick={() => onEdit(tx)} aria-label="Editar">
          <i className="ti ti-pencil" />
        </button>
        <button className="tx-delete" onClick={() => onDelete(tx)} aria-label="Remover">
          <i className="ti ti-trash" />
        </button>
      </div>
    </div>
  )
}

export default function Transactions({ userId, month, year, changeMonth, refresh, onRefresh, onAddClick }) {
  const [txs, setTxs] = useState([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [confirm, setConfirm] = useState({ open: false, tx: null, mode: null })
  const [editTx, setEditTx] = useState(null)

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

  const realized = calcRealized(txs)
  const balance = realized.inc - realized.exp

  const filtered = filter === 'all' ? txs
    : filter === 'projetado' ? txs.filter(t => t.status === 'projetado')
    : filter === 'realizado' ? txs.filter(t => t.status === 'realizado')
    : txs.filter(t => t.type === filter)

  async function handleDelete() {
    try {
      await supabase.from('transactions').delete().eq('id', confirm.tx.id)
      onRefresh()
    } catch (err) { console.error(err) }
    setConfirm({ open: false, tx: null, mode: null })
  }

  async function handleConfirmProjected() {
    const today = new Date().toISOString().split('T')[0]
    try {
      await supabase.from('transactions').update({
        status: 'realizado', date_realized: today
      }).eq('id', confirm.tx.id)
      onRefresh()
    } catch (err) { console.error(err) }
    setConfirm({ open: false, tx: null, mode: null })
  }

  async function handleEdit(id, data) {
    const { error } = await supabase.from('transactions').update(data).eq('id', id)
    if (error) throw error
    onRefresh()
    setEditTx(null)
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
                  onConfirm={tx => setConfirm({ open: true, tx, mode: 'confirm' })}
                  onEdit={tx => setEditTx(tx)} />
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

      {editTx && (
        <EditModal
          tx={editTx}
          onClose={() => setEditTx(null)}
          onSave={handleEdit} />
      )}
    </>
  )
}