import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { Card } from '../../components/ui/Card'
import { Stat } from '../../components/ui/Stat'
import { fmt } from '../../lib/format'

// Admin page for managing trained models
// Shows the active model, its metrics, and all models in the database

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
  const [models, setModels] = useState<ModelRecord[]>([])
  const [metrics, setMetrics] = useState<MetricsFile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activatingId, setActivatingId] = useState<number | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [deleteArtifacts, setDeleteArtifacts] = useState(true)

  // Fetches the active model records and the active models metrics
  async function loadAll(cancelledRef?: { cancelled: boolean }) {
    try {
      setLoading(true)
      setError(null)

      const [activeRes, listRes] = await Promise.all([
        api.get<ModelRecord>('/admin/models/active'),
        api.get<ModelRecord[]>('/admin/models/'),
      ])

      if (cancelledRef?.cancelled) return
      setActive(activeRes.data)
      setModels(listRes.data)

      try {
        const metricsRes = await api.get<MetricsFile>(`/admin/models/${activeRes.data.model_id}/metrics-file`)
        if (!cancelledRef?.cancelled) setMetrics(metricsRes.data)
      } catch {
        if (!cancelledRef?.cancelled) setMetrics(null)
      }
    } catch (err: any) {
      if (!cancelledRef?.cancelled) setError(err?.response?.data?.detail ?? 'Failed to load models (admin only)')
    } finally {
      if (!cancelledRef?.cancelled) setLoading(false)
    }
  }

  // Activate a model and relaod the file 
  async function activate(modelId: number) {
    setActivatingId(modelId)
    setError(null)
    try {
      await api.put(`/admin/models/activate/${modelId}`)
      await loadAll()
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Failed to activate model')
    } finally {
      setActivatingId(null)
    }
  }

  // delete a model record (cannot delete master or active model)
  async function deleteModel(modelId: number) {
    const ok = window.confirm(`Delete model_id=${modelId}? This cannot be undone.`)
    if (!ok) return

    setDeletingId(modelId)
    setError(null)
    try {
      await api.delete(`/admin/models/${modelId}`, { params: { delete_artifacts: deleteArtifacts } })
      await loadAll()
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Failed to delete model')
    } finally {
      setDeletingId(null)
    }
  }

// load the model when the page opens 
  useEffect(() => {
    const ref = { cancelled: false }
    loadAll(ref)
    return () => {
      ref.cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="page">
      <div className="pageHeader">
        <h1>Admin — Models</h1>
      </div>
      {loading ? <p>Loading…</p> : null}
      {error ? <p className="error">{error}</p> : null}

      {active ? (
        <div style={{ display: 'grid', gap: 16 }}>
          <Card title="Active model">
            <div style={{ display: 'grid', gap: 6 }}>
              <Row k="model_id" v={active.model_id} />
              <Row k="name" v={active.model_name} />
              <Row k="version" v={active.version} />
              <Row k="algorithm" v={active.algorithm} />
              <Row k="locked" v={String(active.is_locked)} />
              <Row k="active" v={String(active.is_active)} />
              <Row k="model_path" v={active.model_path ?? '-'} />
              <Row k="feature_columns_path" v={active.feature_columns_path ?? '-'} />
            </div>
          </Card>

          <Card title="Evaluation metrics">
            {metrics ? <MetricsView metrics={metrics} /> : <p className="muted">No metrics.json found for this model.</p>}
          </Card>

          <Card title="All models (switch active)">
            {models.length ? (
              <table width="100%" cellPadding={8} style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Version</th>
                    <th>Locked</th>
                    <th>Active</th>
                    <th>Action</th>
                    <th>Delete</th>
                  </tr>
                </thead>
                <tbody>
                  {models.map((m) => (
                    <tr key={m.model_id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td>{m.model_id}</td>
                      <td>{m.model_name}</td>
                      <td>{m.version}</td>
                      <td>{m.is_locked ? 'Yes' : 'No'}</td>
                      <td>{m.is_active ? 'Yes' : 'No'}</td>
                      <td>
                        {m.is_active ? (
                          <span style={{ color: 'var(--text)' }}>Current</span>
                        ) : (
                          <button onClick={() => activate(m.model_id)} disabled={activatingId === m.model_id}>
                            {activatingId === m.model_id ? 'Activating…' : 'Activate'}
                          </button>
                        )}
                      </td>
                      <td>
                        {m.is_locked || m.is_active ? (
                          <span className="muted">—</span>
                        ) : (
                          <button onClick={() => deleteModel(m.model_id)} disabled={deletingId === m.model_id}>
                            {deletingId === m.model_id ? 'Deleting…' : 'Delete'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p style={{ margin: 0, color: 'var(--text)' }}>No models found.</p>
            )}

            <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text)', fontSize: 12 }}>
                <input type="checkbox" checked={deleteArtifacts} onChange={(e) => setDeleteArtifacts(e.target.checked)} />
                Delete artifacts folder too (only under `model/artifacts/`)
              </label>
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  )
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
      <div style={{ color: 'var(--text)', fontSize: 12 }}>{k}</div>
      <div style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>{v}</div>
    </div>
  )
}

// Shows the saved training metrics for the model
function MetricsView({ metrics }: { metrics: MetricsFile }) {
  const split = metrics?.split ?? null

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        <Stat label="Accuracy" value={fmt(metrics.accuracy, 3)} />
        <Stat label="Precision" value={fmt(metrics.precision, 3)} />
        <Stat label="Recall" value={fmt(metrics.recall, 3)} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        <Stat label="F1" value={fmt(metrics.f1_score, 3)} />
        <Stat label="ROC-AUC" value={fmt(metrics.roc_auc, 3)} />
        <Stat label="PR-AUC" value={fmt(metrics.pr_auc, 3)} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="card" style={{ padding: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Split</div>
          {split ? (
            <div style={{ display: 'grid', gap: 6 }}>
              <Row k="type" v={String(split.type ?? '-')} />
              <Row k="test_size" v={String(split.test_size ?? '-')} />
              <Row k="random_state" v={String(split.random_state ?? '-')} />
              <Row k="group_col" v={String(split.group_col ?? '-')} />
            </div>
          ) : (
            <div className="muted">No split metadata</div>
          )}
        </div>

        <div className="card" style={{ padding: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Raw JSON</div>
          <details>
            <summary style={{ cursor: 'pointer' }}>Show</summary>
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{JSON.stringify(metrics, null, 2)}</pre>
          </details>
        </div>
      </div>
    </div>
  )
}

