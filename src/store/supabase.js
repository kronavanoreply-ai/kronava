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
  { id: 'corrente', label: 'Conta Corrente', icon: '??' },
  { id: 'poupanca', label: 'Poupan�a', icon: '??' },
  { id: 'carteira', label: 'Carteira', icon: '??' },
  { id: 'investimento', label: 'Investimento', icon: '??' },
  { id: 'outro', label: 'Outro', icon: '??' },
]
