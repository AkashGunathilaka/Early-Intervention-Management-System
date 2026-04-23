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
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: 12 }}>
      <div style={{ fontSize: 12, color: '#6b7280' }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: tone ?? '#111827' }}>{value}</div>
    </div>
  )
}

