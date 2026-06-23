import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { getMonthTransactions, calcRealized, fmt, CATS_EXP, MONTHS_SHORT, MONTHS_FULL } from '../store/supabase.js'

// Cores espelham as variáveis de index.css (--gold, --charcoal, --red).
// Mantidas em hex aqui porque o Recharts renderiza SVG puro e não lê var(--...) do CSS.
const PREDICTIVE_FILL = 'rgba(191,167,111,0.14)'
const PREDICTIVE_STROKE = 'rgba(191,167,111,0.45)'
const RECEITA_FILL = '#bfa76f'   // Faded Gold
const DESPESA_FILL = '#2c2e30'   // Charcoal Slate
const DESPESA_STROKE = 'rgba(201,123,110,0.45)' // terracota fosco, discreto

function roundedTopPath(x, y, width, height) {
  const h = Math.max(height, 0)
  const r = Math.min(8, width / 2, h)
  return `M${x},${y + h} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + width - r},${y} Q${x + width},${y} ${x + width},${y + r} L${x + width},${y + h} Z`
}

function ReceitaBarShape({ x, y, width, height, payload }) {
  const path = roundedTopPath(x, y, width, height)
  if (payload?.predictive) {
    return <path d={path} fill={PREDICTIVE_FILL} stroke={PREDICTIVE_STROKE} strokeWidth={1} strokeDasharray="3 3" />
  }
  return <path d={path} fill={RECEITA_FILL} />
}

function DespesaBarShape({ x, y, width, height, payload }) {
  const path = roundedTopPath(x, y, width, height)
  if (payload?.predictive) {
    return <path d={path} fill={PREDICTIVE_FILL} stroke={PREDICTIVE_STROKE} strokeWidth={1} strokeDasharray="3 3" />
  }
  return <path d={path} fill={DESPESA_FILL} stroke={DESPESA_STROKE} strokeWidth={1} />
}

export default function Charts({ userId, month, year, changeMonth, refresh }) {
  const [barData, setBarData] = useState([])
  const [catData, setCatData] = useState([])
  const [totals, setTotals] = useState({ inc: 0, exp: 0, balance: 0 })

  useEffect(() => {
    async function load() {
      const now = new Date()
      const curY = now.getFullYear()
      const curM = now.getMonth()

      const raw = []
      for (let i = 5; i >= 0; i--) {
        let m = month - i, y = year
        if (m < 0) { m += 12; y-- }
        const txs = await getMonthTransactions(userId, y, m)
        const r = calcRealized(txs)
        const isFuture = (y > curY) || (y === curY && m > curM)
        const predictive = isFuture || txs.length === 0
        raw.push({ name: MONTHS_SHORT[m], receitas: r.inc, despesas: r.exp, predictive })
      }

      // Altura "fantasma" para os meses em monitoramento, proporcional aos meses reais
      const maxVal = Math.max(1, ...raw.filter(b => !b.predictive).map(b => Math.max(b.receitas, b.despesas)))
      const bars = raw.map(b => {
        if (b.predictive) {
          const placeholder = maxVal * 0.42
          return { ...b, displayReceitas: placeholder, displayDespesas: placeholder }
        }
        return { ...b, displayReceitas: b.receitas, displayDespesas: b.despesas }
      })
      setBarData(bars)

      const cur = await getMonthTransactions(userId, year, month)
      const r = calcRealized(cur)
      setTotals(r)

      const expTxs = cur.filter(t => t.type === 'expense' && t.status === 'realizado')
      const map = {}
      expTxs.forEach(t => { map[t.category] = (map[t.category] || 0) + parseFloat(t.amount) })
      const total = Object.values(map).reduce((a, b) => a + b, 0) || 1
      const sorted = Object.entries(map)
        .sort((a, b) => b[1] - a[1]).slice(0, 6)
        .map(([id, val]) => {
          const cat = CATS_EXP.find(c => c.id === id) || { label: 'Outros' }
          return { id, label: cat.label, initial: cat.label.charAt(0), val, pct: Math.round(val / total * 100) }
        })
      setCatData(sorted)
    }
    load()
  }, [userId, month, year, refresh])

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    const point = payload[0]?.payload
    if (!point) return null
    if (point.predictive) {
      return (
        <div className="chart-tooltip">
          <div className="chart-tooltip-month">{label}</div>
          <div className="chart-tooltip-predictive">A IA do Kronava está monitorando este período</div>
        </div>
      )
    }
    return (
      <div className="chart-tooltip">
        <div className="chart-tooltip-month">{label}</div>
        <div className="chart-tooltip-row"><span>Receitas</span><span>{fmt(point.receitas)}</span></div>
        <div className="chart-tooltip-row"><span>Despesas</span><span>{fmt(point.despesas)}</span></div>
      </div>
    )
  }

  const balanceIndicator = totals.balance >= 0 ? 'moss' : 'maroon'

  return (
    <>
      <div className="header">
        <div className="page-title">Análise</div>
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
            <div className="summary-card-value">{fmt(totals.inc)}</div>
            <div className="summary-card-indicator moss" />
          </div>
          <div className="summary-card">
            <div className="summary-card-label">Despesas</div>
            <div className="summary-card-value">{fmt(totals.exp)}</div>
            <div className="summary-card-indicator maroon" />
          </div>
          <div className="summary-card">
            <div className="summary-card-label">Saldo</div>
            <div className="summary-card-value">{fmt(totals.balance)}</div>
            <div className={`summary-card-indicator ${balanceIndicator}`} />
          </div>
        </div>
      </div>

      <div className="section">
        <div className="section-header">
          <span className="section-title">Receitas vs Despesas — 6 meses</span>
        </div>
        <div className="chart-wrap">
          <div className="chart-legend">
            <div className="legend-item"><div className="legend-dot receita" /><span>Receitas</span></div>
            <div className="legend-item"><div className="legend-dot despesa" /><span>Despesas</span></div>
            <div className="legend-item"><div className="legend-dot predictive" /><span>Em monitoramento</span></div>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={barData} barGap={3} barCategoryGap="30%">
              <XAxis dataKey="name" tick={{ fill: 'rgba(237,237,220,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(191,167,111,0.05)' }} />
              <Bar dataKey="displayReceitas" shape={ReceitaBarShape} isAnimationActive={false} />
              <Bar dataKey="displayDespesas" shape={DespesaBarShape} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
          <div className="chart-note">Barras tracejadas indicam períodos que a IA do Kronava ainda está acompanhando</div>
        </div>
      </div>

      <div className="section" style={{ marginBottom: 8 }}>
        <div className="section-header">
          <span className="section-title">Despesas realizadas por categoria</span>
        </div>
        <div className="chart-wrap">
          {catData.length === 0
            ? <div style={{ textAlign: 'center', color: 'var(--ivory-muted)', fontSize: 13, padding: '16px 0' }}>Sem despesas realizadas neste mês.</div>
            : catData.map(cat => (
              <div key={cat.id} className="cat-item">
                <div className="cat-row">
                  <div className="cat-icon">{cat.initial}</div>
                  <div className="cat-name">{cat.label}</div>
                  <div className="cat-pct">{cat.pct}%</div>
                </div>
                <div className="cat-bar-bg">
                  <div className="cat-bar-fill" style={{ width: `${cat.pct}%` }} />
                </div>
                <div className="cat-amount">{fmt(cat.val)}</div>
              </div>
            ))
          }
        </div>
      </div>
    </>
  )
}