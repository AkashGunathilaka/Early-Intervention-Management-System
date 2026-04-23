export type RiskLevel = 'Low' | 'Medium' | 'High'

export function RiskBadge({ level, showSuffix }: { level: RiskLevel; showSuffix?: boolean }) {
  const style: Record<RiskLevel, { bg: string; fg: string; label: string }> = {
    High: { bg: '#fee2e2', fg: '#991b1b', label: 'High' },
    Medium: { bg: '#ffedd5', fg: '#9a3412', label: 'Medium' },
    Low: { bg: '#dcfce7', fg: '#166534', label: 'Low' },
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '4px 10px',
        borderRadius: 999,
        background: style[level].bg,
        color: style[level].fg,
        fontWeight: 700,
        fontSize: 12,
      }}
    >
      {style[level].label}
      {showSuffix ? ' risk' : ''}
    </span>
  )
}

