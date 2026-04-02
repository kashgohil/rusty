import { Link, createFileRoute } from '@tanstack/react-router'
import { curriculum, stageOrder } from '@rust-learning/lesson-content'
import { useLessonProgress } from '~/utils/useLessonProgress'

export const Route = createFileRoute('/lessons/')({
  component: LessonsIndexPage,
})

function LessonsIndexPage() {
  const progress = useLessonProgress()

  return (
    <div className="space-y-10">
      {stageOrder.map((stage) => {
        const lessons = curriculum.filter((lesson) => lesson.stage === stage)
        const completedCount = lessons.filter(
          (lesson) => progress[lesson.slug]?.status === 'completed',
        ).length

        return (
          <section className="stage-panel" key={stage}>
            <div className="stage-header">
              <p className="eyebrow">{stage}</p>
              <span>
                {String(completedCount).padStart(2, '0')}/
                {String(lessons.length).padStart(2, '0')} complete
              </span>
            </div>
            <div className="lesson-grid">
              {lessons.map((lesson) => (
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
