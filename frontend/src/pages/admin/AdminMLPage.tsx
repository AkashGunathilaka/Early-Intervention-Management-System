import { type FormEvent, useMemo, useState } from 'react'
import { api } from '../../lib/api'
import { Card } from '../../components/ui/Card'

type UploadResponse = {
  message: string
  dataset_id: number
  filename: string
  path: string
}

type RetrainResponse = {
  message: string
  model_id: number
  version: string
  metrics: Record<string, any>
}

type RetrainOuladResponse = RetrainResponse

export function AdminMLPage() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<UploadResponse | null>(null)

  const [datasetId, setDatasetId] = useState<string>('')
  const [retraining, setRetraining] = useState(false)
  const [retrainResult, setRetrainResult] = useState<RetrainResponse | null>(null)

  const [ouStudentInfoPath, setOuStudentInfoPath] = useState('')
  const [ouStudentVlePath, setOuStudentVlePath] = useState('')
  const [ouStudentAssessmentPath, setOuStudentAssessmentPath] = useState('')
  const [ouAssessmentsPath, setOuAssessmentsPath] = useState('')
  const [ouEarlyDays, setOuEarlyDays] = useState('30')
  const [ouDropCodeModule, setOuDropCodeModule] = useState(true)
  const [retrainingOulad, setRetrainingOulad] = useState(false)
  const [retrainOuladResult, setRetrainOuladResult] = useState<RetrainOuladResponse | null>(null)

  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const effectiveDatasetId = useMemo(() => {
    if (datasetId.trim()) return Number(datasetId)
    if (uploadResult?.dataset_id) return uploadResult.dataset_id
    return NaN
  }, [datasetId, uploadResult])

  async function onUpload(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setUploadResult(null)
    setRetrainResult(null)

    if (!file) {
      setError('Please choose a CSV file')
      return
    }

    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)

      const res = await api.post<UploadResponse>('/admin/ml/upload-dataset', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      setUploadResult(res.data)
      setMessage(`Uploaded. dataset_id=${res.data.dataset_id}`)
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  async function onRetrain() {
    setError(null)
    setMessage(null)
    setRetrainResult(null)
    setRetrainOuladResult(null)

    if (!Number.isFinite(effectiveDatasetId)) {
      setError('Please enter a valid dataset_id (or upload a dataset first)')
      return
    }

    setRetraining(true)
    try {
      const res = await api.post<RetrainResponse>('/admin/ml/retrain', null, {
        params: { dataset_id: effectiveDatasetId },
      })
      setRetrainResult(res.data)
      setMessage(`Retrained. model_id=${res.data.model_id} version=${res.data.version}`)
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Retrain failed')
    } finally {
      setRetraining(false)
    }
  }

  async function onRetrainOulad() {
    setError(null)
    setMessage(null)
    setRetrainResult(null)
    setRetrainOuladResult(null)

    if (!Number.isFinite(effectiveDatasetId)) {
      setError('Please enter a valid dataset_id (or upload a dataset first)')
      return
    }

    const earlyDaysNum = Number(ouEarlyDays)
    if (!Number.isFinite(earlyDaysNum) || earlyDaysNum <= 0) {
      setError('Please enter a valid early_days')
      return
    }

    if (!ouStudentInfoPath.trim() || !ouStudentVlePath.trim() || !ouStudentAssessmentPath.trim() || !ouAssessmentsPath.trim()) {
      setError('Please fill in all OULAD file paths (server paths).')
      return
    }

    setRetrainingOulad(true)
    try {
      const res = await api.post<RetrainOuladResponse>('/admin/ml/retrain-oulad', null, {
        params: {
          dataset_id: effectiveDatasetId,
          student_info_path: ouStudentInfoPath.trim(),
          student_vle_path: ouStudentVlePath.trim(),
          student_assessment_path: ouStudentAssessmentPath.trim(),
          assessments_path: ouAssessmentsPath.trim(),
          early_days: earlyDaysNum,
          drop_code_module: ouDropCodeModule,
        },
      })
      setRetrainOuladResult(res.data)
      setMessage(`OULAD retrained. model_id=${res.data.model_id} version=${res.data.version}`)
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'OULAD retrain failed')
    } finally {
      setRetrainingOulad(false)
    }
  }

  return (
    <div className="page">
      <div className="pageHeader">
        <div style={{ display: 'grid', gap: 6 }}>
          <h1>Admin — ML</h1>
          <p className="muted">Upload a CSV dataset, then retrain a new model version from it.</p>
        </div>
      </div>

      {error ? <p className="error">{error}</p> : null}
      {message ? <p className="success">{message}</p> : null}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
        <Card title="Upload dataset (CSV)">
          <form onSubmit={onUpload} style={{ display: 'grid', gap: 12 }}>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <button type="submit" disabled={uploading}>
              {uploading ? 'Uploading…' : 'Upload'}
            </button>
          </form>

          {uploadResult ? (
            <div style={{ marginTop: 12, display: 'grid', gap: 6 }}>
              <Row k="dataset_id" v={uploadResult.dataset_id} />
              <Row k="filename" v={uploadResult.filename} />
              <Row k="path" v={uploadResult.path} />
            </div>
          ) : null}
        </Card>

        <Card title="Retrain model">
          <div style={{ display: 'grid', gap: 12 }}>
            <label style={{ display: 'grid', gap: 6 }}>
              Dataset ID
              <input
                value={datasetId}
                onChange={(e) => setDatasetId(e.target.value)}
                placeholder={uploadResult ? String(uploadResult.dataset_id) : 'e.g. 2'}
              />
            </label>
            <button onClick={onRetrain} disabled={retraining}>
              {retraining ? 'Retraining…' : 'Retrain'}
            </button>
          </div>

          {retrainResult ? (
            <div style={{ marginTop: 12, display: 'grid', gap: 6 }}>
              <Row k="model_id" v={retrainResult.model_id} />
              <Row k="version" v={retrainResult.version} />
              <details style={{ marginTop: 6 }}>
                <summary style={{ cursor: 'pointer' }}>Show metrics JSON</summary>
                <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(retrainResult.metrics, null, 2)}</pre>
              </details>
            </div>
          ) : null}
        </Card>
      </div>

      <div style={{ marginTop: 16 }}>
        <Card title="Retrain from OULAD raw tables (paths)">
          <div style={{ display: 'grid', gap: 10 }}>
            <div className="muted" style={{ fontSize: 12 }}>
              This retrains directly from OULAD CSV tables using the notebook-aligned preprocessing. Paths must exist on the backend filesystem.
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <label style={{ display: 'grid', gap: 6 }}>
                studentInfo.csv path
                <input value={ouStudentInfoPath} onChange={(e) => setOuStudentInfoPath(e.target.value)} placeholder="/abs/path/studentInfo.csv" />
              </label>
              <label style={{ display: 'grid', gap: 6 }}>
                studentVle.csv path
                <input value={ouStudentVlePath} onChange={(e) => setOuStudentVlePath(e.target.value)} placeholder="/abs/path/studentVle.csv" />
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <label style={{ display: 'grid', gap: 6 }}>
                studentAssessment.csv path
                <input
                  value={ouStudentAssessmentPath}
                  onChange={(e) => setOuStudentAssessmentPath(e.target.value)}
                  placeholder="/abs/path/studentAssessment.csv"
                />
              </label>
              <label style={{ display: 'grid', gap: 6 }}>
                assessments.csv path
                <input value={ouAssessmentsPath} onChange={(e) => setOuAssessmentsPath(e.target.value)} placeholder="/abs/path/assessments.csv" />
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              <label style={{ display: 'grid', gap: 6 }}>
                early_days
                <input value={ouEarlyDays} onChange={(e) => setOuEarlyDays(e.target.value)} />
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 24 }}>
                <input type="checkbox" checked={ouDropCodeModule} onChange={(e) => setOuDropCodeModule(e.target.checked)} />
                drop_code_module
              </label>
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button onClick={onRetrainOulad} disabled={retrainingOulad}>
                  {retrainingOulad ? 'Retraining…' : 'Retrain OULAD'}
                </button>
              </div>
            </div>

            {retrainOuladResult ? (
              <div style={{ marginTop: 12, display: 'grid', gap: 6 }}>
                <Row k="model_id" v={retrainOuladResult.model_id} />
                <Row k="version" v={retrainOuladResult.version} />
                <details style={{ marginTop: 6 }}>
                  <summary style={{ cursor: 'pointer' }}>Show metrics JSON</summary>
                  <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(retrainOuladResult.metrics, null, 2)}</pre>
                </details>
              </div>
            ) : null}
          </div>
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

