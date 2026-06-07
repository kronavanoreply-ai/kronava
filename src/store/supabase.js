import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)

export const CATS_EXP = [
  { id: 'food',      label: 'Alimentação', icon: '🍔', color: '#7c6ff7' },
  { id: 'home',      label: 'Moradia',     icon: '🏠', color: '#4a9eff' },
  { id: 'transport', label: 'Transporte',  icon: '🚗', color: '#4ade80' },
  { id: 'health',    label: 'Saúde',       icon: '❤️', color: '#f87171' },
  { id: 'leisure',   label: 'Lazer',       icon: '🎮', color: '#fbbf24' },
  { id: 'personal',  label: 'Pessoal',     icon: '👤', color: '#a78bfa' },
  { id: 'travel',    label: 'Viagens',     icon: '✈️', color: '#34d399' },
  { id: 'other',     label: 'Outros',      icon: '📦', color: '#9ca3af' },
]

export const CATS_INC = [
  { id: 'salary',    label: 'Salário',       icon: '💼', color: '#4ade80' },
  { id: 'bonus',     label: 'Bônus',         icon: '⭐', color: '#fbbf24' },
  { id: 'invest',    label: 'Investimentos', icon: '📈', color: '#4a9eff' },
  { id: 'freelance', label: 'Freelance',     icon: '💻', color: '#a78bfa' },
  { id: 'other',     label: 'Outros',        icon: '📦', color: '#9ca3af' },
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

  // Busca orçamento do mês atual
  const { data, error } = await supabase
    .from('budgets')
    .select('*')
    .eq('user_id', userId)
    .eq('month_key', key)
  if (error) throw error

  // Se tem orçamento definido, retorna ele
  if (data && data.length > 0) {
    const result = {}
    data.forEach(r => { result[r.category] = r.amount })
    return result
  }

  // Se não tem, busca o mês anterior como padrão
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
    // Copia automaticamente o orçamento do mês anterior
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