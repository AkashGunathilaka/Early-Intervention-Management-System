import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import { Card } from '../components/ui/Card'
import { PageHeader } from '../components/ui/PageHeader'
import { fmt } from '../lib/format'
import type { FeatureSnapshotRow } from '../types/featureSnapshot'

// Shows all saved feature snapshots for a single student
// the profile page only shows a small preview so this gives the full history

// this value only exists when the snapshot was created from imported training data
function formatAtRiskLabel(v: unknown): string {
  if (v === null || v === undefined) return '—'
  if (typeof v === 'string' && v.trim() === '') return '—'
  const n = Number(v)
  if (!Number.isFinite(n)) return '—'
  return String(n)
}

export function StudentSnapshotsPage() {
  const { id } = useParams()
  const studentId = Number(id)

  const [rows, setRows] = useState<FeatureSnapshotRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

 // reload the snapshots whenever the student changes
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
        const res = await api.get<FeatureSnapshotRow[]>(`/feature-snapshots/student/${studentId}`)
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

  const cellStyle: CSSProperties = {
    padding: '4px 8px',
    fontSize: 12,
    whiteSpace: 'nowrap',
    verticalAlign: 'middle',
  }

  const thStyle: CSSProperties = {
    ...cellStyle,
    fontWeight: 600,
    borderBottom: '1px solid var(--border)',
    textAlign: 'left',
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow="Student"
        title="Feature snapshot history"
        lead={`Engineered inputs over time for student #${studentId}.`}
      >
        <div className="pageHeaderLinks">
          <Link className="pill" to={`/students/${studentId}`}>← Back to profile</Link>
          <Link className="pill" to="/students">Back to search</Link>
        </div>
      </PageHeader>

      {loading ? <p>Loading…</p> : null}
      {error ? <p className="error">{error}</p> : null}

      <div style={{ marginTop: 16 }}>
        <Card title={`Snapshots for student_id=${studentId}`}>
          <p className="muted" style={{ fontSize: 12, margin: '0 0 10px', lineHeight: 1.45 }}>
            <strong>at_risk_label</strong> is only stored when the snapshot came from imported training data (CSV column{' '}
            <code style={{ fontSize: 11 }}>at_risk_label</code>). Snapshots created from the student profile leave it unset
            (shown as —).
          </p>
          {rows.length ? (
            <div
              style={{
                overflowX: 'auto',
                maxWidth: '100%',
                borderRadius: 6,
                border: '1px solid var(--border)',
              }}
            >
              <table style={{ borderCollapse: 'collapse', width: 'max-content', minWidth: 0 }}>
                <thead>
                  <tr>
                    <th style={thStyle}>feature_id</th>
                    <th style={thStyle}>days</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>total_clicks</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>avg_clicks</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>vle_records</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>avg_score</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>total_score</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>assessments</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>avg_weight</th>
                    <th
                      style={thStyle}
                      title="0 = low risk, 1 = at risk in training data; empty when not provided"
                    >
                      at_risk
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows
                    .slice()
                    .sort((a, b) => (a.feature_id < b.feature_id ? 1 : -1))
                    .map((s) => (
                      <tr key={s.feature_id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ ...cellStyle, fontFamily: 'ui-monospace, monospace' }}>{s.feature_id}</td>
                        <td style={cellStyle}>{s.days_from_start ?? '—'}</td>
                        <td style={{ ...cellStyle, textAlign: 'right', fontFamily: 'ui-monospace, monospace' }}>
                          {fmt(s.total_clicks, 0)}
                        </td>
                        <td style={{ ...cellStyle, textAlign: 'right', fontFamily: 'ui-monospace, monospace' }}>
                          {fmt(s.avg_clicks, 2)}
                        </td>
                        <td style={{ ...cellStyle, textAlign: 'right', fontFamily: 'ui-monospace, monospace' }}>
                          {s.vle_records}
                        </td>
                        <td style={{ ...cellStyle, textAlign: 'right', fontFamily: 'ui-monospace, monospace' }}>
                          {fmt(s.avg_score, 2)}
                        </td>
                        <td style={{ ...cellStyle, textAlign: 'right', fontFamily: 'ui-monospace, monospace' }}>
                          {fmt(s.total_score, 2)}
                        </td>
                        <td style={{ ...cellStyle, textAlign: 'right', fontFamily: 'ui-monospace, monospace' }}>
                          {s.assessment_count}
                        </td>
                        <td style={{ ...cellStyle, textAlign: 'right', fontFamily: 'ui-monospace, monospace' }}>
                          {fmt(s.avg_weight, 2)}
                        </td>
                        <td style={{ ...cellStyle, fontFamily: 'ui-monospace, monospace' }}>{formatAtRiskLabel(s.at_risk_label)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="muted">No feature snapshots for this student.</p>
          )}
        </Card>
      </div>
    </div>
  )
}
