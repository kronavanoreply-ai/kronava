import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { getMonthTransactions, calcRealized, fmt, CATS_EXP, MONTHS_SHORT, MONTHS_FULL } from '../store/supabase.js'

export default function Charts({ userId, month, year, changeMonth, refresh }) {
  const [barData, setBarData] = useState([])
  const [catData, setCatData] = useState([])
  const [totals, setTotals] = useState({ inc: 0, exp: 0, balance: 0 })

  useEffect(() => {
    async function load() {
      const bars = []
      for (let i = 5; i >= 0; i--) {
        let m = month - i, y = year
        if (m < 0) { m += 12; y-- }
        const txs = await getMonthTransactions(userId, y, m)
        const r = calcRealized(txs)
        bars.push({ name: MONTHS_SHORT[m], receitas: r.inc, despesas: r.exp })
      }
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
          const cat = CATS_EXP.find(c => c.id === id) || { icon: '📦', label: 'Outros', color: '#9ca3af' }
          return { ...cat, val, pct: Math.round(val / total * 100) }
        })
      setCatData(sorted)
    }
    load()
  }, [userId, month, year, refresh])

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return (
      <div style={{ background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 10, padding: '10px 14px', fontSize: 12 }}>
        <div style={{ color: 'var(--text2)', marginBottom: 6 }}>{label}</div>
        <div style={{ color: '#7c6ff7' }}>Receitas: {fmt(payload[0]?.value || 0)}</div>
        <div style={{ color: '#f87171' }}>Despesas: {fmt(payload[1]?.value || 0)}</div>
      </div>
    )
  }

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
            <div className="summary-card-value" style={{ color: 'var(--green)' }}>{fmt(totals.inc)}</div>
          </div>
          <div className="summary-card">
            <div className="summary-card-label">Despesas</div>
            <div className="summary-card-value" style={{ color: 'var(--red)' }}>{fmt(totals.exp)}</div>
          </div>
          <div className="summary-card">
            <div className="summary-card-label">Saldo</div>
            <div className="summary-card-value" style={{ color: totals.balance >= 0 ? 'var(--green)' : 'var(--red)' }}>{fmt(totals.balance)}</div>
          </div>
        </div>
      </div>

      <div className="section">
        <div className="section-header">
          <span className="section-title">Receitas vs Despesas — 6 meses</span>
        </div>
        <div className="chart-wrap">
          <div className="chart-legend">
            <div className="legend-item"><div className="legend-dot" style={{ background: '#7c6ff7' }} /><span>Receitas</span></div>
            <div className="legend-item"><div className="legend-dot" style={{ background: '#f87171' }} /><span>Despesas</span></div>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={barData} barGap={3} barCategoryGap="30%">
              <XAxis dataKey="name" tick={{ fill: '#6666aa', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(124,111,247,0.06)' }} />
              <Bar dataKey="receitas" fill="#7c6ff7" radius={[4, 4, 0, 0]} />
              <Bar dataKey="despesas" fill="#f87171" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="section" style={{ marginBottom: 8 }}>
        <div className="section-header">
          <span className="section-title">Despesas realizadas por categoria</span>
        </div>
        <div className="chart-wrap">
          {catData.length === 0
            ? <div style={{ textAlign: 'center', color: 'var(--text3)', fontSize: 13, padding: '16px 0' }}>Sem despesas realizadas neste mês.</div>
            : catData.map(cat => (
              <div key={cat.id} className="cat-item">
                <div className="cat-row">
                  <div className="cat-dot" style={{ background: cat.color }} />
                  <div className="cat-name">{cat.icon} {cat.label}</div>
                  <div className="cat-pct" style={{ color: cat.color }}>{cat.pct}%</div>
                </div>
                <div className="cat-bar-bg">
                  <div className="cat-bar-fill" style={{ width: `${cat.pct}%`, background: cat.color }} />
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