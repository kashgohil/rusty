import { Link, createFileRoute } from '@tanstack/react-router'
import { curriculum, stageOrder } from '@rust-learning/lesson-content'

export const Route = createFileRoute('/lessons/')({
  component: LessonsIndexPage,
})

function LessonsIndexPage() {
  return (
    <div className="space-y-10">
      {stageOrder.map((stage) => {
        const lessons = curriculum.filter((lesson) => lesson.stage === stage)

        return (
          <section className="stage-panel" key={stage}>
            <div className="stage-header">
              <p className="eyebrow">{stage}</p>
              <span>{String(lessons.length).padStart(2, '0')} lessons</span>
            </div>
            <div className="lesson-grid">
              {lessons.map((lesson) => (
                <Link className="lesson-card" key={lesson.slug} params={{ lessonSlug: lesson.slug }} to="/lessons/$lessonSlug">
                  <div className="lesson-card-top">
                    <span>{lesson.order.toString().padStart(2, '0')}</span>
                    <p>{lesson.duration}</p>
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
