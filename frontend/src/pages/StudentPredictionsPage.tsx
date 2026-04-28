import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import { Card } from '../components/ui/Card'
import { RiskBadge, type RiskLevel } from '../components/ui/RiskBadge'

type Prediction = {
  prediction_id: number
  student_id: number
  feature_id: number
  model_id: number
  risk_score: number
  predicted_label: number
  risk_level: RiskLevel
  confidence_score: number | null
  top_factors: string | null
  prediction_date: string
}

export function StudentPredictionsPage() {
  const { id } = useParams()
  const studentId = Number(id)

  const [rows, setRows] = useState<Prediction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!Number.isFinite(studentId)) {
      setError('Invalid student id')
      setLoading(false)
      return
    }

    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        setError(null)
        const res = await api.get<Prediction[]>(`/predictions/student/${studentId}`)
        if (!cancelled) setRows(res.data)
      } catch (err: any) {
        if (!cancelled) setError(err?.response?.data?.detail ?? 'Failed to load prediction history')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [studentId])

  return (
    <div className="page">
      <div className="pageHeader">
        <div>
          <h1>Prediction history</h1>
          <div className="pageHeaderLinks" style={{ marginTop: 8 }}>
            <Link className="pill" to={`/students/${studentId}`}>
              ← Back to profile
            </Link>
            <Link className="pill" to="/students">
              Back to search
            </Link>
          </div>
        </div>
      </div>

      {loading ? <p>Loading…</p> : null}
      {error ? <p className="error">{error}</p> : null}

      <div style={{ marginTop: 16 }}>
        <Card title={`Predictions for student_id=${studentId}`}>
          {rows.length ? (
            <table width="100%" cellPadding={8} style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                  <th>ID</th>
                  <th>Date</th>
                  <th>Risk</th>
                  <th>Risk score</th>
                  <th>Confidence</th>
                  <th>model_id</th>
                </tr>
              </thead>
              <tbody>
                {rows
                  .slice()
                  .sort((a, b) => (a.prediction_id < b.prediction_id ? 1 : -1))
                  .map((p) => (
                    <tr key={p.prediction_id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td>{p.prediction_id}</td>
                      <td>{p.prediction_date ? String(p.prediction_date).replace('T', ' ').slice(0, 19) : '-'}</td>
                      <td>
                        <RiskBadge level={p.risk_level} showSuffix />
                      </td>
                      <td>{Number.isFinite(p.risk_score) ? p.risk_score.toFixed(3) : '-'}</td>
                      <td>{p.confidence_score != null ? Number(p.confidence_score).toFixed(3) : '-'}</td>
                      <td>{p.model_id}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          ) : (
            <p className="muted">No predictions for this student.</p>
          )}
        </Card>
      </div>
    </div>
  )
}

