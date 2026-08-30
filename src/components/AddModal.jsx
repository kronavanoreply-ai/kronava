import { useState, useEffect } from 'react'
import { CATEGORIES, getCategories, getSubcategories } from '../data/categories.js'
import { getAccounts } from '../store/supabase.js'

export default function AddModal({ userId, onClose, onSave }) {
  const [type, setType] = useState('expense')
  const [status, setStatus] = useState('realizado')
  const [amount, setAmount] = useState('')
  const [desc, setDesc] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [category, setCategory] = useState('')
  const [subcategory, setSubcategory] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isRecurring, setIsRecurring] = useState(false)
  const [months, setMonths] = useState(12)
  const [accounts, setAccounts] = useState([])
  const [accountId, setAccountId] = useState('')

  const categories = getCategories(type)
  const subcategories = category ? getSubcategories(type, category) : []

  useEffect(() => {
    if (!userId) return
    getAccounts(userId).then(accs => {
      setAccounts(accs)
      if (accs.length > 0) setAccountId(accs[0].id)
    })
  }, [userId])

  function handleTypeChange(t) {
    setType(t); setCategory(''); setSubcategory(''); setError('')
  }

  function handleCategoryChange(c) {
    setCategory(c); setSubcategory(''); setError('')
  }

  async function handleSave() {
    const val = parseFloat(amount)
    if (!amount || val <= 0) { setError('Informe um valor válido'); return }
    if (!date) { setError('Informe a data'); return }
    if (!category) { setError('Selecione uma categoria'); return }
    if (!subcategory) { setError('Selecione uma subcategoria'); return }
    if (isRecurring && (!months || months < 2 || months > 60)) {
      setError('Informe entre 2 e 60 meses'); return
    }

    setLoading(true)
    try {
      const dayOfMonth = new Date(date + 'T00:00:00').getDate()

      await onSave({
        type,
        status,
        amount: val,
        description: desc.trim(),
        date,
        category,
        subcategory,
        isRecurring,
        months: isRecurring ? months : 1,
        dayOfMonth,
        accountId: accountId || null,
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
            onClick={() => setStatus('projetado')}>Projetado</button>
          <button className={`status-btn ${status === 'realizado' ? 'active-real' : ''}`}
            onClick={() => setStatus('realizado')}>Realizado</button>
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
          <label className="form-label">
            {status === 'projetado' ? 'Data prevista' : 'Data'}
          </label>
          <input className="form-input" type="date"
            value={date} onChange={e => setDate(e.target.value)} />
        </div>

        {accounts.length > 0 && (
          <div className="form-group">
            <label className="form-label">Conta</label>
            <select className="form-input" value={accountId}
              onChange={e => setAccountId(e.target.value)}>
              {accounts.map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Categoria</label>
          <div className="cat-grid">
            {categories.map(c => (
              <button key={c}
                className={`cat-option ${category === c ? 'selected' : ''}`}
                onClick={() => handleCategoryChange(c)}>
                {c}
              </button>
            ))}
          </div>
        </div>

        {category && (
          <div className="form-group">
            <label className="form-label">Subcategoria</label>
            <div className="cat-grid">
              {subcategories.map(s => (
                <button key={s}
                  className={`cat-option ${subcategory === s ? 'selected' : ''}`}
                  onClick={() => { setSubcategory(s); setError('') }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="form-group">
          <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input type="checkbox" checked={isRecurring}
              onChange={e => setIsRecurring(e.target.checked)} />
            Transação recorrente (mensal)
          </label>
        </div>

        {isRecurring && (
          <div className="form-group">
            <label className="form-label">Repetir por quantos meses</label>
            <input className="form-input" type="number" min="2" max="60"
              value={months}
              onChange={e => setMonths(parseInt(e.target.value) || 0)} />
          </div>
        )}

        {error && <div className="error-msg">{error}</div>}

        <button className="submit-btn" onClick={handleSave} disabled={loading}>
          {loading ? 'Salvando...' : 'Salvar transação'}
        </button>
      </div>
    </div>
  )
}
