import { Link, createFileRoute } from '@tanstack/react-router'
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert'
import { useLearnerIdentity } from '~/utils/useLearnerIdentity'
import { useLessonProgress } from '~/utils/useLessonProgress'
import { useLessons } from '~/utils/useLessons'

export const Route = createFileRoute('/lessons/')({
  component: LessonsIndexPage,
})

function LessonsIndexPage() {
  const { learnerId, learnerSearch } = useLearnerIdentity()
  const { progress } = useLessonProgress(learnerId)
  const { lessons, isLoading, error } = useLessons()
  const stageOrder = Array.from(new Set(lessons.map((lesson) => lesson.stage)))
  const completedLessons = lessons.filter(
    (lesson) => progress[lesson.slug]?.status === 'completed',
  ).length
  const startedLessons = lessons.filter(
    (lesson) => progress[lesson.slug]?.status && progress[lesson.slug]?.status !== 'not_started',
  ).length

  if (isLoading) {
    return (
      <Alert className="stage-panel border-[rgb(162_143_108_/_0.14)] bg-transparent text-inherit">
        <div className="section-heading">
          <p className="eyebrow">Loading</p>
          <AlertTitle>Loading curriculum from the API...</AlertTitle>
          <AlertDescription>
            <p>The lessons page is waiting for the configured API service.</p>
          </AlertDescription>
        </div>
      </Alert>
    )
  }

  if (error) {
    return (
      <Alert className="stage-panel border-[rgb(239_107_71_/_0.28)] bg-transparent text-inherit" variant="destructive">
        <div className="section-heading">
          <p className="eyebrow">API unavailable</p>
          <AlertTitle>The curriculum could not be loaded.</AlertTitle>
          <AlertDescription>
            <p>{error}</p>
            <p>Start the backend with `bun run dev:api`, then refresh the page.</p>
          </AlertDescription>
        </div>
      </Alert>
    )
  }

  if (lessons.length === 0) {
    return (
      <Alert className="stage-panel border-[rgb(162_143_108_/_0.14)] bg-transparent text-inherit">
        <div className="section-heading">
          <p className="eyebrow">No lessons</p>
          <AlertTitle>The API returned an empty curriculum.</AlertTitle>
          <AlertDescription>
            <p>Check the lesson source data and the API response.</p>
          </AlertDescription>
        </div>
      </Alert>
    )
  }

  return (
    <div className="curriculum-map">
      <div className="curriculum-overview" aria-label="Curriculum progress summary">
        <div>
          <span>{String(lessons.length).padStart(2, '0')}</span>
          <p>Total lessons</p>
        </div>
        <div>
          <span>{String(stageOrder.length).padStart(2, '0')}</span>
          <p>Bootcamp stages</p>
        </div>
        <div>
          <span>{String(startedLessons).padStart(2, '0')}</span>
          <p>Started</p>
        </div>
        <div>
          <span>{String(completedLessons).padStart(2, '0')}</span>
          <p>Completed</p>
        </div>
      </div>

      {stageOrder.map((stage) => {
        const stageLessons = lessons.filter((lesson) => lesson.stage === stage)
        const completedCount = stageLessons.filter(
          (lesson) => progress[lesson.slug]?.status === 'completed',
        ).length
        const stageIndex = stageOrder.indexOf(stage) + 1

        return (
          <section className="curriculum-stage" key={stage}>
            <aside className="curriculum-stage-rail">
              <span>{String(stageIndex).padStart(2, '0')}</span>
              <h2>{stage}</h2>
              <p>
                {String(completedCount).padStart(2, '0')}/
                {String(stageLessons.length).padStart(2, '0')} complete
              </p>
            </aside>

            <div className="curriculum-lessons">
              {stageLessons.map((lesson) => (
                <Link
                  className="curriculum-lesson"
                  key={lesson.slug}
                  params={{ lessonSlug: lesson.slug }}
                  search={learnerSearch}
                  to="/lessons/$lessonSlug"
                >
                  <span className="curriculum-lesson-number">
                    {lesson.order.toString().padStart(2, '0')}
                  </span>
                  <div className="curriculum-lesson-main">
                    <div className="curriculum-lesson-heading">
                      <h3>{lesson.title}</h3>
                      <span className={statusClass(progress[lesson.slug]?.status)}>
                        {progressLabel(progress[lesson.slug]?.status, lesson.duration)}
                      </span>
                    </div>
                    <p>{lesson.summary}</p>
                    <ul>
                      {lesson.objectives.slice(0, 2).map((objective) => (
                        <li key={objective}>{objective}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="curriculum-lesson-meta">
                    <span>{lesson.difficulty}</span>
                    <span>{lesson.exercise.entryFile}</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}

function progressLabel(
  status: 'not_started' | 'in_progress' | 'completed' | undefined,
  fallback: string,
) {
  if (status === 'completed') {
    return 'completed'
  }

  if (status === 'in_progress') {
    return 'in progress'
  }

  return fallback
}

function statusClass(
  status: 'not_started' | 'in_progress' | 'completed' | undefined,
) {
  if (status === 'completed') {
    return 'lesson-status lesson-status-completed'
  }

  if (status === 'in_progress') {
    return 'lesson-status lesson-status-active'
  }

  return 'lesson-status'
}
