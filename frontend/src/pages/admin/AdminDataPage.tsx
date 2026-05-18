import { useState } from 'react'
import { api } from '../../lib/api'
import { Card } from '../../components/ui/Card'
import { PageHeader } from '../../components/ui/PageHeader'

// Admin page for importing student data from a CSV
// CSV should be under uploads/ or seed/ and contain the relevant columns

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
      return setError('Please enter a CSV path (under uploads/ or seed/).')
    }

    setRunning(true)
    try {
      // send import options as query parameters
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
      <PageHeader eyebrow="Admin" title="Data" lead="Bulk import students and feature snapshots from a single CSV." />


      {error ? <p className="error">{error}</p> : null}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
        <Card title="Import students CSV → DB">
          <div style={{ display: 'grid', gap: 10 }}>
            <label style={{ display: 'grid', gap: 6 }}>
              dataset_id
              <input value={datasetId} onChange={(e) => setDatasetId(e.target.value)} placeholder="e.g. 1" />
              <span className="muted" style={{ fontSize: 11, fontWeight: 400 }}>
                Imported students will be added to this cohort (visible on Dashboard and Students when that dataset is
                selected).
              </span>
            </label>

            <label style={{ display: 'grid', gap: 6 }}>
              CSV path
              <input value={csvPath} onChange={(e) => setCsvPath(e.target.value)} placeholder="seed/demo_students_200.csv" />
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
              Committed demo: <code>seed/demo_students_200.csv</code> (200 OULAD students from the notebook).
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

