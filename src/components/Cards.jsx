import { useState, useEffect } from 'react'
import {
  getCardsWithAvailableLimit, createCard, updateCard, deleteCard,
  getCardInvoices, getInvoiceTransactions, payInvoice,
  getAccounts, fmt
} from '../store/supabase.js'

function CardModal({ userId, card, onClose, onSave }) {
  const [name, setName] = useState(card?.name || '')
  const [limitAmount, setLimitAmount] = useState(card?.limit_amount ? String(card.limit_amount) : '')
  const [closingDay, setClosingDay] = useState(card?.closing_day ? String(card.closing_day) : '')
  const [dueDay, setDueDay] = useState(card?.due_day ? String(card.due_day) : '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!name.trim()) return setError('Informe o nome do cartão.')
    const limit = parseFloat(limitAmount)
    const closing = parseInt(closingDay)
    const due = parseInt(dueDay)
    if (!limit || limit <= 0) return setError('Informe um limite válido.')
    if (!closing || closing < 1 || closing > 31) return setError('Dia de fechamento inválido.')
    if (!due || due < 1 || due > 31) return setError('Dia de vencimento inválido.')

    setError('')
    setSaving(true)
    try {
      const fields = { name: name.trim(), limit_amount: limit, closing_day: closing, due_day: due }
      if (card) {
        await updateCard(card.id, fields)
      } else {
        await createCard(userId, fields)
      }
      onSave()
    } catch (err) {
      setError(err.message || 'Erro ao salvar cartão.')
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">
          {card ? 'Editar cartão' : 'Novo cartão'}
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="form-group">
          <label className="form-label">Nome</label>
          <input className="form-input" type="text" placeholder="Ex: Nubank, Inter..."
            value={name} onChange={e => setName(e.target.value)} />
        </div>

        <div className="form-group">
          <label className="form-label">Limite total (R$)</label>
          <input className="form-input" type="number" placeholder="0,00" step="0.01"
            inputMode="decimal" value={limitAmount} onChange={e => setLimitAmount(e.target.value)} />
        </div>

        <div className="form-group">
          <label className="form-label">Dia de fechamento da fatura</label>
          <input className="form-input" type="number" placeholder="Ex: 20" min="1" max="31"
            value={closingDay} onChange={e => setClosingDay(e.target.value)} />
        </div>

        <div className="form-group">
          <label className="form-label">Dia de vencimento da fatura</label>
          <input className="form-input" type="number" placeholder="Ex: 28" min="1" max="31"
            value={dueDay} onChange={e => setDueDay(e.target.value)} />
        </div>

        {error && <p style={{ color: 'var(--red)', fontSize: 12, marginBottom: 12 }}>{error}</p>}

        <button className="submit-btn" onClick={handleSave} disabled={saving}>
          {saving ? 'Salvando...' : (card ? 'Salvar alterações' : 'Criar cartão')}
        </button>
      </div>
    </div>
  )
}

function InvoiceDetailModal({ userId, card, invoice, accounts, onClose, onSave }) {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [accountId, setAccountId] = useState(accounts[0]?.id || '')
  const [error, setError] = useState('')
  const [paying, setPaying] = useState(false)

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      try {
        const data = await getInvoiceTransactions(invoice.id)
        if (active) setTransactions(data)
      } catch (err) {
        console.error(err)
      }
      if (active) setLoading(false)
    }
    load()
    return () => { active = false }
  }, [invoice.id])

  async function handlePay() {
    setError('')
    setPaying(true)
    try {
      await payInvoice(userId, invoice, accountId || null)
      onSave()
    } catch (err) {
      setError(err.message || 'Erro ao pagar fatura.')
      setPaying(false)
    }
  }

  const total = transactions.reduce((sum, t) => sum + parseFloat(t.amount), 0)

  return (
    <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">
          Fatura {invoice.reference_month} — {card.name}
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: 'var(--text3)' }}>
            Vencimento: {invoice.due_date}
          </div>
          <div style={{ fontSize: 24, fontFamily: 'var(--font-mono)', fontWeight: 700, marginTop: 4 }}>
            {fmt(total)}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
            Status: {invoice.status === 'paid' ? 'Paga' : invoice.status === 'closed' ? 'Fechada' : 'Aberta'}
          </div>
        </div>

        {loading && <p style={{ fontSize: 12, color: 'var(--text3)' }}>Carregando lançamentos...</p>}

        {!loading && transactions.length === 0 && (
          <p style={{ fontSize: 12, color: 'var(--text3)' }}>Nenhum lançamento nesta fatura.</p>
        )}

        {!loading && transactions.map(t => (
          <div key={t.id} className="plan-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 500, fontSize: 13 }}>{t.description}</div>
              {t.installment_total > 1 && (
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                  Parcela {t.installment_number}/{t.installment_total}
                </div>
              )}
            </div>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{fmt(t.amount)}</span>
          </div>
        ))}

        {invoice.status !== 'paid' && (
          <>
            <div className="form-group" style={{ marginTop: 16 }}>
              <label className="form-label">Pagar com a conta</label>
              <select className="form-input" value={accountId} onChange={e => setAccountId(e.target.value)}>
                <option value="">Não vincular a conta</option>
                {accounts.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>

            {error && <p style={{ color: 'var(--red)', fontSize: 12, marginBottom: 12 }}>{error}</p>}

            <button className="submit-btn" onClick={handlePay} disabled={paying || transactions.length === 0}>
              {paying ? 'Processando...' : 'Marcar fatura como paga'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function CardInvoicesModal({ userId, card, accounts, onClose, onRefresh }) {
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedInvoice, setSelectedInvoice] = useState(null)

  async function load() {
    setLoading(true)
    try {
      const data = await getCardInvoices(card.id)
      setInvoices(data)
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [card.id])

  return (
    <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">
          Faturas — {card.name}
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {loading && <p style={{ fontSize: 12, color: 'var(--text3)' }}>Carregando...</p>}

        {!loading && invoices.length === 0 && (
          <p style={{ fontSize: 12, color: 'var(--text3)' }}>Nenhuma fatura ainda.</p>
        )}

        {invoices.map(inv => (
          <div key={inv.id} className="plan-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
            onClick={() => setSelectedInvoice(inv)}>
            <div>
              <div style={{ fontWeight: 600 }}>{inv.reference_month}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)' }}>Vence em {inv.due_date}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{fmt(inv.total_amount)}</div>
              <div style={{ fontSize: 11, color: inv.status === 'paid' ? 'var(--green)' : 'var(--text3)' }}>
                {inv.status === 'paid' ? 'Paga' : inv.status === 'closed' ? 'Fechada' : 'Aberta'}
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedInvoice && (
        <InvoiceDetailModal
          userId={userId}
          card={card}
          invoice={selectedInvoice}
          accounts={accounts}
          onClose={() => setSelectedInvoice(null)}
          onSave={() => { setSelectedInvoice(null); load(); onRefresh() }}
        />
      )}
    </div>
  )
}

export default function Cards({ userId, refresh, onRefresh }) {
  const [cards, setCards] = useState([])
  const [accounts, setAccounts] = useState([])
  const [showCardModal, setShowCardModal] = useState(false)
  const [editingCard, setEditingCard] = useState(null)
  const [invoicesCard, setInvoicesCard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      setLoadError('')
      try {
        const [cardsData, accsData] = await Promise.all([
          getCardsWithAvailableLimit(userId),
          getAccounts(userId)
        ])
        if (active) {
          setCards(cardsData)
          setAccounts(accsData)
        }
      } catch (err) {
        console.error('Erro ao carregar cartões:', err)
        if (active) setLoadError(err.message || 'Erro ao carregar cartões.')
      }
      if (active) setLoading(false)
    }
    load()
    return () => { active = false }
  }, [userId, refresh])

  async function handleDeleteCard(cardId) {
    if (!confirm('Excluir este cartão? Lançamentos vinculados ficarão sem cartão.')) return
    try {
      await deleteCard(cardId)
      onRefresh()
    } catch (err) {
      alert(err.message || 'Erro ao excluir cartão.')
    }
  }

  return (
    <>
      <div className="header">
        <div className="page-title">Cartões</div>
        <button className="header-btn" onClick={() => { setEditingCard(null); setShowCardModal(true) }}>
          <i className="ti ti-plus" />
        </button>
      </div>

      {loadError && (
        <div className="section">
          <p style={{ fontSize: 12, color: 'var(--red)' }}>Erro: {loadError}</p>
        </div>
      )}

      <div className="section">
        {loading && <p style={{ fontSize: 12, color: 'var(--text3)' }}>Carregando...</p>}

        {!loading && cards.length === 0 && !loadError && (
          <p style={{ fontSize: 12, color: 'var(--text3)' }}>
            Nenhum cartão cadastrado. Toque em + para adicionar seu primeiro cartão.
          </p>
        )}

        {cards.map(card => {
          const usedPct = card.limit_amount > 0
            ? Math.min(100, (card.committed / card.limit_amount) * 100)
            : 0
          return (
            <div key={card.id} className="plan-card" style={{ cursor: 'pointer' }}
              onClick={() => setInvoicesCard(card)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{card.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                    Fecha dia {card.closing_day} · Vence dia {card.due_day}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="section-link" onClick={e => { e.stopPropagation(); setEditingCard(card); setShowCardModal(true) }}>
                    Editar
                  </button>
                  <button className="section-link" style={{ color: 'var(--red)' }}
                    onClick={e => { e.stopPropagation(); handleDeleteCard(card.id) }}>
                    Excluir
                  </button>
                </div>
              </div>

              <div style={{ marginTop: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text3)' }}>
                  <span>Usado: {fmt(card.committed)}</span>
                  <span>Disponível: {fmt(card.available_limit)}</span>
                </div>
                <div style={{ height: 6, background: 'rgba(237,237,220,0.1)', borderRadius: 4, marginTop: 6, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${usedPct}%`,
                    background: usedPct > 90 ? 'var(--red)' : usedPct > 70 ? 'var(--gold)' : 'var(--green)',
                    borderRadius: 4
                  }} />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {showCardModal && (
        <CardModal
          userId={userId}
          card={editingCard}
          onClose={() => setShowCardModal(false)}
          onSave={() => { setShowCardModal(false); onRefresh() }}
        />
      )}

      {invoicesCard && (
        <CardInvoicesModal
          userId={userId}
          card={invoicesCard}
          accounts={accounts}
          onClose={() => setInvoicesCard(null)}
          onRefresh={onRefresh}
        />
      )}
    </>
  )
}
