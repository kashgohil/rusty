import { createFileRoute, notFound } from '@tanstack/react-router'
import { getLessonBySlug } from '@rust-learning/lesson-content'

export const Route = createFileRoute('/lessons/$lessonSlug')({
  component: LessonDetailPage,
})

function LessonDetailPage() {
  const { lessonSlug } = Route.useParams()
  const lesson = getLessonBySlug(lessonSlug)

  if (!lesson) {
    throw notFound()
  }

  return (
    <section className="lesson-detail-shell">
      <article className="lesson-meta-panel">
        <p className="eyebrow">{lesson.stage}</p>
        <h1>{lesson.title}</h1>
        <p className="lesson-summary">{lesson.summary}</p>
        <div className="lesson-meta-row">
          <span>lesson {lesson.order.toString().padStart(2, '0')}</span>
          <span>{lesson.duration}</span>
          <span>{lesson.difficulty}</span>
        </div>
        <div className="objective-block">
          <h2>Learning targets</h2>
          <ul>
            {lesson.objectives.map((objective) => (
              <li key={objective}>{objective}</li>
            ))}
          </ul>
        </div>
        <div className="objective-block">
          <h2>Practice prompt</h2>
          <p>{lesson.exercise.prompt}</p>
        </div>
      </article>

      <article className="workbench-panel">
        <div className="workbench-header">
          <div>
            <p className="eyebrow">IDE shell</p>
            <h2>{lesson.exercise.fileName}</h2>
          </div>
          <div className="workbench-status">
            <span>compile/run</span>
            <span>LSP pending</span>
          </div>
        </div>

        <pre className="code-pane">{lesson.exercise.starterCode}</pre>

        <div className="workbench-footer">
          <div>
            <h3>Hint</h3>
            <p>{lesson.exercise.hint}</p>
          </div>
          <div>
            <h3>Validation target</h3>
            <p>{lesson.exercise.success}</p>
          </div>
        </div>
      </article>
    </section>
  )
}
