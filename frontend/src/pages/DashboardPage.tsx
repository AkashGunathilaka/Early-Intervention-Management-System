import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { Card } from '../components/ui/Card'
import { Stat } from '../components/ui/Stat'

type DashboardSummary = {
  total_students: number
  total_predictions: number
  total_interventions: number
  risk_counts: { high: number; medium: number; low: number }
}

type RiskDistribution = { High: number; Medium: number; Low: number }

type RecentHighRiskRow = {
  prediction_id: number
  student_id: number
  risk_score: number
  confidence_score: number
  prediction_date: string
  top_factors: string | null
}

type InterventionStatus = Record<string, number>

export function DashboardPage() {
  const [data, setData] = useState<DashboardSummary | null>(null)
  const [dist, setDist] = useState<RiskDistribution | null>(null)
  const [recent, setRecent] = useState<RecentHighRiskRow[] | null>(null)
  const [interventions, setInterventions] = useState<InterventionStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        setError(null)
        const [summaryRes, distRes, recentRes, interventionRes] = await Promise.all([
          api.get<DashboardSummary>('/dashboard/summary'),
          api.get<RiskDistribution>('/dashboard/risk-distribution'),
          api.get<RecentHighRiskRow[]>('/dashboard/recent-high-risk', { params: { limit: 10 } }),
          api.get<InterventionStatus>('/dashboard/intervention-status'),
        ])

        if (!cancelled) {
          setData(summaryRes.data)
          setDist(distRes.data)
          setRecent(recentRes.data)
          setInterventions(interventionRes.data)
        }
      } catch (err: any) {
        if (!cancelled) setError(err?.response?.data?.detail ?? 'Failed to load dashboard')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div style={{ maxWidth: 960, margin: '32px auto', padding: 16 }}>
      <h1 style={{ marginTop: 0 }}>Dashboard</h1>
      {loading ? <p>Loading…</p> : null}
      {error ? <p style={{ color: 'crimson' }}>{error}</p> : null}

      {data ? (
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            <Stat label="Total students" value={data.total_students} />
            <Stat label="Total predictions" value={data.total_predictions} />
            <Stat label="Total interventions" value={data.total_interventions} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            <Stat label="High risk" value={data.risk_counts.high} tone="crimson" />
            <Stat label="Medium risk" value={data.risk_counts.medium} tone="#b26a00" />
            <Stat label="Low risk" value={data.risk_counts.low} tone="green" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Card title="Risk distribution">
              {dist ? <RiskBars dist={dist} /> : <p style={{ margin: 0, color: '#6b7280' }}>No data</p>}
            </Card>

            <Card title="Intervention status">
              {interventions ? (
                <div style={{ display: 'grid', gap: 8 }}>
                  {Object.entries(interventions).map(([k, v]) => (
                    <div
                      key={k}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        borderBottom: '1px solid #f3f4f6',
                        padding: '6px 0',
                      }}
                    >
                      <div style={{ color: '#374151' }}>{k}</div>
                      <div style={{ fontWeight: 700 }}>{v}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ margin: 0, color: '#6b7280' }}>No data</p>
              )}
            </Card>
          </div>

          <Card title="Recent high risk students">
            {recent && recent.length ? (
              <table width="100%" cellPadding={8} style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>
                    <th>Student</th>
                    <th>Risk score</th>
                    <th>Confidence</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((r) => (
                    <tr key={r.prediction_id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td>{r.student_id}</td>
                      <td>{r.risk_score.toFixed(3)}</td>
                      <td>{r.confidence_score.toFixed(3)}</td>
                      <td>{new Date(r.prediction_date).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p style={{ margin: 0, color: '#6b7280' }}>No high-risk predictions yet.</p>
            )}
          </Card>
        </div>
      ) : null}
    </div>
  )
}

function RiskBars({ dist }: { dist: RiskDistribution }) {
  const total = (dist.High ?? 0) + (dist.Medium ?? 0) + (dist.Low ?? 0)
  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0)

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <Bar label="High" value={dist.High ?? 0} percent={pct(dist.High ?? 0)} color="crimson" />
      <Bar label="Medium" value={dist.Medium ?? 0} percent={pct(dist.Medium ?? 0)} color="#b26a00" />
      <Bar label="Low" value={dist.Low ?? 0} percent={pct(dist.Low ?? 0)} color="green" />
      <div style={{ fontSize: 12, color: '#6b7280' }}>Total: {total}</div>
    </div>
  )
}

function Bar({
  label,
  value,
  percent,
  color,
}: {
  label: string
  value: number
  percent: number
  color: string
}) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#374151' }}>
        <div>
          <strong style={{ color }}>{label}</strong> — {value}
        </div>
        <div>{percent}%</div>
      </div>
      <div style={{ height: 10, borderRadius: 999, background: '#f3f4f6', overflow: 'hidden', marginTop: 6 }}>
        <div style={{ width: `${percent}%`, height: '100%', background: color }} />
      </div>
    </div>
  )
}

