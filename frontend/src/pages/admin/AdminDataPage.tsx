import { useState } from 'react'
import { api } from '../../lib/api'
import { Card } from '../../components/ui/Card'

type ImportResult = {
  dataset_id: number
  early_days: number
  created_students: number
  created_feature_snapshots: number
  created_predictions: number
}

export function AdminDataPage() {
  const [datasetId, setDatasetId] = useState('')
  const [studentInfoPath, setStudentInfoPath] = useState('')
  const [studentVlePath, setStudentVlePath] = useState('')
  const [studentAssessmentPath, setStudentAssessmentPath] = useState('')
  const [assessmentsPath, setAssessmentsPath] = useState('')
  const [earlyDays, setEarlyDays] = useState('30')
  const [generatePredictions, setGeneratePredictions] = useState(true)

  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)

  async function runImport() {
    setError(null)
    setResult(null)

    const dsId = Number(datasetId)
    const ed = Number(earlyDays)
    if (!Number.isFinite(dsId)) return setError('Please enter a valid dataset_id')
    if (!Number.isFinite(ed) || ed <= 0) return setError('Please enter a valid early_days')

    if (!studentInfoPath.trim() || !studentVlePath.trim() || !studentAssessmentPath.trim() || !assessmentsPath.trim()) {
      return setError('Please fill in all OULAD CSV file paths (server paths).')
    }

    setRunning(true)
    try {
      const res = await api.post<ImportResult>('/admin/data/import-oulad', null, {
        params: {
          dataset_id: dsId,
          student_info_path: studentInfoPath.trim(),
          student_vle_path: studentVlePath.trim(),
          student_assessment_path: studentAssessmentPath.trim(),
          assessments_path: assessmentsPath.trim(),
          early_days: ed,
          generate_predictions: generatePredictions,
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
          <p className="muted">Import raw OULAD CSVs into the database (students + feature snapshots), optionally generating predictions as well.</p>
        </div>
      </div>

      {error ? <p className="error">{error}</p> : null}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
        <Card title="Import OULAD CSVs → DB">
          <div style={{ display: 'grid', gap: 10 }}>
            <label style={{ display: 'grid', gap: 6 }}>
              dataset_id
              <input value={datasetId} onChange={(e) => setDatasetId(e.target.value)} placeholder="e.g. 1" />
            </label>

            <label style={{ display: 'grid', gap: 6 }}>
              studentInfo.csv path
              <input value={studentInfoPath} onChange={(e) => setStudentInfoPath(e.target.value)} placeholder="/abs/path/studentInfo.csv" />
            </label>

            <label style={{ display: 'grid', gap: 6 }}>
              studentVle.csv path
              <input value={studentVlePath} onChange={(e) => setStudentVlePath(e.target.value)} placeholder="/abs/path/studentVle.csv" />
            </label>

            <label style={{ display: 'grid', gap: 6 }}>
              studentAssessment.csv path
              <input
                value={studentAssessmentPath}
                onChange={(e) => setStudentAssessmentPath(e.target.value)}
                placeholder="/abs/path/studentAssessment.csv"
              />
            </label>

            <label style={{ display: 'grid', gap: 6 }}>
              assessments.csv path
              <input value={assessmentsPath} onChange={(e) => setAssessmentsPath(e.target.value)} placeholder="/abs/path/assessments.csv" />
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <label style={{ display: 'grid', gap: 6 }}>
                early_days
                <input value={earlyDays} onChange={(e) => setEarlyDays(e.target.value)} />
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 24 }}>
                <input type="checkbox" checked={generatePredictions} onChange={(e) => setGeneratePredictions(e.target.checked)} />
                Generate predictions
              </label>
            </div>

            <button onClick={runImport} disabled={running}>
              {running ? 'Importing…' : 'Run import'}
            </button>

            <div className="muted" style={{ fontSize: 12 }}>
              Note: these paths must exist on the backend server filesystem. For demo, point to your local `Data/` CSVs.
            </div>
          </div>
        </Card>

        <Card title="Result">
          {result ? (
            <div style={{ display: 'grid', gap: 8 }}>
              <Row k="dataset_id" v={result.dataset_id} />
              <Row k="early_days" v={result.early_days} />
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

