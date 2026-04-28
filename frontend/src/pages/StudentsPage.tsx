import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'

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

export function StudentsPage() {
  const [datasetId, setDatasetId] = useState<number>(2)
  const [riskLevel, setRiskLevel] = useState<RiskLevel | ''>('')
  const [codePresentation, setCodePresentation] = useState('')
  const [region, setRegion] = useState('')
  const [limit, setLimit] = useState(50)

  const [rows, setRows] = useState<StudentSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generatingId, setGeneratingId] = useState<number | null>(null)

  async function runSearch() {
    setLoading(true)
    setError(null)
    try {
      const params: any = { dataset_id: datasetId, limit }
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

  async function generateForStudent(studentId: number) {
    setGeneratingId(studentId)
    setError(null)
    try {
      await api.post(`/predictions/generate/${studentId}`)
      await runSearch()
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Failed to generate prediction')
    } finally {
      setGeneratingId(null)
    }
  }

  useEffect(() => {
    runSearch()
    
  }, [])

  return (
    <div className="page">
      <div className="pageHeader">
        <h1>Students</h1>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'end' }}>
        <label style={{ minWidth: 150 }}>
          Dataset ID
          <input
            type="number"
            value={datasetId}
            onChange={(e) => setDatasetId(Number(e.target.value))}
          />
        </label>

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

        <button onClick={runSearch} disabled={loading}>
          {loading ? 'Searching…' : 'Search'}
        </button>
      </div>
      </div>

      {error ? <p className="error">{error}</p> : null}

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
                      {!r.latest_prediction ? (
                        <button onClick={() => generateForStudent(r.student.student_id)} disabled={generatingId === r.student.student_id}>
                          {generatingId === r.student.student_id ? 'Generating…' : 'Generate'}
                        </button>
                      ) : null}
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