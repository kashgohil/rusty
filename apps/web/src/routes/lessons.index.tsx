import { Link, createFileRoute } from '@tanstack/react-router'
import { useLessonProgress } from '~/utils/useLessonProgress'
import { useLessons } from '~/utils/useLessons'

export const Route = createFileRoute('/lessons/')({
  component: LessonsIndexPage,
})

function LessonsIndexPage() {
  const { progress } = useLessonProgress()
  const { lessons } = useLessons()
  const stageOrder = Array.from(new Set(lessons.map((lesson) => lesson.stage)))

  return (
    <div className="space-y-10">
      {stageOrder.map((stage) => {
        const stageLessons = lessons.filter((lesson) => lesson.stage === stage)
        const completedCount = stageLessons.filter(
          (lesson) => progress[lesson.slug]?.status === 'completed',
        ).length

        return (
          <section className="stage-panel" key={stage}>
            <div className="stage-header">
              <p className="eyebrow">{stage}</p>
              <span>
                {String(completedCount).padStart(2, '0')}/
                {String(stageLessons.length).padStart(2, '0')} complete
              </span>
            </div>
            <div className="lesson-grid">
              {stageLessons.map((lesson) => (
                <Link className="lesson-card" key={lesson.slug} params={{ lessonSlug: lesson.slug }} to="/lessons/$lessonSlug">
                  <div className="lesson-card-top">
                    <span>{lesson.order.toString().padStart(2, '0')}</span>
                    <p>{progressLabel(progress[lesson.slug]?.status, lesson.duration)}</p>
                  </div>
                  <h2>{lesson.title}</h2>
                  <p>{lesson.summary}</p>
                  <ul>
                    {lesson.objectives.slice(0, 3).map((objective) => (
                      <li key={objective}>{objective}</li>
                    ))}
                  </ul>
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
