import { Link } from '@tanstack/react-router'
import { Button } from '~/components/ui/button'
import { Card, CardContent } from '~/components/ui/card'

export function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col justify-center px-6 py-16 text-stone-100">
      <Card className="border-[rgb(162_143_108_/_0.18)] bg-[linear-gradient(180deg,rgba(18,25,27,0.92),rgba(11,15,16,0.88))] py-0 text-inherit">
        <CardContent className="px-6 py-16">
          <p className="text-xs uppercase tracking-[0.35em] text-cyan-300/70">404</p>
          <h1 className="mt-3 font-[var(--font-display)] text-5xl text-balance">
            That lesson card is missing from the board.
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-7 text-stone-300">
            The route exists nowhere useful. Move back to the curriculum and keep the
            workshop intact.
          </p>
          <div className="mt-8">
            <Button
              asChild
              className="rounded-full border-stone-700 bg-transparent px-5 text-stone-100 hover:border-cyan-300 hover:bg-transparent hover:text-cyan-200"
              variant="outline"
            >
              <Link to="/lessons">Open curriculum</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
