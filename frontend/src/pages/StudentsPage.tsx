import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { useDataset } from '../context/DatasetContext'

import { RiskBadge, type RiskLevel } from '../components/ui/RiskBadge'

type Prediction = {
  risk_level: RiskLevel
  risk_score: number
}

type Student = {
  student_id: number
  dataset_id: number
  code_presentation: string | null
  region: string | null
}

type StudentSearchResult = {
  student: Student
  latest_prediction: Prediction | null
}

type CreateWithFeaturesPayload = {
  student: {
    dataset_id: number
    code_module: string
    code_presentation: string
    gender: string
    region: string
    highest_education: string
    imd_band: string
    age_band: string
    num_of_prev_attempts: number
    studied_credits: number
    disability: string
  }
  days_from_start: number
  total_clicks: number
  avg_clicks: number
  vle_records: number
  avg_score: number
  total_score: number
  assessment_count: number
  avg_weight: number
  at_risk_label: number | null
  generate_prediction: boolean
}

type CreateWithFeaturesResponse = {
  student: { student_id: number }
  feature_snapshot: { feature_id: number }
  prediction: { prediction_id: number } | null
}

type Dataset = {
  dataset_id: number
  dataset_name: string
  source_type: string
  status: string
}

export function StudentsPage() {
  const nav = useNavigate()
  const { user } = useAuth()
  const { datasetId, setDatasetId } = useDataset()
  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [loadingDatasets, setLoadingDatasets] = useState(false)
  const [newDatasetName, setNewDatasetName] = useState('')
  const [creatingDataset, setCreatingDataset] = useState(false)
  const [riskLevel, setRiskLevel] = useState<RiskLevel | ''>('')
  const [codePresentation, setCodePresentation] = useState('')
  const [region, setRegion] = useState('')
  const [limit, setLimit] = useState(50)

  const [rows, setRows] = useState<StudentSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [bulkGenerating, setBulkGenerating] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createMessage, setCreateMessage] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  // Manual student creation form (admin-only) to quickly exercise end-to-end flows
  const [cCodeModule, setCCodeModule] = useState('AAA')
  const [cCodePresentation, setCCodePresentation] = useState('2014J')
  const [cGender, setCGender] = useState('M')
  const [cRegion, setCRegion] = useState('London Region')
  const [cEducation, setCEducation] = useState('HE Qualification')
  const [cImdBand, setCImdBand] = useState('20-30%')
  const [cAgeBand, setCAgeBand] = useState('0-35')
  const [cPrevAttempts, setCPrevAttempts] = useState(0)
  const [cCredits, setCCredits] = useState(60)
  const [cDisability, setCDisability] = useState('N')

  const [fDays, setFDays] = useState(30)
  const [fTotalClicks, setFTotalClicks] = useState(30)
  const [fAvgClicks, setFAvgClicks] = useState(1)
  const [fVleRecords, setFVleRecords] = useState(10)
  const [fAvgScore, setFAvgScore] = useState(35)
  const [fTotalScore, setFTotalScore] = useState(40)
  const [fAssessments, setFAssessments] = useState(1)
  const [fAvgWeight, setFAvgWeight] = useState(50)
  const [fAtRiskLabel, setFAtRiskLabel] = useState<number | null>(null)
  const [fAutoPredict, setFAutoPredict] = useState(true)

  async function loadDatasets(): Promise<number | null> {
    setLoadingDatasets(true)
    try {
      const res = await api.get<Dataset[]>('/datasets/')
      setDatasets(res.data)
      // Keep your selection if it exists; otherwise pick the first dataset once.
      if (res.data.length) {
        const exists = datasetId != null && res.data.some((d) => d.dataset_id === datasetId)
        if (!exists) {
          const next = res.data[0].dataset_id
          setDatasetId(next)
          return next
        }
      }
      return datasetId
    } catch {
      // ignore; students page can still work with manual id
      setDatasets([])
      return datasetId
    } finally {
      setLoadingDatasets(false)
    }
  }

  async function createDataset() {
    if (!newDatasetName.trim()) {
      setError('Please enter a dataset name')
      return
    }
    setCreatingDataset(true)
    setError(null)
    try {
      const res = await api.post<Dataset>('/datasets/', { dataset_name: newDatasetName.trim(), source_type: 'manual' })
      setNewDatasetName('')
      await loadDatasets()
      setDatasetId(res.data.dataset_id)
      setCreateMessage(`Created dataset_id=${res.data.dataset_id}`)
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Failed to create dataset')
    } finally {
      setCreatingDataset(false)
    }
  }

  async function runSearch(nextDatasetId?: number) {
    const dsid = Number.isFinite(nextDatasetId as number) ? (nextDatasetId as number) : datasetId
    if (dsid == null) {
      setRows([])
      return
    }

    setLoading(true)
    setError(null)
    setCreateMessage(null)
    try {
      const params: any = { dataset_id: dsid, limit }
      if (riskLevel) params.risk_level = riskLevel
      if (codePresentation) params.code_presentation = codePresentation
      if (region) params.region = region

      const res = await api.get<StudentSearchResult[]>('/students/search', { params })
      setRows(res.data)
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Search failed')
    } finally {
      setLoading(false)
    }
  }

  async function bulkRegenerateForDataset() {
    if (datasetId == null) return
    setBulkGenerating(true)
    setError(null)
    setCreateMessage(null)
    try {
      const res = await api.post(`/predictions/generate-dataset/${datasetId}`)
      const attempted = res?.data?.attempted ?? 0
      const generated = res?.data?.generated ?? 0
      const failed = res?.data?.failed ?? 0
      setCreateMessage(`Bulk prediction run: attempted=${attempted}, generated=${generated}, failed=${failed}`)
      await runSearch()
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Failed to bulk regenerate predictions')
    } finally {
      setBulkGenerating(false)
    }
  }

  async function createStudentDemo() {
    setCreating(true)
    setError(null)
    setCreateMessage(null)

    const payload: CreateWithFeaturesPayload = {
      student: {
        dataset_id: datasetId,
        code_module: cCodeModule.trim(),
        code_presentation: cCodePresentation.trim(),
        gender: cGender.trim(),
        region: cRegion.trim(),
        highest_education: cEducation.trim(),
        imd_band: cImdBand.trim(),
        age_band: cAgeBand.trim(),
        num_of_prev_attempts: Number(cPrevAttempts),
        studied_credits: Number(cCredits),
        disability: cDisability.trim(),
      },
      days_from_start: Number(fDays),
      total_clicks: Number(fTotalClicks),
      avg_clicks: Number(fAvgClicks),
      vle_records: Number(fVleRecords),
      avg_score: Number(fAvgScore),
      total_score: Number(fTotalScore),
      assessment_count: Number(fAssessments),
      avg_weight: Number(fAvgWeight),
      at_risk_label: fAtRiskLabel,
      generate_prediction: fAutoPredict,
    }

    // basic validation for required student strings
    const requiredStrings = [
      payload.student.code_module,
      payload.student.code_presentation,
      payload.student.gender,
      payload.student.region,
      payload.student.highest_education,
      payload.student.imd_band,
      payload.student.age_band,
      payload.student.disability,
    ]
    if (requiredStrings.some((s) => !s)) {
      setError('Please fill all student fields (they are required).')
      setCreating(false)
      return
    }

    try {
      const res = await api.post<CreateWithFeaturesResponse>('/students/create-with-features', payload)
      const sid = res.data.student.student_id
      setCreateMessage(`Created student_id=${sid}${res.data.prediction ? ' (prediction generated)' : ''}`)
      await runSearch()
      nav(`/students/${sid}`)
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Failed to create student')
    } finally {
      setCreating(false)
    }
  }

  useEffect(() => {
    ;(async () => {
      const dsid = await loadDatasets()
      if (dsid != null) await runSearch(dsid)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="page">
      <div className="pageHeader">
        <h1>Students</h1>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'end' }}>
        <label style={{ minWidth: 260 }}>
          Dataset
          {datasets.length ? (
            <select
              value={datasetId ?? ''}
              onChange={async (e) => {
                const next = Number(e.target.value)
                setDatasetId(next)
                await runSearch(next)
              }}
              disabled={loadingDatasets}
            >
              {datasets.map((d) => (
                <option key={d.dataset_id} value={d.dataset_id}>
                  {d.dataset_id} — {d.dataset_name} ({d.source_type})
                </option>
              ))}
            </select>
          ) : (
            <input
              type="number"
              value={datasetId ?? ''}
              onChange={async (e) => {
                const next = Number(e.target.value)
                setDatasetId(next)
                await runSearch(next)
              }}
            />
          )}
        </label>

        {user?.role === 'admin' ? (
          <label style={{ minWidth: 260 }}>
            Create dataset (admin)
            <div style={{ display: 'flex', gap: 10 }}>
              <input value={newDatasetName} onChange={(e) => setNewDatasetName(e.target.value)} placeholder="e.g. Demo Cohort A" />
              <button type="button" onClick={createDataset} disabled={creatingDataset}>
                {creatingDataset ? 'Creating…' : 'Create'}
              </button>
            </div>
          </label>
        ) : null}

        <label style={{ minWidth: 160 }}>
          Risk level
          <select
            value={riskLevel}
            onChange={(e) => setRiskLevel(e.target.value as any)}
          >
            <option value="">All</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </label>

        <label style={{ minWidth: 220 }}>
          Region
          <input value={region} onChange={(e) => setRegion(e.target.value)} placeholder="e.g. London Region" />
        </label>

        <label style={{ minWidth: 200 }}>
          Presentation
          <input
            value={codePresentation}
            onChange={(e) => setCodePresentation(e.target.value)}
            placeholder="e.g. 2014J"
          />
        </label>

        <label style={{ minWidth: 120 }}>
          Limit
          <input
            type="number"
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
          />
        </label>

        <button onClick={() => runSearch()} disabled={loading}>
          {loading ? 'Searching…' : 'Search'}
        </button>

        {user?.role === 'admin' ? (
          <button onClick={bulkRegenerateForDataset} disabled={bulkGenerating || datasetId == null}>
            {bulkGenerating ? 'Regenerating…' : 'Bulk regenerate predictions'}
          </button>
        ) : null}
      </div>
      </div>

      {error ? <p className="error">{error}</p> : null}
      {createMessage ? <p className="success">{createMessage}</p> : null}

      {user?.role === 'admin' ? (
        <div className="card" style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <div>
              <h2 style={{ margin: 0 }}>Create student (manual entry)</h2>
              <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
                Creates a student + feature snapshot, and can auto-generate a prediction using the active model.
              </div>
            </div>
            <button onClick={() => setShowCreate((s) => !s)}>{showCreate ? 'Hide' : 'Show'}</button>
          </div>

          {showCreate ? (
            <div style={{ display: 'grid', gap: 16, marginTop: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="card" style={{ boxShadow: 'none' }}>
                  <h2 style={{ margin: 0 }}>Student info</h2>
                  <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
                    <label style={{ display: 'grid', gap: 6 }}>
                      Dataset ID
                      <input type="number" value={datasetId} onChange={(e) => setDatasetId(Number(e.target.value))} />
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <label style={{ display: 'grid', gap: 6 }}>
                        code_module
                        <input value={cCodeModule} onChange={(e) => setCCodeModule(e.target.value)} />
                      </label>
                      <label style={{ display: 'grid', gap: 6 }}>
                        code_presentation
                        <input value={cCodePresentation} onChange={(e) => setCCodePresentation(e.target.value)} />
                      </label>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <label style={{ display: 'grid', gap: 6 }}>
                        gender
                        <input value={cGender} onChange={(e) => setCGender(e.target.value)} />
                      </label>
                      <label style={{ display: 'grid', gap: 6 }}>
                        disability
                        <input value={cDisability} onChange={(e) => setCDisability(e.target.value)} placeholder="Y/N" />
                      </label>
                    </div>
                    <label style={{ display: 'grid', gap: 6 }}>
                      region
                      <input value={cRegion} onChange={(e) => setCRegion(e.target.value)} />
                    </label>
                    <label style={{ display: 'grid', gap: 6 }}>
                      highest_education
                      <input value={cEducation} onChange={(e) => setCEducation(e.target.value)} />
                    </label>
                    <label style={{ display: 'grid', gap: 6 }}>
                      imd_band
                      <input value={cImdBand} onChange={(e) => setCImdBand(e.target.value)} />
                    </label>
                    <label style={{ display: 'grid', gap: 6 }}>
                      age_band
                      <input value={cAgeBand} onChange={(e) => setCAgeBand(e.target.value)} />
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <label style={{ display: 'grid', gap: 6 }}>
                        num_of_prev_attempts
                        <input type="number" value={cPrevAttempts} onChange={(e) => setCPrevAttempts(Number(e.target.value))} />
                      </label>
                      <label style={{ display: 'grid', gap: 6 }}>
                        studied_credits
                        <input type="number" value={cCredits} onChange={(e) => setCCredits(Number(e.target.value))} />
                      </label>
                    </div>
                  </div>
                </div>

                <div className="card" style={{ boxShadow: 'none' }}>
                  <h2 style={{ margin: 0 }}>Feature snapshot (engineered inputs)</h2>
                  <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <label style={{ display: 'grid', gap: 6 }}>
                        days_from_start
                        <input type="number" value={fDays} onChange={(e) => setFDays(Number(e.target.value))} />
                      </label>
                      <label style={{ display: 'grid', gap: 6 }}>
                        assessment_count
                        <input type="number" value={fAssessments} onChange={(e) => setFAssessments(Number(e.target.value))} />
                      </label>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <label style={{ display: 'grid', gap: 6 }}>
                        total_clicks
                        <input type="number" value={fTotalClicks} onChange={(e) => setFTotalClicks(Number(e.target.value))} />
                      </label>
                      <label style={{ display: 'grid', gap: 6 }}>
                        avg_clicks
                        <input type="number" value={fAvgClicks} onChange={(e) => setFAvgClicks(Number(e.target.value))} />
                      </label>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <label style={{ display: 'grid', gap: 6 }}>
                        vle_records
                        <input type="number" value={fVleRecords} onChange={(e) => setFVleRecords(Number(e.target.value))} />
                      </label>
                      <label style={{ display: 'grid', gap: 6 }}>
                        avg_weight
                        <input type="number" value={fAvgWeight} onChange={(e) => setFAvgWeight(Number(e.target.value))} />
                      </label>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <label style={{ display: 'grid', gap: 6 }}>
                        avg_score
                        <input type="number" value={fAvgScore} onChange={(e) => setFAvgScore(Number(e.target.value))} />
                      </label>
                      <label style={{ display: 'grid', gap: 6 }}>
                        total_score
                        <input type="number" value={fTotalScore} onChange={(e) => setFTotalScore(Number(e.target.value))} />
                      </label>
                    </div>
                    <label style={{ display: 'grid', gap: 6 }}>
                      at_risk_label (optional)
                      <input
                        type="number"
                        value={fAtRiskLabel ?? ''}
                        onChange={(e) => setFAtRiskLabel(e.target.value === '' ? null : Number(e.target.value))}
                        placeholder="leave blank"
                      />
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                      <input type="checkbox" checked={fAutoPredict} onChange={(e) => setFAutoPredict(e.target.checked)} />
                      Auto-generate prediction
                    </label>

                    <button onClick={createStudentDemo} disabled={creating}>
                      {creating ? 'Creating…' : 'Create student'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <div style={{ marginTop: 16 }}>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table cellPadding={8} style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                <th>ID</th>
                <th>Dataset</th>
                <th>Region</th>
                <th>Presentation</th>
                <th>Risk</th>
                <th>Score</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.student.student_id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td>{r.student.student_id}</td>
                  <td>{r.student.dataset_id}</td>
                  <td>{r.student.region ?? '-'}</td>
                  <td>{r.student.code_presentation ?? '-'}</td>
                  <td>{r.latest_prediction ? <RiskBadge level={r.latest_prediction.risk_level} /> : <span className="muted">-</span>}</td>
                  <td>{r.latest_prediction ? r.latest_prediction.risk_score.toFixed(3) : '-'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <Link to={`/students/${r.student.student_id}`}>View</Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!loading && rows.length === 0 ? <p>No results.</p> : null}
      </div>
    </div>
  )
}