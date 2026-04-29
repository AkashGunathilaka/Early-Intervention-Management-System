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
  days_from_start?: number
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

type FeatureAverages = {
  dataset_id: number
  days_from_start: number
  n_snapshots: number
  averages: Record<string, number>
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
  const [featureAverages, setFeatureAverages] = useState<FeatureAverages | null>(null)
  const [snapshotHistory, setSnapshotHistory] = useState<Snapshot[]>([])
  const [predictionHistory, setPredictionHistory] = useState<Prediction[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  const [creatingSnapshot, setCreatingSnapshot] = useState(false)
  const [snapDays, setSnapDays] = useState<number>(30)
  const [snapTotalClicks, setSnapTotalClicks] = useState<number>(0)
  const [snapAvgClicks, setSnapAvgClicks] = useState<number>(0)
  const [snapVleRecords, setSnapVleRecords] = useState<number>(0)
  const [snapAvgScore, setSnapAvgScore] = useState<number>(0)
  const [snapTotalScore, setSnapTotalScore] = useState<number>(0)
  const [snapAssessmentCount, setSnapAssessmentCount] = useState<number>(0)
  const [snapAvgWeight, setSnapAvgWeight] = useState<number>(0)
  const [snapAutoPredict, setSnapAutoPredict] = useState<boolean>(true)

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

  async function loadHistory(cancelledRef?: { cancelled: boolean }) {
    setLoadingHistory(true)
    try {
      const [snapRes, predRes] = await Promise.all([
        api.get<Snapshot[]>(`/feature-snapshots/student/${studentId}`),
        api.get<Prediction[]>(`/predictions/student/${studentId}`),
      ])
      if (cancelledRef?.cancelled) return
      // newest first
      setSnapshotHistory(snapRes.data.slice().sort((a, b) => (a.feature_id < b.feature_id ? 1 : -1)))
      setPredictionHistory(predRes.data.slice().sort((a, b) => (a.prediction_id < b.prediction_id ? 1 : -1)))
    } catch {
      if (!cancelledRef?.cancelled) {
        setSnapshotHistory([])
        setPredictionHistory([])
      }
    } finally {
      if (!cancelledRef?.cancelled) setLoadingHistory(false)
    }
  }

  async function createSnapshot() {
    setCreatingSnapshot(true)
    setError(null)
    try {
      if (latestDays != null && snapDays < latestDays) {
        setError(`days_from_start must be ≥ ${latestDays}`)
        return
      }
      await api.post('/feature-snapshots/', {
        student_id: studentId,
        days_from_start: snapDays,
        total_clicks: snapTotalClicks,
        avg_clicks: snapAvgClicks,
        vle_records: snapVleRecords,
        avg_score: snapAvgScore,
        total_score: snapTotalScore,
        assessment_count: snapAssessmentCount,
        avg_weight: snapAvgWeight,
        at_risk_label: null,
      })

      if (snapAutoPredict) {
        await api.post(`/predictions/generate/${studentId}`)
      }

      await loadProfile()
      await loadHistory()
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Failed to create feature snapshot')
    } finally {
      setCreatingSnapshot(false)
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
    setFeatureAverages(null)
    setCompare(null)
    loadHistory(ref)

    return () => {
      ref.cancelled = true
    }
  }, [studentId])

  const prediction = data?.latest_prediction ?? null
  const snapshot = data?.latest_feature_snapshot ?? null
  const latestDays = snapshot?.days_from_start ?? null

  useEffect(() => {
    if (!snapshot) {
      setFeatureAverages(null)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const res = await api.get<FeatureAverages>(`/students/${studentId}/feature-averages`)
        if (!cancelled) setFeatureAverages(res.data)
      } catch {
        if (!cancelled) setFeatureAverages(null)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [studentId, snapshot?.feature_id])

  // Prefill snapshot form from latest snapshot (so "update" is easy)
  useEffect(() => {
    if (!snapshot) return
    setSnapDays(snapshot.days_from_start ?? 30)
    setSnapTotalClicks(Number(snapshot.total_clicks ?? 0))
    setSnapAvgClicks(Number(snapshot.avg_clicks ?? 0))
    setSnapVleRecords(Number(snapshot.vle_records ?? 0))
    setSnapAvgScore(Number(snapshot.avg_score ?? 0))
    setSnapTotalScore(Number(snapshot.total_score ?? 0))
    setSnapAssessmentCount(Number(snapshot.assessment_count ?? 0))
    setSnapAvgWeight(Number(snapshot.avg_weight ?? 0))
  }, [snapshot?.feature_id])

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

        {!loading && data ? (
          <button onClick={generatePrediction} disabled={generating}>
            {generating ? 'Generating…' : prediction ? 'Regenerate prediction' : 'Generate prediction'}
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
                      <TopFactors value={prediction.top_factors} averages={featureAverages?.averages ?? null} />
                    </div>
                    {!prediction.top_factors ? (
                      <div className="muted" style={{ fontSize: 12, marginTop: 10 }}>
                        If this prediction was created via bulk generation, explanations may be empty for performance. Click{' '}
                        <strong style={{ color: 'var(--text-h)' }}>Regenerate prediction</strong> to compute SHAP top factors for this student.
                      </div>
                    ) : null}
                    {featureAverages ? (
                      <div className="muted" style={{ fontSize: 12, marginTop: 10 }}>
                        Averages: dataset_id={featureAverages.dataset_id} days={featureAverages.days_from_start} (n={featureAverages.n_snapshots})
                      </div>
                    ) : null}
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

          <Card title="Progress over time (snapshots + risk trend)">
            <div style={{ display: 'grid', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <div style={{ fontWeight: 800, marginBottom: 8 }}>Risk score trend</div>
                  {loadingHistory ? <div className="muted">Loading…</div> : null}
                  {predictionHistory.length ? (
                    <Sparkline
                      values={predictionHistory.slice().reverse().map((p) => p.risk_score)}
                      labels={predictionHistory
                        .slice()
                        .reverse()
                        .map((p) => (p.prediction_date ? String(p.prediction_date).slice(0, 10) : String(p.prediction_id)))}
                    />
                  ) : (
                    <div className="muted">No predictions yet.</div>
                  )}
                </div>
                <div>
                  <div style={{ fontWeight: 800, marginBottom: 8 }}>Feature trends (latest snapshots)</div>
                  {snapshotHistory.length ? (
                    <div style={{ display: 'grid', gap: 10 }}>
                      <MiniSpark
                        title="total_clicks"
                        values={snapshotHistory.slice().reverse().map((s) => Number(s.total_clicks ?? 0))}
                        labels={snapshotHistory.slice().reverse().map((s) => String(s.days_from_start ?? '-'))}
                      />
                      <MiniSpark
                        title="avg_score"
                        values={snapshotHistory.slice().reverse().map((s) => Number(s.avg_score ?? 0))}
                        labels={snapshotHistory.slice().reverse().map((s) => String(s.days_from_start ?? '-'))}
                      />
                    </div>
                  ) : (
                    <div className="muted">No snapshots yet.</div>
                  )}
                </div>
              </div>

              <div className="card" style={{ boxShadow: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontWeight: 800 }}>Add new snapshot</div>
                    <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
                      Save a new engineered feature snapshot for this student (e.g. day 7, 14, 30) to track progress. Optionally auto-generate a new prediction.
                    </div>
                  </div>
                  <button onClick={createSnapshot} disabled={creatingSnapshot}>
                    {creatingSnapshot ? 'Saving…' : 'Save snapshot'}
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginTop: 12 }}>
                  <label style={{ display: 'grid', gap: 6 }}>
                    days_from_start
                    <input
                      type="number"
                      value={snapDays}
                      min={latestDays != null ? latestDays : undefined}
                      onChange={(e) => {
                        const raw = Number(e.target.value)
                        const next = Number.isFinite(raw) ? raw : 0
                        setSnapDays(latestDays != null ? Math.max(latestDays, next) : next)
                      }}
                    />
                    {latestDays != null ? (
                      <div className="muted" style={{ fontSize: 12 }}>
                        Must be ≥ current {latestDays}
                      </div>
                    ) : null}
                  </label>
                  <label style={{ display: 'grid', gap: 6 }}>
                    total_clicks
                    <input type="number" value={snapTotalClicks} onChange={(e) => setSnapTotalClicks(Number(e.target.value))} />
                  </label>
                  <label style={{ display: 'grid', gap: 6 }}>
                    avg_clicks
                    <input type="number" value={snapAvgClicks} onChange={(e) => setSnapAvgClicks(Number(e.target.value))} />
                  </label>
                  <label style={{ display: 'grid', gap: 6 }}>
                    vle_records
                    <input type="number" value={snapVleRecords} onChange={(e) => setSnapVleRecords(Number(e.target.value))} />
                  </label>
                  <label style={{ display: 'grid', gap: 6 }}>
                    avg_score
                    <input type="number" value={snapAvgScore} onChange={(e) => setSnapAvgScore(Number(e.target.value))} />
                  </label>
                  <label style={{ display: 'grid', gap: 6 }}>
                    total_score
                    <input type="number" value={snapTotalScore} onChange={(e) => setSnapTotalScore(Number(e.target.value))} />
                  </label>
                  <label style={{ display: 'grid', gap: 6 }}>
                    assessment_count
                    <input type="number" value={snapAssessmentCount} onChange={(e) => setSnapAssessmentCount(Number(e.target.value))} />
                  </label>
                  <label style={{ display: 'grid', gap: 6 }}>
                    avg_weight
                    <input type="number" value={snapAvgWeight} onChange={(e) => setSnapAvgWeight(Number(e.target.value))} />
                  </label>
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
                  <input type="checkbox" checked={snapAutoPredict} onChange={(e) => setSnapAutoPredict(e.target.checked)} />
                  Auto-generate prediction after saving snapshot
                </label>
              </div>

              <div>
                <div style={{ fontWeight: 800, marginBottom: 8 }}>Snapshot history</div>
                {snapshotHistory.length ? (
                  <table width="100%" cellPadding={8} style={{ borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                        <th>feature_id</th>
                        <th>days</th>
                        <th>total_clicks</th>
                        <th>avg_score</th>
                        <th>assessments</th>
                        <th>avg_weight</th>
                      </tr>
                    </thead>
                    <tbody>
                      {snapshotHistory.slice(0, 10).map((s) => (
                        <tr key={s.feature_id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td>{s.feature_id}</td>
                          <td>{s.days_from_start ?? '-'}</td>
                          <td>{Number(s.total_clicks ?? 0).toFixed(0)}</td>
                          <td>{Number(s.avg_score ?? 0).toFixed(2)}</td>
                          <td>{Number(s.assessment_count ?? 0).toFixed(0)}</td>
                          <td>{Number(s.avg_weight ?? 0).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="muted">No snapshots for this student yet.</div>
                )}
                {snapshotHistory.length > 10 ? (
                  <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>
                    Showing latest 10 snapshots. Full history is available in “Feature snapshots”.
                  </div>
                ) : null}
              </div>
            </div>
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

function TopFactors({ value, averages }: { value: string | null; averages: Record<string, number> | null }) {
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
          <th>Avg</th>
          <th>Δ</th>
          <th>Importance</th>
        </tr>
      </thead>
      <tbody>
        {parsed.map((r) => {
          const avg = averages && Object.prototype.hasOwnProperty.call(averages, r.feature) ? Number(averages[r.feature]) : null
          const delta = avg != null && Number.isFinite(r.value) && Number.isFinite(avg) ? r.value - avg : null
          const deltaText =
            delta == null || !Number.isFinite(delta)
              ? '-'
              : `${delta >= 0 ? '+' : ''}${delta.toFixed(2)}`

          return (
            <tr key={r.feature} style={{ borderBottom: '1px solid var(--border)' }}>
              <td style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>{r.feature}</td>
              <td>{Number.isFinite(r.value) ? r.value.toFixed(2) : '-'}</td>
              <td>{avg != null && Number.isFinite(avg) ? avg.toFixed(2) : <span className="muted">-</span>}</td>
              <td style={{ color: delta != null && delta > 0 ? 'var(--success)' : delta != null && delta < 0 ? 'var(--danger)' : 'var(--text-h)' }}>
                {deltaText}
              </td>
              <td>{Number.isFinite(r.importance) ? r.importance.toFixed(4) : '-'}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

function Sparkline({ values, labels }: { values: number[]; labels?: string[] }) {
  if (!values.length) return null
  const w = 520
  const h = 90
  const pad = 8
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const xStep = values.length > 1 ? (w - pad * 2) / (values.length - 1) : 0

  const pts = values.map((v, i) => {
    const x = pad + i * xStep
    const y = pad + (h - pad * 2) * (1 - (v - min) / range)
    return { x, y }
  })

  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ')
  const last = values[values.length - 1]
  const first = values[0]
  const delta = last - first

  return (
    <div className="card" style={{ boxShadow: 'none' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline' }}>
        <div className="muted" style={{ fontSize: 12 }}>
          start {first.toFixed(3)} → now {last.toFixed(3)} ({delta >= 0 ? '+' : ''}
          {delta.toFixed(3)})
        </div>
        {labels?.length ? (
          <div className="muted" style={{ fontSize: 12 }}>
            {labels[0]} → {labels[labels.length - 1]}
          </div>
        ) : null}
      </div>

      <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ marginTop: 8, display: 'block' }}>
        <path d={d} fill="none" stroke="var(--accent)" strokeWidth="2.5" />
        <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r="3.5" fill="var(--accent)" />
      </svg>
    </div>
  )
}

function MiniSpark({ title, values, labels }: { title: string; values: number[]; labels?: string[] }) {
  if (!values.length) return null
  const last = values[values.length - 1]
  const w = 520
  const h = 70
  const pad = 8
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const xStep = values.length > 1 ? (w - pad * 2) / (values.length - 1) : 0
  const pts = values.map((v, i) => {
    const x = pad + i * xStep
    const y = pad + (h - pad * 2) * (1 - (v - min) / range)
    return { x, y }
  })
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ')

  return (
    <div className="card" style={{ boxShadow: 'none' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline' }}>
        <div style={{ fontWeight: 800 }}>{title}</div>
        <div className="muted" style={{ fontSize: 12 }}>
          now {Number.isFinite(last) ? last.toFixed(2) : '-'}
          {labels?.length ? ` • days ${labels[0]}→${labels[labels.length - 1]}` : ''}
        </div>
      </div>
      <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ marginTop: 6, display: 'block' }}>
        <path d={d} fill="none" stroke="var(--text-h)" strokeOpacity="0.8" strokeWidth="2" />
        <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r="3" fill="var(--text-h)" />
      </svg>
    </div>
  )
}

