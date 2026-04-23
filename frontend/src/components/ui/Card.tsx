export function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 14 }}>
      <h2 style={{ margin: 0, fontSize: 16 }}>{title}</h2>
      <div style={{ marginTop: 12 }}>{children}</div>
    </section>
  )
}

