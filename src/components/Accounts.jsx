import { useState, useEffect } from 'react'
import {
  getAccountsWithBalances, createAccount, updateAccount, deleteAccount,
  createTransfer, getTransfers, deleteTransfer,
  fmt, ACCOUNT_TYPES
} from '../store/supabase.js'

function AccountModal({ userId, account, onClose, onSave }) {
  const [name, setName] = useState(account?.name || '')
  const [type, setType] = useState(account?.type || 'corrente')
  const [initialBalance, setInitialBalance] = useState(account?.initial_balance ? String(account.initial_balance) : '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!name.trim()) { setError('Informe o nome da conta.'); return }
    setError('')
    setSaving(true)
    try {
      const fields = {
        name: name.trim(),
        type,
        initial_balance: parseFloat(initialBalance) || 0
      }
      if (account) {
        await updateAccount(account.id, fields)
      } else {
        await createAccount(userId, fields)
      }
      onSave()
    } catch (err) {
      setError(err.message || 'Erro ao salvar conta.')
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">
          {account ? 'Editar conta' : 'Nova conta'}
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="form-group">
          <label className="form-label">Nome</label>
          <input className="form-input" type="text" placeholder="Ex: Nubank, Poupança CEF..."
            value={name} onChange={e => setName(e.target.value)} />
        </div>

        <div className="form-group">
          <label className="form-label">Tipo</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {ACCOUNT_TYPES.map(t => (
              <button key={t.id}
                className={`chip ${type === t.id ? 'active' : ''}`}
                onClick={() => setType(t.id)}
                style={{ padding: '8px 12px' }}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Saldo inicial (R$)</label>
          <input className="form-input" type="number" placeholder="0,00" step="0.01"
            inputMode="decimal" value={initialBalance}
            onChange={e => setInitialBalance(e.target.value)} />
        </div>

        {error && <div className="error-msg">{error}</div>}

        <button className="submit-btn" onClick={handleSave} disabled={saving}>
          {saving ? 'Salvando...' : (account ? 'Salvar alterações' : 'Criar conta')}
        </button>
      </div>
    </div>
  )
}

function TransferModal({ userId, accounts, onClose, onSave }) {
  const [fromId, setFromId] = useState(accounts[0]?.id || '')
  const [toId, setToId] = useState(accounts[1]?.id || '')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setError('')
    const value = parseFloat(amount)
    if (!fromId || !toId) return setError('Selecione as duas contas.')
    if (fromId === toId) return setError('As contas de origem e destino devem ser diferentes.')
    if (!value || value <= 0) return setError('Informe um valor válido.')

    setSaving(true)
    try {
      await createTransfer(userId, {
        from_account_id: fromId,
        to_account_id: toId,
        amount: value,
        description: description.trim() || null
      })
      onSave()
    } catch (err) {
      setError(err.message || 'Erro ao transferir.')
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">
          Transferir entre contas
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="form-group">
          <label className="form-label">De</label>
          <select className="form-input" value={fromId} onChange={e => setFromId(e.target.value)}>
            {accounts.map(a => (
              <option key={a.id} value={a.id}>{a.name} ({fmt(a.balance)})</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Para</label>
          <select className="form-input" value={toId} onChange={e => setToId(e.target.value)}>
            {accounts.map(a => (
              <option key={a.id} value={a.id}>{a.name} ({fmt(a.balance)})</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Valor (R$)</label>
          <input className="form-input" type="number" placeholder="0,00" step="0.01"
            inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} />
        </div>

        <div className="form-group">
          <label className="form-label">Descrição (opcional)</label>
          <input className="form-input" type="text" placeholder="Ex: reserva de emergência"
            value={description} onChange={e => setDescription(e.target.value)} />
        </div>

        {error && <p style={{ color: 'var(--red)', fontSize: 12, marginBottom: 12 }}>{error}</p>}

        <button className="submit-btn" onClick={handleSave} disabled={saving}>
          {saving ? 'Transferindo...' : 'Transferir'}
        </button>
      </div>
    </div>
  )
}

export default function Accounts({ userId, refresh, onRefresh }) {
  const [accounts, setAccounts] = useState([])
  const [transfers, setTransfers] = useState([])
  const [showAccountModal, setShowAccountModal] = useState(false)
  const [editingAccount, setEditingAccount] = useState(null)
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [transfersError, setTransfersError] = useState('')

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      setLoadError('')
      setTransfersError('')

      const [accsResult, trsResult] = await Promise.allSettled([
        getAccountsWithBalances(userId),
        getTransfers(userId)
      ])

      if (!active) return

      if (accsResult.status === 'fulfilled') {
        setAccounts(accsResult.value)
      } else {
        console.error('Erro ao carregar contas:', accsResult.reason)
        setLoadError(accsResult.reason?.message || 'Erro ao carregar contas.')
        setAccounts([])
      }

      if (trsResult.status === 'fulfilled') {
        setTransfers(trsResult.value)
      } else {
        console.error('Erro ao carregar transferências:', trsResult.reason)
        setTransfersError(trsResult.reason?.message || 'Erro ao carregar transferências.')
        setTransfers([])
      }

      setLoading(false)
    }

    load()
    return () => { active = false }
  }, [userId, refresh])

  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0)

  async function handleDeleteAccount(accountId) {
    if (!confirm('Excluir esta conta? Lançamentos vinculados ficarão sem conta.')) return
    try {
      await deleteAccount(accountId)
      onRefresh()
    } catch (err) {
      alert(err.message || 'Erro ao excluir conta.')
    }
  }

  async function handleDeleteTransfer(transferId) {
    if (!confirm('Excluir esta transferência?')) return
    try {
      await deleteTransfer(transferId)
      onRefresh()
    } catch (err) {
      alert(err.message || 'Erro ao excluir transferência.')
    }
  }

  function accountName(id) {
    return accounts.find(a => a.id === id)?.name || '—'
  }

  return (
    <>
      <div className="header">
        <div className="page-title">Contas</div>
        <button className="header-btn" onClick={() => { setEditingAccount(null); setShowAccountModal(true) }}>
          <i className="ti ti-plus" />
        </button>
      </div>

      <div className="section">
        <div className="chart-wrap">
          <span style={{ fontSize: 13, color: 'var(--text2)', fontWeight: 500 }}>Saldo total consolidado</span>
          <div style={{ fontSize: 28, fontFamily: 'var(--font-mono)', fontWeight: 700, marginTop: 6 }}>
            {fmt(totalBalance)}
          </div>
        </div>
      </div>

      {loadError && (
        <div className="section">
          <p style={{ fontSize: 12, color: 'var(--red)' }}>
            Erro ao carregar contas: {loadError}
          </p>
        </div>
      )}

      <div className="section">
        <div className="section-header">
          <span className="section-title">Minhas contas</span>
          {accounts.length >= 2 && (
            <button className="section-link" onClick={() => setShowTransferModal(true)}>
              Transferir
            </button>
          )}
        </div>

        {loading && <p style={{ fontSize: 12, color: 'var(--text3)' }}>Carregando...</p>}

        {!loading && accounts.length === 0 && !loadError && (
          <p style={{ fontSize: 12, color: 'var(--text3)' }}>
            Nenhuma conta cadastrada. Toque em + para criar sua primeira conta.
          </p>
        )}

        {accounts.map(acc => {
          const typeInfo = ACCOUNT_TYPES.find(t => t.id === acc.type)
          return (
            <div key={acc.id} className="plan-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 20 }}>{typeInfo?.icon || '📦'}</span>
                <div>
                  <div style={{ fontWeight: 600 }}>{acc.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>{typeInfo?.label}</div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: acc.balance >= 0 ? 'var(--green)' : 'var(--red)' }}>
                  {fmt(acc.balance)}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 4, justifyContent: 'flex-end' }}>
                  <button className="section-link" onClick={() => { setEditingAccount(acc); setShowAccountModal(true) }}>
                    Editar
                  </button>
                  <button className="section-link" style={{ color: 'var(--red)' }} onClick={() => handleDeleteAccount(acc.id)}>
                    Excluir
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {transfersError && (
        <div className="section">
          <p style={{ fontSize: 12, color: 'var(--red)' }}>
            Não foi possível carregar o histórico de transferências: {transfersError}
          </p>
        </div>
      )}

      {!transfersError && transfers.length > 0 && (
        <div className="section">
          <div className="section-header">
            <span className="section-title">Histórico de transferências</span>
          </div>
          {transfers.map(t => (
            <div key={t.id} className="plan-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 500, fontSize: 13 }}>
                  {accountName(t.from_account_id)} → {accountName(t.to_account_id)}
                </div>
                {t.description && (
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>{t.description}</div>
                )}
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>{t.date}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{fmt(t.amount)}</span>
                <button className="section-link" style={{ color: 'var(--red)' }} onClick={() => handleDeleteTransfer(t.id)}>
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAccountModal && (
        <AccountModal
          userId={userId}
          account={editingAccount}
          onClose={() => setShowAccountModal(false)}
          onSave={() => { setShowAccountModal(false); onRefresh() }}
        />
      )}

      {showTransferModal && (
        <TransferModal
          userId={userId}
          accounts={accounts}
          onClose={() => setShowTransferModal(false)}
          onSave={() => { setShowTransferModal(false); onRefresh() }}
        />
      )}
    </>
  )
}
