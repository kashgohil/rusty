import { ErrorComponent, Link, rootRouteId, useMatch } from '@tanstack/react-router'

export function DefaultCatchBoundary({ error }: { error: Error }) {
  const isRoot = useMatch({
    strict: false,
    select: (state) => state.id === rootRouteId,
  })

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col justify-center px-6 py-16 text-stone-100">
      <p className="mb-3 text-xs uppercase tracking-[0.35em] text-amber-300/75">
        runtime fault
      </p>
      <h1 className="max-w-2xl font-[var(--font-display)] text-4xl leading-tight text-balance">
        The workshop hit an unexpected compiler spark.
      </h1>
      <p className="mt-4 max-w-2xl text-sm leading-7 text-stone-300">
        {error.message}
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          className="rounded-full border border-amber-200/30 bg-amber-100 px-5 py-2 text-sm font-medium text-stone-950"
          to="/"
        >
          Back to home
        </Link>
        {!isRoot ? (
          <button
            className="rounded-full border border-stone-700 px-5 py-2 text-sm text-stone-100"
            onClick={() => window.history.back()}
            type="button"
          >
            Go back
          </button>
        ) : null}
      </div>
      <div className="mt-8 rounded-3xl border border-red-400/30 bg-red-950/30 p-5">
        <ErrorComponent error={error} />
      </div>
    </main>
  )
}
