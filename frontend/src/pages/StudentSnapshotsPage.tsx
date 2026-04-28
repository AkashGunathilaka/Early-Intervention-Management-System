import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import { Card } from '../components/ui/Card'

type Snapshot = {
  feature_id: number
  student_id: number
  days_from_start: number
  total_clicks: number
  avg_clicks: number
  vle_records: number
  avg_score: number
  total_score: number
  assessment_count: number
  avg_weight: number
  at_risk_label: number | null
}

function fmt(n: any, digits = 2) {
  const num = Number(n)
  if (!Number.isFinite(num)) return '-'
  return num.toFixed(digits)
}

export function StudentSnapshotsPage() {
  const { id } = useParams()
  const studentId = Number(id)

  const [rows, setRows] = useState<Snapshot[]>([])
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
        const res = await api.get<Snapshot[]>(`/feature-snapshots/student/${studentId}`)
        if (!cancelled) setRows(res.data)
      } catch (err: any) {
        if (!cancelled) setError(err?.response?.data?.detail ?? 'Failed to load feature snapshot history')
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
          <h1>Feature snapshot history</h1>
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
        <Card title={`Snapshots for student_id=${studentId}`}>
          {rows.length ? (
            <table width="100%" cellPadding={8} style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                  <th>feature_id</th>
                  <th>days</th>
                  <th>total_clicks</th>
                  <th>avg_clicks</th>
                  <th>vle_records</th>
                  <th>avg_score</th>
                  <th>total_score</th>
                  <th>assessments</th>
                  <th>avg_weight</th>
                  <th>at_risk_label</th>
                </tr>
              </thead>
              <tbody>
                {rows
                  .slice()
                  .sort((a, b) => (a.feature_id < b.feature_id ? 1 : -1))
                  .map((s) => (
                    <tr key={s.feature_id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td>{s.feature_id}</td>
                      <td>{s.days_from_start}</td>
                      <td>{fmt(s.total_clicks, 0)}</td>
                      <td>{fmt(s.avg_clicks, 2)}</td>
                      <td>{s.vle_records}</td>
                      <td>{fmt(s.avg_score, 2)}</td>
                      <td>{fmt(s.total_score, 2)}</td>
                      <td>{s.assessment_count}</td>
                      <td>{fmt(s.avg_weight, 2)}</td>
                      <td>{s.at_risk_label ?? '-'}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          ) : (
            <p className="muted">No feature snapshots for this student.</p>
          )}
        </Card>
      </div>
    </div>
  )
}

