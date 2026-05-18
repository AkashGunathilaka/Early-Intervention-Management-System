import { type FormEvent, useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { PageHeader } from '../../components/ui/PageHeader'

// Admin page for changing risk thresholds
// these values decide whether a score is shown as high medium or low

type Thresholds = {
  id: number
  high_threshold: number
  medium_threshold: number
}

export function AdminRiskThresholdsPage() {
  const [data, setData] = useState<Thresholds | null>(null)
  const [high, setHigh] = useState('')
  const [medium, setMedium] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  // load the thresholds when the page opens 
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        setError(null)
        const res = await api.get<Thresholds>('/admin/risk-thresholds/')
        if (cancelled) return
        setData(res.data)
        setHigh(String(res.data.high_threshold))
        setMedium(String(res.data.medium_threshold))
      } catch (err: any) {
        if (!cancelled) setError(err?.response?.data?.detail ?? 'Failed to load thresholds (admin only)')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

 
  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setMessage(null)
    setError(null)
    setSaving(true)
    try {
      const payload = {
        high_threshold: Number(high),
        medium_threshold: Number(medium),
      }
      const res = await api.put<Thresholds>('/admin/risk-thresholds/', payload)

      // show the new thresholds
      setData(res.data)
      setHigh(String(res.data.high_threshold))
      setMedium(String(res.data.medium_threshold))
      setMessage('Saved')
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Failed to save thresholds')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow="Admin"
        title="Risk thresholds"
        lead="Set the score cutoffs used to label students as high, medium, or low risk."
      />
      {loading ? <p>Loading…</p> : null}
      {error ? <p className="error">{error}</p> : null}
      {message ? <p className="success">{message}</p> : null}

      {data ? (
        <div className="card">
          <form onSubmit={onSubmit} style={{ display: 'grid', gap: 12 }}>
          <label style={{ display: 'grid', gap: 6 }}>
            High threshold (0–1)
            <input value={high} onChange={(e) => setHigh(e.target.value)} />
          </label>

          <label style={{ display: 'grid', gap: 6 }}>
            Medium threshold (0–1)
            <input value={medium} onChange={(e) => setMedium(e.target.value)} />
          </label>

          <button type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>

          <div className="muted" style={{ fontSize: 12 }}>
            Note: Medium must be less than High. These thresholds affect risk level labeling.
          </div>
          </form>
        </div>
      ) : null}
    </div>
  )
}

