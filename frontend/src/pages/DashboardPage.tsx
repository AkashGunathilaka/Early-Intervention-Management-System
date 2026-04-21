import { useEffect, useState } from 'react'
import { api } from '../lib/api'

type DashboardSummary = {
  total_students: number
  total_predictions: number
  total_interventions: number
  risk_counts: { high: number; medium: number; low: number }
}

export function DashboardPage() {
  const [data, setData] = useState<DashboardSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        setError(null)
        const res = await api.get<DashboardSummary>('/dashboard/summary')
        if (!cancelled) setData(res.data)
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
      <h1>Dashboard</h1>
      {loading ? <p>Loading…</p> : null}
      {error ? <p style={{ color: 'crimson' }}>{error}</p> : null}

      {data ? (
        <div style={{ display: 'grid', gap: 12 }}>
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
        </div>
      ) : null}
    </div>
  )
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone?: string
}) {
  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: 12 }}>
      <div style={{ fontSize: 12, color: '#6b7280' }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: tone ?? '#111827' }}>{value}</div>
    </div>
  )
}

