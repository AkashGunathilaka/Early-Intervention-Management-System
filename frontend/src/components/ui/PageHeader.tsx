import type { ReactNode } from 'react'

export function PageHeader({
  eyebrow,
  title,
  lead,
  actions,
  children,
}: {
  eyebrow?: string
  title: string
  lead?: string
  actions?: ReactNode
  children?: ReactNode
}) {
  return (
    <header className="pageHero">
      <span className="pageHeroAccent" aria-hidden />
      <div className="pageHeroInner">
        <div className="pageHeroMain">
          {eyebrow ? <div className="pageHeroEyebrow">{eyebrow}</div> : null}
          <h1 className="pageHeroTitle">{title}</h1>
          {lead ? <p className="pageHeroLead">{lead}</p> : null}
          {children}
        </div>
        {actions ? <div className="pageHeroActions">{actions}</div> : null}
      </div>
    </header>
  )
}

/** Split titles like "Admin — Users" into eyebrow + title. */
export function parseSectionTitle(full: string): { eyebrow?: string; title: string } {
  const parts = full.split('—').map((s) => s.trim())
  if (parts.length >= 2) {
    return { eyebrow: parts[0], title: parts.slice(1).join(' — ') }
  }
  return { title: full }
}
