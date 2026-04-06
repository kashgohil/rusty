import { createFileRoute, notFound } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { LessonWorkbench } from '~/components/LessonWorkbench'
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert'
import { Badge } from '~/components/ui/badge'
import { Card, CardContent } from '~/components/ui/card'
import { Separator } from '~/components/ui/separator'
import { useLesson } from '~/utils/useLessons'

export const Route = createFileRoute('/lessons/$lessonSlug')({
  component: LessonDetailPage,
})

function LessonDetailPage() {
  const { lessonSlug } = Route.useParams()
  const { lesson, isLoading, error } = useLesson(lessonSlug)
  const shellRef = useRef<HTMLElement | null>(null)
  const [sidebarWidth, setSidebarWidth] = useState(31)

  useEffect(() => {
    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }

    const handlePointerMove = (event: PointerEvent) => {
      if (!shellRef.current) {
        return
      }

      const bounds = shellRef.current.getBoundingClientRect()
      const nextWidth = ((event.clientX - bounds.left) / bounds.width) * 100
      const clamped = Math.min(46, Math.max(22, nextWidth))
      setSidebarWidth(clamped)
    }

    const startResize = () => {
      window.addEventListener('pointermove', handlePointerMove)
      window.addEventListener('pointerup', handlePointerUp)
    }

    const shell = shellRef.current
    const divider = shell?.querySelector<HTMLElement>('[data-splitter]')

    divider?.addEventListener('pointerdown', startResize)

    return () => {
      divider?.removeEventListener('pointerdown', startResize)
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [])

  if (isLoading) {
    return (
      <section className="lesson-detail-shell">
        <Card className="lesson-meta-panel rounded-none border-0 py-0 text-inherit ring-0">
          <CardContent className="px-5 py-5">
            <p className="eyebrow">Loading</p>
            <h1>Loading lesson workspace...</h1>
          </CardContent>
        </Card>
      </section>
    )
  }

  if (error) {
    return (
      <section className="lesson-detail-shell">
        <Alert
          className="lesson-meta-panel rounded-none border-[rgb(239_107_71_/_0.28)] bg-transparent text-inherit"
          variant="destructive"
        >
          <p className="eyebrow">API unavailable</p>
          <AlertTitle>The lesson could not be loaded.</AlertTitle>
          <AlertDescription>
            <p className="lesson-summary">{error}</p>
            <p className="lesson-summary">
              Start the backend with `bun run dev:api`, then refresh the page.
            </p>
          </AlertDescription>
        </Alert>
      </section>
    )
  }

  if (!lesson) {
    throw notFound()
  }

  return (
    <section
      className="lesson-detail-shell"
      ref={shellRef}
      style={{
        gridTemplateColumns: `${sidebarWidth}% 10px minmax(0, 1fr)`,
      }}
    >
      <Card className="lesson-meta-panel rounded-none border-0 py-0 text-inherit ring-0">
        <CardContent className="px-5 py-5">
          <p className="eyebrow">{lesson.stage}</p>
          <h1>{lesson.title}</h1>
          <p className="lesson-summary">{lesson.summary}</p>
          <div className="lesson-meta-row">
            <Badge className="rounded-full bg-[rgb(255_255_255_/_0.04)] px-3 py-1 text-[0.68rem] uppercase tracking-[0.14em] text-[rgb(243_239_230_/_0.78)]">
              lesson {lesson.order.toString().padStart(2, '0')}
            </Badge>
            <Badge className="rounded-full bg-[rgb(255_255_255_/_0.04)] px-3 py-1 text-[0.68rem] uppercase tracking-[0.14em] text-[rgb(243_239_230_/_0.78)]">
              {lesson.duration}
            </Badge>
            <Badge className="rounded-full bg-[rgb(255_255_255_/_0.04)] px-3 py-1 text-[0.68rem] uppercase tracking-[0.14em] text-[rgb(243_239_230_/_0.78)]">
              {lesson.difficulty}
            </Badge>
          </div>
          <Separator className="mt-5 bg-[rgb(162_143_108_/_0.12)]" />
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
        </CardContent>
      </Card>

      <div aria-hidden="true" className="lesson-splitter" data-splitter />

      <LessonWorkbench lesson={lesson} />
    </section>
  )
}
