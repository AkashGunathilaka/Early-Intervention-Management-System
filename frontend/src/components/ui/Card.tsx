export function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card">
      <h2 className="cardTitle">{title}</h2>
      <div className="cardBody">{children}</div>
    </section>
  )
}

