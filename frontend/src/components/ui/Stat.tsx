export function Stat({
  label,
  value,
  tone,
}: {
  label: string
  value: React.ReactNode
  tone?: string
}) {
  return (
    <div className="stat">
      <div className="statLabel">{label}</div>
      <div className="statValue" style={{ color: tone ?? 'var(--text-h)' }}>
        {value}
      </div>
    </div>
  )
}

