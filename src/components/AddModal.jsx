import { useState, useEffect } from 'react'
import { CATEGORIES, getCategories, getSubcategories } from '../data/categories.js'
import { getAccounts, getCards, getCustomCategories, addCustomCategory } from '../store/supabase.js'

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
  const [paymentMethod, setPaymentMethod] = useState('conta') // 'conta' | 'cartao'
  const [cards, setCards] = useState([])
  const [cardId, setCardId] = useState('')
  const [installments, setInstallments] = useState(1)

  const [customCats, setCustomCats] = useState([])

  const [showNewCat, setShowNewCat] = useState(false)
  const [newCatName, setNewCatName] = useState('')

  const [showNewSubcat, setShowNewSubcat] = useState(false)
  const [newSubcatName, setNewSubcatName] = useState('')

  const baseCategories = getCategories(type)
  const customCatNames = customCats
    .filter(c => c.type === type && !c.subcategory)
    .map(c => c.category)
  const categories = [...new Set([...baseCategories, ...customCatNames])]

  const baseSubcategories = category ? getSubcategories(type, category) : []
  const customSubcatNames = customCats
    .filter(c => c.type === type && c.category === category && c.subcategory)
    .map(c => c.subcategory)
  const subcategories = [...new Set([...baseSubcategories, ...customSubcatNames])]

  useEffect(() => {
    if (!userId) return
    getAccounts(userId).then(accs => {
      setAccounts(accs)
      if (accs.length > 0) setAccountId(accs[0].id)
    })
    getCards(userId).then(cds => {
      setCards(cds)
      if (cds.length > 0) setCardId(cds[0].id)
    })
    getCustomCategories(userId).then(setCustomCats).catch(() => {})
  }, [userId])

  function handleTypeChange(t) {
    setType(t); setCategory(''); setSubcategory(''); setError('')
    setShowNewCat(false); setShowNewSubcat(false)
    if (t === 'income') setPaymentMethod('conta')
  }

  function handleCategoryChange(c) {
    setCategory(c); setSubcategory(''); setError('')
    setShowNewSubcat(false)
  }

  function handlePaymentMethodChange(m) {
    setPaymentMethod(m)
    if (m === 'cartao') setIsRecurring(false)
  }

  async function handleAddCategory() {
    const name = newCatName.trim()
    if (!name) return
    try {
      await addCustomCategory(userId, { type, category: name, subcategory: null })
      const updated = await getCustomCategories(userId)
      setCustomCats(updated)
      setCategory(name)
      setSubcategory('')
      setNewCatName('')
      setShowNewCat(false)
      setError('')
    } catch (err) {
      setError(err.message || 'Erro ao criar categoria')
    }
  }

  async function handleAddSubcategory() {
    const name = newSubcatName.trim()
    if (!name || !category) return
    try {
      await addCustomCategory(userId, { type, category, subcategory: name })
      const updated = await getCustomCategories(userId)
      setCustomCats(updated)
      setSubcategory(name)
      setNewSubcatName('')
      setShowNewSubcat(false)
      setError('')
    } catch (err) {
      setError(err.message || 'Erro ao criar subcategoria')
    }
  }

  async function handleSave() {
    const val = parseFloat(amount)
    if (!amount || val <= 0) { setError('Informe um valor válido'); return }
    if (!date) { setError('Informe a data'); return }
    if (!category) { setError('Selecione uma categoria'); return }
    if (isRecurring && (!months || months < 2 || months > 60)) {
      setError('Informe entre 2 e 60 meses'); return
    }
    if (paymentMethod === 'cartao') {
      if (!cardId) { setError('Selecione um cartão'); return }
      if (!installments || installments < 1 || installments > 24) {
        setError('Informe entre 1 e 24 parcelas'); return
      }
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
        subcategory: subcategory || null,
        isRecurring,
        months: isRecurring ? months : 1,
        dayOfMonth,
        accountId: paymentMethod === 'conta' ? (accountId || null) : null,
        cardId: paymentMethod === 'cartao' ? cardId : null,
        installments: paymentMethod === 'cartao' ? installments : 1,
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

        {type === 'expense' && (
          <div className="status-toggle">
            <button className={`status-btn ${paymentMethod === 'conta' ? 'active-real' : ''}`}
              onClick={() => handlePaymentMethodChange('conta')}>Dinheiro / Débito</button>
            <button className={`status-btn ${paymentMethod === 'cartao' ? 'active-proj' : ''}`}
              onClick={() => handlePaymentMethodChange('cartao')}>Cartão de crédito</button>
          </div>
        )}

        {paymentMethod === 'conta' && (
          <div className="status-toggle">
            <button className={`status-btn ${status === 'projetado' ? 'active-proj' : ''}`}
              onClick={() => setStatus('projetado')}>Projetado</button>
            <button className={`status-btn ${status === 'realizado' ? 'active-real' : ''}`}
              onClick={() => setStatus('realizado')}>Realizado</button>
          </div>
        )}

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
            {paymentMethod === 'cartao' ? 'Data da compra' : (status === 'projetado' ? 'Data prevista' : 'Data')}
          </label>
          <input className="form-input" type="date"
            value={date} onChange={e => setDate(e.target.value)} />
        </div>

        {paymentMethod === 'conta' && accounts.length > 0 && (
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

        {paymentMethod === 'cartao' && (
          <>
            {cards.length === 0 ? (
              <div className="form-group">
                <div className="error-msg">Você ainda não tem cartões cadastrados. Cadastre um na aba Cartões antes de continuar.</div>
              </div>
            ) : (
              <>
                <div className="form-group">
                  <label className="form-label">Cartão</label>
                  <select className="form-input" value={cardId}
                    onChange={e => setCardId(e.target.value)}>
                    {cards.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Parcelas</label>
                  <input className="form-input" type="number" min="1" max="24"
                    value={installments}
                    onChange={e => setInstallments(parseInt(e.target.value) || 1)} />
                </div>
              </>
            )}
          </>
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
            <button className="cat-option" onClick={() => setShowNewCat(!showNewCat)}>
              + Nova categoria
            </button>
          </div>

          {showNewCat && (
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <input className="form-input" type="text" placeholder="Nome da categoria"
                value={newCatName} onChange={e => setNewCatName(e.target.value)} />
              <button className="submit-btn" style={{ width: 'auto', padding: '0 16px' }}
                onClick={handleAddCategory}>Criar</button>
            </div>
          )}
        </div>

        {category && (
          <div className="form-group">
            <label className="form-label">Subcategoria (opcional)</label>
            <div className="cat-grid">
              {subcategories.map(s => (
                <button key={s}
                  className={`cat-option ${subcategory === s ? 'selected' : ''}`}
                  onClick={() => { setSubcategory(s); setError('') }}>
                  {s}
                </button>
              ))}
              <button className="cat-option" onClick={() => setShowNewSubcat(!showNewSubcat)}>
                + Nova subcategoria
              </button>
            </div>

            {showNewSubcat && (
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <input className="form-input" type="text" placeholder="Nome da subcategoria"
                  value={newSubcatName} onChange={e => setNewSubcatName(e.target.value)} />
                <button className="submit-btn" style={{ width: 'auto', padding: '0 16px' }}
                  onClick={handleAddSubcategory}>Criar</button>
              </div>
            )}
          </div>
        )}

        {paymentMethod === 'conta' && (
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input type="checkbox" checked={isRecurring}
                onChange={e => setIsRecurring(e.target.checked)} />
              Transação recorrente (mensal)
            </label>
          </div>
        )}

        {isRecurring && paymentMethod === 'conta' && (
          <div className="form-group">
            <label className="form-label">Repetir por quantos meses</label>
            <input className="form-input" type="number" min="2" max="60"
              value={months}
              onChange={e => setMonths(parseInt(e.target.value) || 0)} />
          </div>
        )}

        {error && <div className="error-msg">{error}</div>}

        <button className="submit-btn" onClick={handleSave} disabled={loading || (paymentMethod === 'cartao' && cards.length === 0)}>
          {loading ? 'Salvando...' : 'Salvar transação'}
        </button>
      </div>
    </div>
  )
}
