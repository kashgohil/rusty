import { Outlet, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/lessons')({
  component: LessonsLayout,
})

function LessonsLayout() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-6 pb-24 pt-10">
      <section className="section-heading">
        <p className="eyebrow">Curriculum</p>
        <h1>Rust track, structured as a bootcamp instead of a loose reading list.</h1>
        <p>
          The content package drives these pages, which keeps the learning system
          editable without rebuilding route logic every time a lesson changes.
        </p>
      </section>
      <Outlet />
    </main>
  )
}
