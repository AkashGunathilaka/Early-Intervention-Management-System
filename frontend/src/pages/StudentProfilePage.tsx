import { type FormEvent, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../lib/api'

import { Card } from '../components/ui/Card'
import { RiskBadge, type RiskLevel } from '../components/ui/RiskBadge'
import { Stat as BigStat } from '../components/ui/Stat'
import { useAuth } from '../context/AuthContext'

type Prediction = {
  prediction_id: number
  model_id: number
  risk_level: RiskLevel
  risk_score: number
  confidence_score: number
  top_factors: string | null
  prediction_date?: string
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
  prediction_id: number
  suggested_action: string
  action_status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | string
  priority_level: string
  notes: string | null
  follow_up_date: string | null
}

type StudentProfile = {
  student: Student
  latest_feature_snapshot: Snapshot | null
  latest_prediction: Prediction | null
  interventions: Intervention[]
}

type PredictionCompare = {
  latest: Prediction | null
  previous: Prediction | null
  delta_risk_score: number | null
}

type InterventionSuggestions = {
  student_id: number
  prediction_id: number
  risk_level: RiskLevel
  risk_score: number
  priority: 'low' | 'medium' | 'high' | string
  top_factors: string | null
  suggestions: string[]
}

export function StudentProfilePage() {
  const { id } = useParams()
  const studentId = Number(id)
  const { user } = useAuth()
  const isAdmin = (user?.role ?? '').toLowerCase() === 'admin'

  const [data, setData] = useState<StudentProfile | null>(null)
  const [compare, setCompare] = useState<PredictionCompare | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [suggestions, setSuggestions] = useState<InterventionSuggestions | null>(null)
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [creatingIntervention, setCreatingIntervention] = useState(false)
  const [updatingInterventionId, setUpdatingInterventionId] = useState<number | null>(null)

  const [newAction, setNewAction] = useState('')
  const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high' | string>('medium')
  const [newStatus, setNewStatus] = useState<'pending' | 'in_progress' | 'completed' | 'cancelled' | string>('pending')
  const [newNotes, setNewNotes] = useState('')
  const [newFollowUp, setNewFollowUp] = useState('') // yyyy-mm-dd

  const [editRowId, setEditRowId] = useState<number | null>(null)
  const [editStatus, setEditStatus] = useState<string>('')
  const [editPriority, setEditPriority] = useState<string>('')
  const [editNotes, setEditNotes] = useState<string>('')
  const [editFollowUp, setEditFollowUp] = useState<string>('') // yyyy-mm-dd

  const [adminEditingStudent, setAdminEditingStudent] = useState(false)
  const [savingStudent, setSavingStudent] = useState(false)
  const [deletingStudent, setDeletingStudent] = useState(false)
  const [studentRegion, setStudentRegion] = useState('')
  const [studentCodeModule, setStudentCodeModule] = useState('')
  const [studentCodePresentation, setStudentCodePresentation] = useState('')

  async function loadProfile(cancelledRef?: { cancelled: boolean }) {
    try {
      setLoading(true)
      setError(null)
      const res = await api.get<StudentProfile>(`/students/${studentId}/profile`)
      if (!cancelledRef?.cancelled) setData(res.data)
      if (!cancelledRef?.cancelled) {
        setStudentRegion(res.data.student.region ?? '')
        setStudentCodeModule(res.data.student.code_module ?? '')
        setStudentCodePresentation(res.data.student.code_presentation ?? '')
      }
      try {
        const cmp = await api.get<PredictionCompare>(`/predictions/compare/${studentId}`)
        if (!cancelledRef?.cancelled) setCompare(cmp.data)
      } catch {
        if (!cancelledRef?.cancelled) setCompare(null)
      }
    } catch (err: any) {
      if (!cancelledRef?.cancelled) setError(err?.response?.data?.detail ?? 'Failed to load profile')
    } finally {
      if (!cancelledRef?.cancelled) setLoading(false)
    }
  }

  async function saveStudentEdits(e: FormEvent) {
    e.preventDefault()
    if (!data) return
    setError(null)
    setSavingStudent(true)
    try {
      await api.put(`/students/${studentId}`, {
        region: studentRegion.trim() ? studentRegion.trim() : null,
        code_module: studentCodeModule.trim() ? studentCodeModule.trim() : null,
        code_presentation: studentCodePresentation.trim() ? studentCodePresentation.trim() : null,
      })
      setAdminEditingStudent(false)
      await loadProfile()
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Failed to update student')
    } finally {
      setSavingStudent(false)
    }
  }

  async function deleteStudent() {
    if (!window.confirm('Delete this student? This also deletes snapshots, predictions, and interventions.')) return
    setError(null)
    setDeletingStudent(true)
    try {
      await api.delete(`/students/${studentId}`)
      window.location.assign('/students')
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Failed to delete student')
    } finally {
      setDeletingStudent(false)
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

  async function loadSuggestions() {
    setLoadingSuggestions(true)
    setError(null)
    try {
      const res = await api.get<InterventionSuggestions>(`/interventions/suggestions/${studentId}`)
      setSuggestions(res.data)
    } catch (err: any) {
      setSuggestions(null)
      setError(err?.response?.data?.detail ?? 'Failed to load intervention suggestions')
    } finally {
      setLoadingSuggestions(false)
    }
  }

  async function createIntervention() {
    if (!prediction) {
      setError('Generate a prediction first (needed for interventions).')
      return
    }
    if (!newAction.trim()) {
      setError('Please enter a suggested action.')
      return
    }
    if (!newPriority.trim()) {
      setError('Please enter a priority level.')
      return
    }

    setCreatingIntervention(true)
    setError(null)
    try {
      const payload = {
        student_id: studentId,
        prediction_id: prediction.prediction_id,
        suggested_action: newAction.trim(),
        action_status: newStatus,
        priority_level: newPriority,
        notes: newNotes.trim() ? newNotes.trim() : null,
        follow_up_date: newFollowUp ? newFollowUp : null,
      }
      await api.post('/interventions/', payload)
      setNewAction('')
      setNewNotes('')
      setNewFollowUp('')
      await loadProfile()
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Failed to create intervention')
    } finally {
      setCreatingIntervention(false)
    }
  }

  async function saveInterventionUpdate(interventionId: number) {
    setUpdatingInterventionId(interventionId)
    setError(null)
    try {
      const payload: any = {
        action_status: editStatus || undefined,
        priority_level: editPriority || undefined,
        notes: editNotes.trim() ? editNotes.trim() : null,
        follow_up_date: editFollowUp ? editFollowUp : null,
      }
      await api.put(`/interventions/${interventionId}`, payload)
      setEditRowId(null)
      await loadProfile()
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Failed to update intervention')
    } finally {
      setUpdatingInterventionId(null)
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
    setSuggestions(null)
    setCompare(null)

    return () => {
      ref.cancelled = true
    }
  }, [studentId])

  const prediction = data?.latest_prediction ?? null
  const snapshot = data?.latest_feature_snapshot ?? null

  return (
    <div className="page" style={{ maxWidth: 1100 }}>
      <div className="pageHeader">
        <div>
          <h1>Student Profile</h1>
          <div className="pageHeaderLinks" style={{ marginTop: 8 }}>
            <Link className="pill" to="/students">
              ← Back to search
            </Link>
            <Link className="pill" to={`/students/${studentId}/predictions`}>
              Prediction history
            </Link>
            <Link className="pill" to={`/students/${studentId}/snapshots`}>
              Feature snapshots
            </Link>
          </div>
        </div>

        {!loading && data && !prediction ? (
          <button onClick={generatePrediction} disabled={generating}>
            {generating ? 'Generating…' : 'Generate prediction'}
          </button>
        ) : null}
      </div>

      {loading ? <p>Loading…</p> : null}
      {error ? <p className="error">{error}</p> : null}

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
                    <div className="muted" style={{ fontSize: 12 }}>
                      model_id: {prediction.model_id}
                      {compare?.previous ? (
                        <>
                          {' '}
                          • Δ score {compare.delta_risk_score !== null ? (compare.delta_risk_score >= 0 ? '+' : '') + compare.delta_risk_score.toFixed(3) : '-'}
                        </>
                      ) : null}
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginTop: 12 }}>
                    <BigStat label="Risk score" value={prediction.risk_score.toFixed(3)} />
                    <BigStat label="Confidence" value={prediction.confidence_score.toFixed(3)} />
                  </div>
                  {compare?.previous ? (
                    <div className="muted" style={{ marginTop: 10 }}>
                      Previous: <strong>{compare.previous.risk_level}</strong> ({compare.previous.risk_score.toFixed(3)})
                    </div>
                  ) : null}
                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontSize: 12, color: 'var(--text)' }}>Top factors</div>
                    <div style={{ marginTop: 8 }}>
                      <TopFactors value={prediction.top_factors} />
                    </div>
                  </div>
                </>
              ) : (
                <p className="muted">No prediction yet.</p>
              )}
            </Card>
          </div>

          {isAdmin ? (
            <Card title="Admin: edit / delete student">
              {!adminEditingStudent ? (
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  <button type="button" onClick={() => setAdminEditingStudent(true)}>
                    Edit student
                  </button>
                  <button type="button" className="danger" onClick={deleteStudent} disabled={deletingStudent}>
                    {deletingStudent ? 'Deleting…' : 'Delete student'}
                  </button>
                  <span className="muted" style={{ fontSize: 12 }}>
                    Admin only.
                  </span>
                </div>
              ) : (
                <form onSubmit={saveStudentEdits} style={{ display: 'grid', gap: 12, maxWidth: 560 }}>
                  <label style={{ display: 'grid', gap: 6 }}>
                    Region
                    <input value={studentRegion} onChange={(e) => setStudentRegion(e.target.value)} />
                  </label>
                  <label style={{ display: 'grid', gap: 6 }}>
                    Code module
                    <input value={studentCodeModule} onChange={(e) => setStudentCodeModule(e.target.value)} />
                  </label>
                  <label style={{ display: 'grid', gap: 6 }}>
                    Code presentation
                    <input value={studentCodePresentation} onChange={(e) => setStudentCodePresentation(e.target.value)} />
                  </label>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <button type="submit" disabled={savingStudent}>
                      {savingStudent ? 'Saving…' : 'Save'}
                    </button>
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => {
                        setAdminEditingStudent(false)
                        setStudentRegion(data.student.region ?? '')
                        setStudentCodeModule(data.student.code_module ?? '')
                        setStudentCodePresentation(data.student.code_presentation ?? '')
                      }}
                      disabled={savingStudent}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </Card>
          ) : null}

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
              <p className="muted">No feature snapshot found.</p>
            )}
          </Card>

          <Card title="Interventions">
            <div style={{ display: 'grid', gap: 12, marginBottom: 12 }}>
              <div style={{ fontWeight: 700 }}>Create intervention</div>
              {!prediction ? (
                <div style={{ color: '#6b7280' }}>Generate a prediction first (interventions must attach to a prediction).</div>
              ) : (
                <div style={{ display: 'grid', gap: 10 }}>
                  <label style={{ display: 'grid', gap: 6 }}>
                    Suggested action
                    <input value={newAction} onChange={(e) => setNewAction(e.target.value)} placeholder="e.g. Schedule 1:1 meeting" />
                  </label>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                    <label style={{ display: 'grid', gap: 6 }}>
                      Status
                      <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
                        <option value="pending">pending</option>
                        <option value="in_progress">in_progress</option>
                        <option value="completed">completed</option>
                        <option value="cancelled">cancelled</option>
                      </select>
                    </label>
                    <label style={{ display: 'grid', gap: 6 }}>
                      Priority
                      <select value={newPriority} onChange={(e) => setNewPriority(e.target.value)}>
                        <option value="low">low</option>
                        <option value="medium">medium</option>
                        <option value="high">high</option>
                      </select>
                    </label>
                    <label style={{ display: 'grid', gap: 6 }}>
                      Follow-up date
                      <input type="date" value={newFollowUp} onChange={(e) => setNewFollowUp(e.target.value)} />
                    </label>
                  </div>

                  <label style={{ display: 'grid', gap: 6 }}>
                    Notes (optional)
                    <textarea value={newNotes} onChange={(e) => setNewNotes(e.target.value)} rows={3} />
                  </label>

                  <button onClick={createIntervention} disabled={creatingIntervention}>
                    {creatingIntervention ? 'Creating…' : 'Create intervention'}
                  </button>
                </div>
              )}
            </div>

            {data.interventions.length ? (
              <table width="100%" cellPadding={8} style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                    <th>ID</th>
                    <th>Status</th>
                    <th>Priority</th>
                    <th>Action</th>
                    <th>Notes</th>
                    <th>Follow-up</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {data.interventions.map((i) => (
                    <tr key={i.intervention_id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td>{i.intervention_id}</td>
                      <td>
                        {editRowId === i.intervention_id ? (
                          <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)}>
                            <option value="pending">pending</option>
                            <option value="in_progress">in_progress</option>
                            <option value="completed">completed</option>
                            <option value="cancelled">cancelled</option>
                          </select>
                        ) : (
                          i.action_status
                        )}
                      </td>
                      <td>
                        {editRowId === i.intervention_id ? (
                          <select value={editPriority} onChange={(e) => setEditPriority(e.target.value)}>
                            <option value="low">low</option>
                            <option value="medium">medium</option>
                            <option value="high">high</option>
                          </select>
                        ) : (
                          i.priority_level
                        )}
                      </td>
                      <td style={{ maxWidth: 360 }}>
                        <div style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>{i.suggested_action}</div>
                      </td>
                      <td>
                        {editRowId === i.intervention_id ? (
                          <textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={2} />
                        ) : (
                          i.notes ?? '-'
                        )}
                      </td>
                      <td>
                        {editRowId === i.intervention_id ? (
                          <input type="date" value={editFollowUp} onChange={(e) => setEditFollowUp(e.target.value)} />
                        ) : (
                          i.follow_up_date ? String(i.follow_up_date).slice(0, 10) : '-'
                        )}
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {editRowId === i.intervention_id ? (
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={() => saveInterventionUpdate(i.intervention_id)} disabled={updatingInterventionId === i.intervention_id}>
                              {updatingInterventionId === i.intervention_id ? 'Saving…' : 'Save'}
                            </button>
                            <button
                              onClick={() => {
                                setEditRowId(null)
                              }}
                              disabled={updatingInterventionId === i.intervention_id}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setEditRowId(i.intervention_id)
                              setEditStatus(i.action_status)
                              setEditPriority(i.priority_level)
                              setEditNotes(i.notes ?? '')
                              setEditFollowUp(i.follow_up_date ? String(i.follow_up_date).slice(0, 10) : '')
                            }}
                          >
                            Edit
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="muted">No interventions.</p>
            )}
          </Card>

          <Card title="Suggested interventions (from model + rules)">
            {!prediction ? (
              <p className="muted">Generate a prediction to get suggestions.</p>
            ) : (
              <div style={{ display: 'grid', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ fontSize: 12, color: 'var(--text)' }}>Priority</div>
                    <div style={{ fontWeight: 800 }}>{suggestions?.priority ?? '-'}</div>
                  </div>

                  <button onClick={loadSuggestions} disabled={loadingSuggestions}>
                    {loadingSuggestions ? 'Loading…' : suggestions ? 'Refresh suggestions' : 'Load suggestions'}
                  </button>
                </div>

                {suggestions ? (
                  <>
                    <div style={{ fontSize: 12, color: 'var(--text)' }}>
                      From prediction_id={suggestions.prediction_id} risk_score={Number(suggestions.risk_score).toFixed(3)}
                    </div>

                    {suggestions.suggestions?.length ? (
                      <ul style={{ margin: 0, paddingLeft: 18 }}>
                        {suggestions.suggestions.map((s, idx) => (
                          <li key={idx} style={{ margin: '6px 0' }}>
                            {s}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="muted">No suggestions returned.</div>
                    )}
                  </>
                ) : (
                  <div className="muted">Not loaded yet.</div>
                )}
              </div>
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
      <div style={{ color: 'var(--text)', fontSize: 12 }}>{k}</div>
      <div style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>{v}</div>
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="stat">
      <div className="statLabel">{label}</div>
      <div className="statValue" style={{ fontSize: 22 }}>
        {value}
      </div>
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
  if (!value) return <div className="muted">-</div>

  const parsed = parseTopFactors(value)
  if (parsed === null) {
    return (
      <div className="muted" style={{ whiteSpace: 'pre-wrap' }}>
        {value}
      </div>
    )
  }
  if (parsed.length === 0) {
    return <div className="muted">-</div>
  }

  return (
    <table width="100%" cellPadding={8} style={{ borderCollapse: 'collapse' }}>
      <thead>
        <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
          <th>Feature</th>
          <th>Value</th>
          <th>Importance</th>
        </tr>
      </thead>
      <tbody>
        {parsed.map((r) => (
          <tr key={r.feature} style={{ borderBottom: '1px solid var(--border)' }}>
            <td style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>{r.feature}</td>
            <td>{Number.isFinite(r.value) ? r.value.toFixed(2) : '-'}</td>
            <td>{Number.isFinite(r.importance) ? r.importance.toFixed(4) : '-'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

