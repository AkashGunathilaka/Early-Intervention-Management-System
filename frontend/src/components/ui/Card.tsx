// Reusable card wrapper for page sections to keep the section layout and headings consistent across the dashboard

export function Card({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <section className="card">
      {title ? <h2 className="cardTitle">{title}</h2> : null}
      <div className="cardBody">{children}</div>
    </section>
  )
}

