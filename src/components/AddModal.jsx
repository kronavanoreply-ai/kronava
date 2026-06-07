import { useState } from 'react'
import { CATS_EXP, CATS_INC } from '../store/supabase.js'

export default function AddModal({ onClose, onSave }) {
  const [type, setType] = useState('expense')
  const [status, setStatus] = useState('realizado')
  const [amount, setAmount] = useState('')
  const [desc, setDesc] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [cat, setCat] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const cats = type === 'expense' ? CATS_EXP : CATS_INC

  function handleTypeChange(t) {
    setType(t); setCat(''); setError('')
  }

  async function handleSave() {
    const val = parseFloat(amount)
    if (!amount || val <= 0) { setError('Informe um valor válido'); return }
    if (!date) { setError('Informe a data'); return }
    if (!cat) { setError('Selecione uma categoria'); return }

    setLoading(true)
    try {
      await onSave({
        type,
        status,
        amount: val,
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
          Nova transação
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="type-toggle">
          <button className={`type-btn ${type === 'expense' ? 'active-exp' : ''}`}
            onClick={() => handleTypeChange('expense')}>Despesa</button>
          <button className={`type-btn ${type === 'income' ? 'active-inc' : ''}`}
            onClick={() => handleTypeChange('income')}>Receita</button>
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
            value={amount} onChange={e => setAmount(e.target.value)} />
        </div>

        <div className="form-group">
          <label className="form-label">Descrição</label>
          <input className="form-input" type="text" placeholder="Ex: Supermercado"
            value={desc} onChange={e => setDesc(e.target.value)} />
        </div>

        <div className="form-group">
          <label className="form-label">
            {status === 'projetado' ? 'Data prevista' : 'Data'}
          </label>
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
          {loading ? 'Salvando...' : 'Salvar transação'}
        </button>
      </div>
    </div>
  )
}