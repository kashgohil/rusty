import { Outlet, createFileRoute, useRouterState } from '@tanstack/react-router'
import { useState } from 'react'
import { Button } from '~/components/ui/button'
import { buildLearnerUrl, validateLearnerSearch } from '~/utils/learner'
import { useLearnerIdentity } from '~/utils/useLearnerIdentity'

export const Route = createFileRoute('/lessons')({
  validateSearch: validateLearnerSearch,
  component: LessonsLayout,
})

function LessonsLayout() {
  const [copied, setCopied] = useState(false)
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const { learnerId } = useLearnerIdentity()
  const isCurriculumIndex = pathname === '/lessons' || pathname === '/lessons/'

  async function copyLearnerLink() {
    if (!learnerId || typeof window === 'undefined') {
      return
    }

    await window.navigator.clipboard.writeText(buildLearnerUrl('/lessons', learnerId))
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  return (
    <main
      className={
        isCurriculumIndex
          ? 'mx-auto flex w-full max-w-7xl flex-col gap-10 px-6 pb-24 pt-10'
          : 'flex h-[100dvh] w-full flex-col'
      }
    >
      {isCurriculumIndex ? (
        <section className="section-heading">
          <p className="eyebrow">Curriculum</p>
          <h1>Rust track, structured as a bootcamp instead of a loose reading list.</h1>
          <p>
            The content package drives these pages, which keeps the learning system
            editable without rebuilding route logic every time a lesson changes.
          </p>
          <div className="hero-actions mt-6">
            {learnerId ? <p className="workbench-note">learner {learnerId}</p> : null}
            <Button
              className="ghost-pill rounded-full border px-5 py-4"
              onClick={() => void copyLearnerLink()}
              size="lg"
              type="button"
              variant="outline"
            >
              {copied ? 'Copied learner link' : 'Copy learner link'}
            </Button>
          </div>
        </section>
      ) : null}
      <Outlet />
    </main>
  )
}
