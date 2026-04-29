import { useState } from 'react'
import { api } from '../../lib/api'
import { Card } from '../../components/ui/Card'

type ImportResult = {
  dataset_id: number
  early_days: number | null
  created_students: number
  created_feature_snapshots: number
  created_predictions: number
}

export function AdminDataPage() {
  const [datasetId, setDatasetId] = useState('')
  const [csvPath, setCsvPath] = useState('')
  const [generatePredictions, setGeneratePredictions] = useState(true)
  const [upsertStudents, setUpsertStudents] = useState(true)

  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)

  async function runImport() {
    setError(null)
    setResult(null)

    const dsId = Number(datasetId)
    if (!Number.isFinite(dsId)) return setError('Please enter a valid dataset_id')

    if (!csvPath.trim()) {
      return setError('Please enter a CSV path (must be under uploads/).')
    }

    setRunning(true)
    try {
      const res = await api.post<ImportResult>('/admin/data/import-oulad', null, {
        params: {
          dataset_id: dsId,
          csv_path: csvPath.trim(),
          generate_predictions: generatePredictions,
          upsert_students: upsertStudents,
        },
      })
      setResult(res.data)
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Import failed')
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="page">
      <div className="pageHeader">
        <div style={{ display: 'grid', gap: 6 }}>
          <h1>Admin — Data</h1>
          <p className="muted">
            Bulk import Students + Feature Snapshots from a single CSV (matching your app’s column names), optionally generating predictions as well.
          </p>
        </div>
      </div>

      {error ? <p className="error">{error}</p> : null}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
        <Card title="Import students CSV → DB">
          <div style={{ display: 'grid', gap: 10 }}>
            <label style={{ display: 'grid', gap: 6 }}>
              dataset_id
              <input value={datasetId} onChange={(e) => setDatasetId(e.target.value)} placeholder="e.g. 1" />
            </label>

            <label style={{ display: 'grid', gap: 6 }}>
              CSV path (under uploads/)
              <input value={csvPath} onChange={(e) => setCsvPath(e.target.value)} placeholder="uploads/my_students.csv" />
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
              <input type="checkbox" checked={generatePredictions} onChange={(e) => setGeneratePredictions(e.target.checked)} />
              Generate predictions
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 0 }}>
              <input type="checkbox" checked={upsertStudents} onChange={(e) => setUpsertStudents(e.target.checked)} />
              Upsert students by student_id (if provided)
            </label>

            <button onClick={runImport} disabled={running}>
              {running ? 'Importing…' : 'Run import'}
            </button>

            <div className="muted" style={{ fontSize: 12 }}>
              Note: the CSV must be accessible to the backend under `uploads/` (for safety).
            </div>

            <details>
              <summary style={{ cursor: 'pointer' }}>Expected CSV columns</summary>
              <pre style={{ whiteSpace: 'pre-wrap' }}>
{`# Student (required)
code_module, code_presentation, gender, region, highest_education, imd_band, age_band, num_of_prev_attempts, studied_credits, disability

# Snapshot (required)
days_from_start, total_clicks, avg_clicks, vle_records, avg_score, total_score, assessment_count, avg_weight

# Optional
student_id, at_risk_label`}
              </pre>
            </details>
          </div>
        </Card>

        <Card title="Result">
          {result ? (
            <div style={{ display: 'grid', gap: 8 }}>
              <Row k="dataset_id" v={result.dataset_id} />
              <Row k="early_days" v={result.early_days ?? '-'} />
              <Row k="created_students" v={result.created_students} />
              <Row k="created_feature_snapshots" v={result.created_feature_snapshots} />
              <Row k="created_predictions" v={result.created_predictions} />
            </div>
          ) : (
            <p className="muted">No result yet.</p>
          )}
        </Card>
      </div>
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

