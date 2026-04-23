import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../lib/api'

import { Card } from '../components/ui/Card'
import { RiskBadge, type RiskLevel } from '../components/ui/RiskBadge'

type Prediction = {
  prediction_id: number
  model_id: number
  risk_level: RiskLevel
  risk_score: number
  confidence_score: number
  top_factors: string | null
}

type Snapshot = {
  feature_id: number
  total_clicks: number
  avg_clicks: number
  vle_records: number
  avg_score: number
  total_score: number
  assessment_count: number
  avg_weight: number
}

type Student = {
  student_id: number
  dataset_id: number
  code_module: string | null
  code_presentation: string | null
  region: string | null
}

type Intervention = {
  intervention_id: number
  action_status: string
  intervention_type: string
  notes: string | null
}

type StudentProfile = {
  student: Student
  latest_feature_snapshot: Snapshot | null
  latest_prediction: Prediction | null
  interventions: Intervention[]
}

export function StudentProfilePage() {
  const { id } = useParams()
  const studentId = Number(id)

  const [data, setData] = useState<StudentProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)

  async function loadProfile(cancelledRef?: { cancelled: boolean }) {
    try {
      setLoading(true)
      setError(null)
      const res = await api.get<StudentProfile>(`/students/${studentId}/profile`)
      if (!cancelledRef?.cancelled) setData(res.data)
    } catch (err: any) {
      if (!cancelledRef?.cancelled) setError(err?.response?.data?.detail ?? 'Failed to load profile')
    } finally {
      if (!cancelledRef?.cancelled) setLoading(false)
    }
  }

  async function generatePrediction() {
    setGenerating(true)
    setError(null)
    try {
      await api.post(`/predictions/generate/${studentId}`)
      await loadProfile()
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Failed to generate prediction')
    } finally {
      setGenerating(false)
    }
  }

  useEffect(() => {
    if (!Number.isFinite(studentId)) {
      setError('Invalid student id')
      setLoading(false)
      return
    }

    const ref = { cancelled: false }
    loadProfile(ref)

    return () => {
      ref.cancelled = true
    }
  }, [studentId])

  const prediction = data?.latest_prediction ?? null
  const snapshot = data?.latest_feature_snapshot ?? null

  return (
    <div style={{ maxWidth: 1000, margin: '32px auto', padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0 }}>Student Profile</h1>
          <div style={{ marginTop: 6 }}>
            <Link to="/students">← Back to search</Link>
          </div>
        </div>

        {!loading && data && !prediction ? (
          <button onClick={generatePrediction} disabled={generating}>
            {generating ? 'Generating…' : 'Generate prediction'}
          </button>
        ) : null}
      </div>

      {loading ? <p>Loading…</p> : null}
      {error ? <p style={{ color: 'crimson' }}>{error}</p> : null}

      {data ? (
        <div style={{ display: 'grid', gap: 16, marginTop: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Card title="Student">
              <KeyValue k="student_id" v={data.student.student_id} />
              <KeyValue k="dataset_id" v={data.student.dataset_id} />
              <KeyValue k="region" v={data.student.region ?? '-'} />
              <KeyValue k="code_module" v={data.student.code_module ?? '-'} />
              <KeyValue k="code_presentation" v={data.student.code_presentation ?? '-'} />
            </Card>

            <Card title="Latest Prediction">
              {prediction ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <RiskBadge level={prediction.risk_level} showSuffix />
                    <div style={{ color: '#6b7280', fontSize: 12 }}>model_id: {prediction.model_id}</div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginTop: 12 }}>
                    <Stat label="Risk score" value={prediction.risk_score.toFixed(3)} />
                    <Stat label="Confidence" value={prediction.confidence_score.toFixed(3)} />
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>Top factors</div>
                    <div style={{ marginTop: 8 }}>
                      <TopFactors value={prediction.top_factors} />
                    </div>
                  </div>
                </>
              ) : (
                <p style={{ margin: 0, color: '#6b7280' }}>No prediction yet.</p>
              )}
            </Card>
          </div>

          <Card title="Latest Feature Snapshot">
            {snapshot ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                <MiniStat label="Total clicks" value={snapshot.total_clicks} />
                <MiniStat label="Avg clicks" value={snapshot.avg_clicks} />
                <MiniStat label="VLE records" value={snapshot.vle_records} />
                <MiniStat label="Avg score" value={snapshot.avg_score} />
                <MiniStat label="Total score" value={snapshot.total_score} />
                <MiniStat label="Assessments" value={snapshot.assessment_count} />
                <MiniStat label="Avg weight" value={snapshot.avg_weight} />
                <MiniStat label="feature_id" value={snapshot.feature_id} />
              </div>
            ) : (
              <p style={{ margin: 0, color: '#6b7280' }}>No feature snapshot found.</p>
            )}
          </Card>

          <Card title="Interventions">
            {data.interventions.length ? (
              <table width="100%" cellPadding={8} style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>
                    <th>ID</th>
                    <th>Status</th>
                    <th>Type</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {data.interventions.map((i) => (
                    <tr key={i.intervention_id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td>{i.intervention_id}</td>
                      <td>{i.action_status}</td>
                      <td>{i.intervention_type}</td>
                      <td>{i.notes ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p style={{ margin: 0, color: '#6b7280' }}>No interventions.</p>
            )}
          </Card>
        </div>
      ) : null}
    </div>
  )
}

function KeyValue({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '6px 0' }}>
      <div style={{ color: '#6b7280', fontSize: 12 }}>{k}</div>
      <div style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>{v}</div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ border: '1px solid #f3f4f6', borderRadius: 10, padding: 10 }}>
      <div style={{ fontSize: 12, color: '#6b7280' }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700 }}>{value}</div>
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ border: '1px solid #f3f4f6', borderRadius: 10, padding: 10 }}>
      <div style={{ fontSize: 12, color: '#6b7280' }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700 }}>{value}</div>
    </div>
  )
}

