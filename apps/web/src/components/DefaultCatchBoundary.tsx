import { ErrorComponent, Link, rootRouteId, useMatch } from '@tanstack/react-router'
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert'
import { Button } from '~/components/ui/button'
import { Card, CardContent } from '~/components/ui/card'
import { useLearnerIdentity } from '~/utils/useLearnerIdentity'

export function DefaultCatchBoundary({ error }: { error: Error }) {
  const { learnerSearch } = useLearnerIdentity()
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
        <Button
          asChild
          className="rounded-full border-amber-200/30 bg-amber-100 px-5 text-stone-950 hover:bg-amber-200"
        >
          <Link search={learnerSearch} to="/">
            Back to home
          </Link>
        </Button>
        {!isRoot ? (
          <Button
            className="rounded-full border-stone-700 bg-transparent px-5 text-stone-100 hover:bg-stone-900"
            onClick={() => window.history.back()}
            type="button"
            variant="outline"
          >
            Go back
          </Button>
        ) : null}
      </div>
      <Alert className="mt-8 border-red-400/30 bg-red-950/30 text-stone-100" variant="destructive">
        <AlertTitle>Error details</AlertTitle>
        <AlertDescription>
          <Card className="mt-3 border-0 bg-transparent py-0 shadow-none ring-0">
            <CardContent className="px-0 pt-0">
              <ErrorComponent error={error} />
            </CardContent>
          </Card>
        </AlertDescription>
      </Alert>
    </main>
  )
}
