import { Link, createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Button } from '~/components/ui/button'
import {
  Card,
  CardContent,
} from '~/components/ui/card'
import { buildLearnerUrl, validateLearnerSearch } from '~/utils/learner'
import { useLearnerIdentity } from '~/utils/useLearnerIdentity'
import { useLessonProgress } from '~/utils/useLessonProgress'
import { useLessons } from '~/utils/useLessons'

export const Route = createFileRoute('/')({
  validateSearch: validateLearnerSearch,
  component: HomePage,
})

function HomePage() {
  const [copied, setCopied] = useState(false)
  const { lessons } = useLessons()
  const { learnerId, learnerSearch } = useLearnerIdentity()
  const { progress } = useLessonProgress(learnerId)
  const totalLessons = lessons.length
  const totalStages = new Set(lessons.map((lesson) => lesson.stage)).size
  const completedLessons = lessons.filter(
    (lesson) => progress[lesson.slug]?.status === 'completed',
  ).length
  const startedLessons = lessons.filter(
    (lesson) => progress[lesson.slug]?.status && progress[lesson.slug]?.status !== 'not_started',
  ).length

  async function copyLearnerLink() {
    if (!learnerId || typeof window === 'undefined') {
      return
    }

    await window.navigator.clipboard.writeText(buildLearnerUrl('/lessons', learnerId))
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-12 px-6 pb-24 pt-10">
      <section className="hero-panel">
        <Card className="hero-copy">
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
          {learnerId ? (
            <p className="workbench-note mt-6">learner {learnerId}</p>
          ) : null}
          <div className="hero-actions">
            <Button asChild className="primary-pill rounded-full px-5 py-4" size="lg">
              <Link search={learnerSearch} to="/lessons">
                Open curriculum
              </Link>
            </Button>
            <Button
              asChild
              className="ghost-pill rounded-full border px-5 py-4"
              size="lg"
              variant="outline"
            >
              <Link search={learnerSearch} to="/docs/architecture">
                Review architecture
              </Link>
            </Button>
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
        </Card>
        <aside className="hero-stats">
          <Card>
            <CardContent className="px-5 py-5">
            <span>{String(totalLessons).padStart(2, '0')}</span>
            <p>lessons scoped for the first learning track</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="px-5 py-5">
            <span>{String(totalStages).padStart(2, '0')}</span>
            <p>curriculum stages from basics to practical projects</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="px-5 py-5">
            <span>{String(completedLessons).padStart(2, '0')}</span>
            <p>{startedLessons} started, {completedLessons} completed through the API</p>
            </CardContent>
          </Card>
        </aside>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="brief-panel">
          <CardContent className="px-6 py-6">
          <p className="eyebrow">Platform shape</p>
          <h2>Why this structure works for a Rust bootcamp</h2>
          <ul className="brief-list">
            <li>Lessons stay content-driven instead of hardcoded into UI components.</li>
            <li>The editor and runner are separate concerns, which keeps public execution safer.</li>
            <li>The API and runner can both stay in Rust while the frontend moves quickly.</li>
          </ul>
          </CardContent>
        </Card>

        <Card className="ide-preview">
          <div className="ide-topbar">
            <span>lesson.rs</span>
            <span>runner: pending</span>
          </div>
          <pre>{`fn main() {
    let ownership = "coming soon";
    println!("Bootcamp status: {ownership}");
}`}</pre>
          <div className="ide-console">next: wire Monaco + sandboxed execution</div>
        </Card>
      </section>
    </main>
  )
}
