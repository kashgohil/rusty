import { Link } from '@tanstack/react-router'

export function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col justify-center px-6 py-16 text-stone-100">
      <p className="text-xs uppercase tracking-[0.35em] text-cyan-300/70">404</p>
      <h1 className="mt-3 font-[var(--font-display)] text-5xl text-balance">
        That lesson card is missing from the board.
      </h1>
      <p className="mt-4 max-w-xl text-sm leading-7 text-stone-300">
        The route exists nowhere useful. Move back to the curriculum and keep the
        workshop intact.
      </p>
      <div className="mt-8">
        <Link
          className="inline-flex rounded-full border border-stone-700 px-5 py-2 text-sm text-stone-100 transition hover:border-cyan-300 hover:text-cyan-200"
          to="/lessons"
        >
          Open curriculum
        </Link>
      </div>
    </main>
  )
}
