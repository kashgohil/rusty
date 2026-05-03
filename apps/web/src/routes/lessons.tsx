import { Outlet, createFileRoute, useRouterState } from '@tanstack/react-router'
import { Check, Copy } from 'lucide-react'
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
        <section className="curriculum-hero">
          <div className="section-heading">
            <p className="eyebrow">Curriculum</p>
            <h1>Roadmap.</h1>
            <p>
              A structured track of lessons, exercises, checks, and progress state.
            </p>
          </div>
          <div className="learner-toolbar curriculum-learner-toolbar">
            {learnerId ? (
              <p className="learner-chip">
                <span>Learner</span>
                <strong>{learnerId}</strong>
              </p>
            ) : null}
            <Button
              aria-label={copied ? 'Learner link copied' : 'Copy learner link'}
              className="copy-link-button"
              onClick={() => void copyLearnerLink()}
              title={copied ? 'Copied learner link' : 'Copy learner link'}
              type="button"
              variant="outline"
            >
              {copied ? <Check /> : <Copy />}
            </Button>
          </div>
        </section>
      ) : null}
      <Outlet />
    </main>
  )
}
