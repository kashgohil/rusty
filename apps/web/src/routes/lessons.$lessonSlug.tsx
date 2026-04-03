import { createFileRoute, notFound } from '@tanstack/react-router'
import { LessonWorkbench } from '~/components/LessonWorkbench'
import { useLesson } from '~/utils/useLessons'

export const Route = createFileRoute('/lessons/$lessonSlug')({
  component: LessonDetailPage,
})

function LessonDetailPage() {
  const { lessonSlug } = Route.useParams()
  const { lesson, isLoading } = useLesson(lessonSlug)

  if (isLoading) {
    return (
      <section className="lesson-detail-shell">
        <article className="lesson-meta-panel">
          <p className="eyebrow">Loading</p>
          <h1>Loading lesson workspace...</h1>
        </article>
      </section>
    )
  }

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
        <div className="objective-block">
          <h2>Workspace shape</h2>
          <ul>
            {lesson.exercise.files.map((file) => (
              <li key={file.path}>
                {file.path}
                {file.editable === false ? ' (hidden validation file)' : ''}
              </li>
            ))}
          </ul>
        </div>
      </article>

      <LessonWorkbench lesson={lesson} />
    </section>
  )
}
