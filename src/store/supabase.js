import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)

export const CATS_EXP = [
  { id: 'food',      label: 'Alimentação', icon: '🍔', color: '#7c6ff7' },
  { id: 'home',      label: 'Moradia',     icon: '🏠', color: '#4a9eff' },
  { id: 'transport', label: 'Transporte',  icon: '🚗', color: '#4ade80' },
  { id: 'health',    label: 'Saúde',       icon: '⚕', color: '#f87171' },
  { id: 'leisure',   label: 'Lazer',       icon: '🎮', color: '#fbbf24' },
  { id: 'personal',  label: 'Pessoal',     icon: '👤', color: '#a78bfa' },
  { id: 'travel',    label: 'Viagens',     icon: '✈️', color: '#34d399' },
  { id: 'other',     label: 'Outros',      icon: '📦', color: '#9ca3af' },
]

export const CATS_INC = [
  { id: 'salary',    label: 'Salário',       icon: '💼', color: '#4ade80' },
  { id: 'bonus',     label: 'Bônus',         icon: '⦿' },
  { id: 'poupanca',  label: 'Poupança',       icon: '💰' },
  { id: 'carteira',  label: 'Carteira',       icon: '👛' },
  { id: 'outro',     label: 'Outro',          icon: '📦' },
]

export const MONTHS_SHORT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
export const MONTHS_FULL  = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

export function monthKey(year, month) {
  return `${year}-${String(month + 1).padStart(2, '0')}`
}

export function fmt(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(Math.abs(value))
}

function pad2(n) { return String(n).padStart(2, '0') }

export function addMonthsToDate(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00')
  const day = d.getDate()
  d.setDate(1)
  d.setMonth(d.getMonth() + n)
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  d.setDate(Math.min(day, lastDay))
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

export async function getMonthTransactions(userId, year, month) {
  const start = `${year}-${String(month + 1).padStart(2, '0')}-01`
  let endYear = year
  let endMonth = month + 2
  if (endMonth > 12) { endMonth = 1; endYear++ }
  const end = `${endYear}-${String(endMonth).padStart(2, '0')}-01`
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .gte('date_projected', start)
    .lt('date_projected', end)
  if (error) throw error
  return (data || []).sort((a, b) => new Date(b.date_projected) - new Date(a.date_projected))
}

export async function getAccumulatedBalance(userId, year, month) {
  const untilDate = `${year}-${String(month + 1).padStart(2, '0')}-01`
  const { data, error } = await supabase
    .from('transactions')
    .select('type, amount')
    .eq('user_id', userId)
    .eq('status', 'realizado')
    .lt('date_projected', untilDate)
  if (error) throw error
  let balance = 0
  data?.forEach(t => {
    if (t.type === 'income') balance += parseFloat(t.amount)
    else balance -= parseFloat(t.amount)
  })
  return balance
}

export async function getMonthBudgets(userId, year, month) {
  const key = monthKey(year, month)

  const { data, error } = await supabase
    .from('budgets')
    .select('*')
    .eq('user_id', userId)
    .eq('month_key', key)
  if (error) throw error

  if (data && data.length > 0) {
    const result = {}
    data.forEach(r => { result[r.category] = r.amount })
    return result
  }

  let prevMonth = month - 1
  let prevYear = year
  if (prevMonth < 0) { prevMonth = 11; prevYear-- }
  const prevKey = monthKey(prevYear, prevMonth)

  const { data: prevData, error: prevError } = await supabase
    .from('budgets')
    .select('*')
    .eq('user_id', userId)
    .eq('month_key', prevKey)
  if (prevError) throw prevError

  if (prevData && prevData.length > 0) {
    const rows = prevData.map(r => ({
      user_id: userId,
      month_key: key,
      category: r.category,
      amount: r.amount
    }))
    await supabase.from('budgets').insert(rows)
    const result = {}
    prevData.forEach(r => { result[r.category] = r.amount })
    return result
  }

  return {}
}

export async function saveMonthBudgets(userId, year, month, budgetMap) {
  const key = monthKey(year, month)
  await supabase.from('budgets')
    .delete()
    .eq('user_id', userId)
    .eq('month_key', key)
  const rows = Object.entries(budgetMap)
    .filter(([, v]) => v > 0)
    .map(([category, amount]) => ({
      user_id: userId, month_key: key, category, amount
    }))
  if (rows.length > 0) {
    const { error } = await supabase.from('budgets').insert(rows)
    if (error) throw error
  }
}

export function calcTotals(txs) {
  let inc = 0, exp = 0
  txs.forEach(t => {
    if (t.type === 'income') inc += parseFloat(t.amount)
    else exp += parseFloat(t.amount)
  })
  return { inc, exp, balance: inc - exp }
}

export function calcRealized(txs) {
  const realized = txs.filter(t => t.status === 'realizado')
  return calcTotals(realized)
}

// ===== META DE ECONOMIA MENSAL =====

export async function getSavingsGoal(userId, year, month) {
  const { data, error } = await supabase
    .from('savings_goals')
    .select('*')
    .eq('user_id', userId)
    .eq('year', year)
    .eq('month', month)
    .maybeSingle()
  if (error) throw error
  return data?.target_amount || 0
}

export async function saveSavingsGoal(userId, year, month, targetAmount) {
  if (!targetAmount || targetAmount <= 0) {
    const { error } = await supabase
      .from('savings_goals')
      .delete()
      .eq('user_id', userId)
      .eq('year', year)
      .eq('month', month)
    if (error) throw error
    return
  }

  const { error } = await supabase
    .from('savings_goals')
    .upsert({
      user_id: userId,
      year,
      month,
      target_amount: targetAmount
    }, { onConflict: 'user_id,year,month' })
  if (error) throw error
}

// ===== CONTAS (accounts) =====

export async function getAccounts(userId) {
  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data || []
}

export async function createAccount(userId, { name, type, color, initial_balance }) {
  const { data, error } = await supabase
    .from('accounts')
    .insert([{
      user_id: userId,
      name,
      type,
      color: color || '#bfa76f',
      initial_balance: initial_balance || 0
    }])
    .select()
  if (error) throw error
  return data?.[0]
}

export async function updateAccount(accountId, fields) {
  const { error } = await supabase
    .from('accounts')
    .update(fields)
    .eq('id', accountId)
  if (error) throw error
}

export async function deleteAccount(accountId) {
  const { error } = await supabase
    .from('accounts')
    .delete()
    .eq('id', accountId)
  if (error) throw error
}

// ===== TRANSFERÊNCIAS ENTRE CONTAS =====

export async function createTransfer(userId, { from_account_id, to_account_id, amount, description, date }) {
  const { data, error } = await supabase
    .from('transfers')
    .insert([{
      user_id: userId,
      from_account_id,
      to_account_id,
      amount,
      description: description || null,
      date: date || new Date().toISOString().slice(0, 10)
    }])
    .select()
  if (error) throw error
  return data?.[0]
}

export async function getTransfers(userId) {
  const { data, error } = await supabase
    .from('transfers')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })
  if (error) throw error
  return data || []
}

