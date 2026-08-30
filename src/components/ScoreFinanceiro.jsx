import { fmt } from '../store/supabase.js'

function getScoreInfo(score) {
  if (score >= 80) return { label: 'Excelente controle', color: 'var(--green)' }
  if (score >= 60) return { label: 'Bom, com desvios', color: 'var(--gold)' }
  if (score >= 40) return { label: 'Atenção — projeção pouco confiável', color: 'var(--maroon)' }
  return { label: 'Crítico', color: 'var(--red)' }
}

export function calcScoreFinanceiro(saldoRealizado, saldoProjetado) {
  const PESO = 40
  const PENALIDADE_NEGATIVO = 20

  let desvioFrac = 0
  if (saldoProjetado !== 0) {
    desvioFrac = Math.min(
      Math.abs(saldoRealizado - saldoProjetado) / Math.abs(saldoProjetado),
      1
    )
  }

  const penalidade = saldoRealizado < 0 ? PENALIDADE_NEGATIVO : 0
  const raw = 100 - (desvioFrac * PESO) - penalidade
  return Math.max(0, Math.min(100, Math.round(raw)))
}

export default function ScoreFinanceiro({ saldoRealizado, saldoProjetado }) {
  const score = calcScoreFinanceiro(saldoRealizado, saldoProjetado)
  const { label, color } = getScoreInfo(score)
  const desvio = saldoProjetado !== 0
    ? Math.abs(saldoRealizado - saldoProjetado)
    : 0

  return (
    <div style={{
      background: 'rgba(20,20,22,0.75)',
      backdropFilter: 'blur(20px)',
      border: '0.5px solid rgba(191,167,111,0.15)',
      borderRadius: 12,
      padding: '16px 18px',
      marginBottom: 16,
      display: 'flex',
      alignItems: 'center',
      gap: 16
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: '50%',
        border: `2px solid ${color}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0
      }}>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 18,
          fontWeight: 600, color
        }}>
          {score}
        </span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 11, color: 'var(--ivory-muted)',
          fontWeight: 300, letterSpacing: '0.3px', marginBottom: 2
        }}>
          Score financeiro
        </div>
        <div style={{ fontSize: 13, color, fontWeight: 500, marginBottom: 4 }}>
          {label}
        </div>
        {desvio > 0 && (
          <div style={{
            fontSize: 11, color: 'var(--ivory-muted)',
            fontWeight: 300, fontFamily: 'var(--font-mono)'
          }}>
            Desvio projetado vs. realizado: {fmt(desvio)}
          </div>
        )}
      </div>
    </div>
  )
}
