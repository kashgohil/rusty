import { Link, createFileRoute } from '@tanstack/react-router'
import { curriculum, stageOrder } from '@rust-learning/lesson-content'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  const totalLessons = curriculum.length
  const totalStages = stageOrder.length

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-12 px-6 pb-24 pt-10">
      <section className="hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">Interactive Rust bootcamp</p>
          <h1>
            Build a serious Rust practice space that feels like a workshop, not a
            documentation dump.
          </h1>
          <p className="hero-text">
            This starter shell is organized around lessons, execution, and language
            tooling. The next step is wiring Monaco, the runner service, and remote
            LSP support into the lesson experience.
          </p>
          <div className="hero-actions">
            <Link className="primary-pill" to="/lessons">
              Open curriculum
            </Link>
            <Link className="ghost-pill" to="/docs/architecture">
              Review architecture
            </Link>
          </div>
        </div>
        <aside className="hero-stats">
          <div>
            <span>{String(totalLessons).padStart(2, '0')}</span>
            <p>lessons scoped for the first learning track</p>
          </div>
          <div>
            <span>{String(totalStages).padStart(2, '0')}</span>
            <p>curriculum stages from basics to practical projects</p>
          </div>
          <div>
            <span>IDE</span>
            <p>Monaco shell planned first, then compile/run, then LSP</p>
          </div>
        </aside>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <article className="brief-panel">
          <p className="eyebrow">Platform shape</p>
          <h2>Why this structure works for a Rust bootcamp</h2>
          <ul className="brief-list">
            <li>Lessons stay content-driven instead of hardcoded into UI components.</li>
            <li>The editor and runner are separate concerns, which keeps public execution safer.</li>
            <li>The API and runner can both stay in Rust while the frontend moves quickly.</li>
          </ul>
        </article>

        <article className="ide-preview">
          <div className="ide-topbar">
            <span>lesson.rs</span>
            <span>runner: pending</span>
          </div>
          <pre>{`fn main() {
    let ownership = "coming soon";
    println!("Bootcamp status: {ownership}");
}`}</pre>
          <div className="ide-console">next: wire Monaco + sandboxed execution</div>
        </article>
      </section>
    </main>
  )
}