export async function deleteTransfer(transferId) {
  const { error } = await supabase
    .from('transfers')
    .delete()
    .eq('id', transferId)
  if (error) throw error
}

// ===== SALDO POR CONTA =====

export async function getAccountsWithBalances(userId) {
  const accounts = await getAccounts(userId)
  if (accounts.length === 0) return []

  const { data: txs, error: txError } = await supabase
    .from('transactions')
    .select('type, amount, account_id')
    .eq('user_id', userId)
    .eq('status', 'realizado')
    .not('account_id', 'is', null)
  if (txError) throw txError

  const transfers = await getTransfers(userId)

  return accounts.map(acc => {
    let balance = parseFloat(acc.initial_balance) || 0

    txs?.forEach(t => {
      if (t.account_id !== acc.id) return
      if (t.type === 'income') balance += parseFloat(t.amount)
      else balance -= parseFloat(t.amount)
    })

    transfers.forEach(t => {
      if (t.from_account_id === acc.id) balance -= parseFloat(t.amount)
      if (t.to_account_id === acc.id) balance += parseFloat(t.amount)
    })

    return { ...acc, balance }
  })
}

export const ACCOUNT_TYPES = [
  { id: 'corrente', label: 'Conta Corrente', icon: '' },
  { id: 'poupanca', label: 'Poupança', icon: '' },
  { id: 'carteira', label: 'Carteira', icon: '' },
  { id: 'investimento', label: 'Investimento', icon: '' },
  { id: 'outro', label: 'Outro', icon: '' },
]

// ===== CARTÕES DE CRÉDITO =====

export async function getCards(userId) {
  const { data, error } = await supabase
    .from('cards')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data || []
}

export async function createCard(userId, { name, limit_amount, closing_day, due_day, color }) {
  const { data, error } = await supabase
    .from('cards')
    .insert([{
      user_id: userId,
      name,
      limit_amount,
      closing_day,
      due_day,
      color: color || '#bfa76f'
    }])
    .select()
  if (error) throw error
  return data?.[0]
}