type TopFactorRow = {
  feature: string
  value: number
  importance: number
}

function parseTopFactors(input: string): TopFactorRow[] | null {
  const trimmed = input.trim()
  if (!trimmed) return []
  if (
    trimmed.toLowerCase().includes('unavailable') ||
    trimmed.toLowerCase().includes('failed') ||
    trimmed.toLowerCase().includes('no non-zero')
  ) {
    return null
  }

  const parts = trimmed
    .split(';')
    .map((p) => p.trim())
    .filter(Boolean)

  const rows: TopFactorRow[] = []
  for (const part of parts) {
    // Example format:
    // total_clicks (value=123.00, importance=0.0123)
    const m = part.match(/^(.+?)\s*\(value=([-0-9.]+),\s*importance=([-0-9.]+)\)$/)
    if (!m) continue
    rows.push({
      feature: m[1].trim(),
      value: Number(m[2]),
      importance: Number(m[3]),
    })
  }

  return rows.length ? rows : null
}

function TopFactors({ value }: { value: string | null }) {
  if (!value) return <div style={{ color: '#6b7280' }}>-</div>

  const parsed = parseTopFactors(value)
  if (parsed === null) {
    return <div style={{ color: '#6b7280', whiteSpace: 'pre-wrap' }}>{value}</div>
  }
  if (parsed.length === 0) {
    return <div style={{ color: '#6b7280' }}>-</div>
  }

  return (
    <table width="100%" cellPadding={8} style={{ borderCollapse: 'collapse' }}>
      <thead>
        <tr style={{ textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>
          <th>Feature</th>
          <th>Value</th>
          <th>Importance</th>
        </tr>
      </thead>
      <tbody>
        {parsed.map((r) => (
          <tr key={r.feature} style={{ borderBottom: '1px solid #f3f4f6' }}>
            <td style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>{r.feature}</td>
            <td>{Number.isFinite(r.value) ? r.value.toFixed(2) : '-'}</td>
            <td>{Number.isFinite(r.importance) ? r.importance.toFixed(4) : '-'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

