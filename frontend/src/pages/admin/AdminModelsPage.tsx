import { useEffect, useState } from 'react'
import { api } from '../../lib/api'

type ModelRecord = {
  model_id: number
  dataset_id: number
  model_name: string
  version: string
  algorithm: string
  accuracy?: number | null
  precision?: number | null
  recall?: number | null
  f1_score?: number | null
  roc_auc?: number | null
  is_active: boolean
  is_locked: boolean
  model_path?: string | null
  feature_columns_path?: string | null
}

type MetricsFile = Record<string, any>

export function AdminModelsPage() {
  const [active, setActive] = useState<ModelRecord | null>(null)
  const [metrics, setMetrics] = useState<MetricsFile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        setError(null)

        const activeRes = await api.get<ModelRecord>('/admin/models/active')
        if (cancelled) return
        setActive(activeRes.data)

        try {
          const metricsRes = await api.get<MetricsFile>(`/admin/models/${activeRes.data.model_id}/metrics-file`)
          if (!cancelled) setMetrics(metricsRes.data)
        } catch {
          if (!cancelled) setMetrics(null)
        }
      } catch (err: any) {
        if (!cancelled) setError(err?.response?.data?.detail ?? 'Failed to load models (admin only)')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div style={{ maxWidth: 1100, margin: '32px auto', padding: 16 }}>
      <h1 style={{ marginTop: 0 }}>Admin — Models</h1>
      {loading ? <p>Loading…</p> : null}
      {error ? <p style={{ color: 'crimson' }}>{error}</p> : null}

      {active ? (
        <div style={{ display: 'grid', gap: 16 }}>
          <section style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 14 }}>
            <h2 style={{ margin: 0, fontSize: 16 }}>Active model</h2>
            <div style={{ marginTop: 12, display: 'grid', gap: 6 }}>
              <Row k="model_id" v={active.model_id} />
              <Row k="name" v={active.model_name} />
              <Row k="version" v={active.version} />
              <Row k="algorithm" v={active.algorithm} />
              <Row k="locked" v={String(active.is_locked)} />
              <Row k="active" v={String(active.is_active)} />
              <Row k="model_path" v={active.model_path ?? '-'} />
              <Row k="feature_columns_path" v={active.feature_columns_path ?? '-'} />
            </div>
          </section>

          <section style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 14 }}>
            <h2 style={{ margin: 0, fontSize: 16 }}>Metrics file</h2>
            <div style={{ marginTop: 12 }}>
              {metrics ? (
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{JSON.stringify(metrics, null, 2)}</pre>
              ) : (
                <p style={{ margin: 0, color: '#6b7280' }}>No metrics.json found for this model.</p>
              )}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  )
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
      <div style={{ color: '#6b7280', fontSize: 12 }}>{k}</div>
      <div style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>{v}</div>
    </div>
  )
}