export async function updateCard(cardId, fields) {
  const { error } = await supabase
    .from('cards')
    .update(fields)
    .eq('id', cardId)
  if (error) throw error
}

export async function deleteCard(cardId) {
  const { error } = await supabase
    .from('cards')
    .delete()
    .eq('id', cardId)
  if (error) throw error
}

// Calcula a data de referência (YYYY-MM) da fatura para uma data de compra
export function getInvoiceReferenceMonth(purchaseDate, closingDay) {
  const d = new Date(purchaseDate)
  const day = d.getDate()
  let year = d.getFullYear()
  let month = d.getMonth() // 0-indexed

  if (day > closingDay) {
    month += 1
    if (month > 11) { month = 0; year += 1 }
  }
  return monthKey(year, month)
}

// Soma n meses a uma referência "YYYY-MM", retornando nova referência "YYYY-MM"
export function addMonthsToReference(referenceMonth, n) {
  const [year, month] = referenceMonth.split('-').map(Number) // month 1-indexed
  const d = new Date(year, month - 1 + n, 1)
  return monthKey(d.getFullYear(), d.getMonth())
}

// Garante que a fatura exista (cria se não existir) e retorna o id
export async function getOrCreateInvoice(cardId, referenceMonth, closingDay, dueDay) {
  const { data: existing, error: findError } = await supabase
    .from('invoices')
    .select('*')
    .eq('card_id', cardId)
    .eq('reference_month', referenceMonth)
    .maybeSingle()
  if (findError) throw findError
  if (existing) return existing

  const [year, month] = referenceMonth.split('-').map(Number)
  const closingDate = new Date(year, month - 1, closingDay).toISOString().slice(0, 10)
  let dueYear = year, dueMonth = month
  if (dueDay < closingDay) {
    dueMonth += 1
    if (dueMonth > 12) { dueMonth = 1; dueYear += 1 }
  }
  const dueDate = new Date(dueYear, dueMonth - 1, dueDay).toISOString().slice(0, 10)

  const { data, error } = await supabase
    .from('invoices')
    .insert([{
      card_id: cardId,
      reference_month: referenceMonth,
      closing_date: closingDate,
      due_date: dueDate,
      status: 'open',
      total_amount: 0
    }])
    .select()
  if (error) throw error
  return data?.[0]
}

export async function getCardInvoices(cardId) {
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('card_id', cardId)
    .order('reference_month', { ascending: false })
  if (error) throw error
  return data || []
}

export async function getInvoiceTransactions(invoiceId) {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('invoice_id', invoiceId)
    .order('date_projected', { ascending: false })
  if (error) throw error
  return data || []
}

export async function payInvoice(userId, invoice, accountId) {
  const { error: txError } = await supabase
    .from('transactions')
    .insert([{
      user_id: userId,
      type: 'expense',
      amount: invoice.total_amount,
      description: 'Pagamento de fatura',
      category: 'card_payment',
      status: 'realizado',
      date_projected: new Date().toISOString().slice(0, 10),
      account_id: accountId || null
    }])
  if (txError) throw txError

  const { error: invError } = await supabase
    .from('invoices')
    .update({ status: 'paid', paid_at: new Date().toISOString() })
    .eq('id', invoice.id)
  if (invError) throw invError
}

export async function getCardsWithAvailableLimit(userId) {
  const cards = await getCards(userId)
  if (cards.length === 0) return []

  const { data: txs, error } = await supabase
    .from('transactions')
    .select('amount, card_id, invoice_id')
    .eq('user_id', userId)
    .not('card_id', 'is', null)
  if (error) throw error

  const cardIds = cards.map(c => c.id)
  const { data: invoices, error: invError } = await supabase
    .from('invoices')
    .select('id, status')
    .in('card_id', cardIds)
  if (invError) throw invError

  const paidInvoiceIds = new Set(invoices.filter(i => i.status === 'paid').map(i => i.id))

  return cards.map(card => {
    let committed = 0
    txs?.forEach(t => {
      if (t.card_id !== card.id) return
      if (t.invoice_id && paidInvoiceIds.has(t.invoice_id)) return
      committed += parseFloat(t.amount)
    })
    return {
      ...card,
      committed,
      available_limit: parseFloat(card.limit_amount) - committed
    }
  })
}

// ===== COMPRA NO CARTÃO (COM OU SEM PARCELAMENTO) =====

export async function createCardPurchase(userId, {
  cardId, amount, description, date, category, subcategory, installments
}) {
  const { data: card, error: cardError } = await supabase
    .from('cards')
    .select('*')
    .eq('id', cardId)
    .single()
  if (cardError) throw cardError

  const total = installments || 1
  const installmentAmount = Math.round((amount / total) * 100) / 100
  const roundingDiff = Math.round((amount - installmentAmount * total) * 100) / 100

  const baseReferenceMonth = getInvoiceReferenceMonth(date, card.closing_day)
  const rows = []

  for (let i = 0; i < total; i++) {
    const referenceMonth = addMonthsToReference(baseReferenceMonth, i)
    const invoice = await getOrCreateInvoice(cardId, referenceMonth, card.closing_day, card.due_day)

    const isLast = i === total - 1
    const value = isLast ? installmentAmount + roundingDiff : installmentAmount

    rows.push({
      user_id: userId,
      type: 'expense',
      status: 'projetado',
      amount: value,
      description: total > 1 ? `${description} (${i + 1}/${total})` : description,
      date_projected: invoice.due_date,
      date_realized: null,
      category,
      subcategory,
      is_recurring: false,
      card_id: cardId,
      invoice_id: invoice.id,
      installment_number: i + 1,
      installment_total: total,
    })
  }

  const { data, error } = await supabase.from('transactions').insert(rows).select()
  if (error) throw error
  return data
}

// ===== SÉRIE RECORRENTE (ajuste de quantidade de meses) =====

export async function getRecurringRule(ruleId) {
  const { data, error } = await supabase
    .from('recurring_rules')
    .select('*')
    .eq('id', ruleId)
    .single()
  if (error) throw error
  return data
}

export async function getRecurringSeries(ruleId) {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('recurring_rule_id', ruleId)
    .order('date_projected', { ascending: true })
  if (error) throw error
  return data || []
}

// Ajusta o total de meses de uma série recorrente:
// - Se aumentar: cria novas parcelas projetadas no final da série
// - Se reduzir: remove parcelas futuras ainda não confirmadas (bloqueia se houver realizadas no intervalo removido)
// Também atualiza installment_number/installment_total em toda a série
export async function updateRecurringTotal(ruleId, newTotal) {
  const rule = await getRecurringRule(ruleId)
  const series = await getRecurringSeries(ruleId)

  if (series.length === 0) throw new Error('Série recorrente não encontrada')

  const firstDate = series[0].date_projected

  if (newTotal < series.length) {
    const toRemove = series.slice(newTotal)
    const hasRealized = toRemove.some(t => t.status === 'realizado')
    if (hasRealized) {
      throw new Error('Não é possível reduzir: existem meses já confirmados além do novo total')
    }
    const idsToRemove = toRemove.map(t => t.id)
    const { error: delError } = await supabase
      .from('transactions')
      .delete()
      .in('id', idsToRemove)
    if (delError) throw delError
  }

  if (newTotal > series.length) {
    const base = series[0]
    const newRows = []
    for (let i = series.length; i < newTotal; i++) {
      const occDate = addMonthsToDate(firstDate, i)
      newRows.push({
        user_id: base.user_id,
        type: base.type,
        status: 'projetado',
        amount: base.amount,
        description: base.description,
        date_projected: occDate,
        date_realized: null,
        category: base.category,
        subcategory: base.subcategory,
        is_recurring: true,
        recurring_rule_id: ruleId,
        account_id: base.account_id || null,
        installment_number: i + 1,
        installment_total: newTotal,
      })
    }
    if (newRows.length > 0) {
      const { error: insError } = await supabase.from('transactions').insert(newRows)
      if (insError) throw insError
    }
  }

  const remaining = (await getRecurringSeries(ruleId)).slice(0, newTotal)
  for (let i = 0; i < remaining.length; i++) {
    await supabase
      .from('transactions')
      .update({ installment_number: i + 1, installment_total: newTotal })
      .eq('id', remaining[i].id)
  }

  const { error: ruleError } = await supabase
    .from('recurring_rules')
    .update({ months_count: newTotal })
    .eq('id', ruleId)
  if (ruleError) throw ruleError
}

// ===== CATEGORIAS PERSONALIZADAS DO USUÁRIO =====

export async function getCustomCategories(userId) {
  const { data, error } = await supabase
    .from('custom_categories')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data || []
}

export async function addCustomCategory(userId, { type, category, subcategory }) {
  const { data, error } = await supabase
    .from('custom_categories')
    .insert([{
      user_id: userId,
      type,
      category,
      subcategory: subcategory || null,
    }])
    .select()
  if (error) throw error
  return data?.[0]
}

export async function deleteCustomCategory(id) {
  const { error } = await supabase
    .from('custom_categories')
    .delete()
    .eq('id', id)
  if (error) throw error
}
