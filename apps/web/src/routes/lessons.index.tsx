import { Link, createFileRoute } from '@tanstack/react-router'
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert'
import { Badge } from '~/components/ui/badge'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '~/components/ui/card'
import { useLessonProgress } from '~/utils/useLessonProgress'
import { useLessons } from '~/utils/useLessons'

export const Route = createFileRoute('/lessons/')({
  component: LessonsIndexPage,
})

function LessonsIndexPage() {
  const { progress } = useLessonProgress()
  const { lessons, isLoading, error } = useLessons()
  const stageOrder = Array.from(new Set(lessons.map((lesson) => lesson.stage)))

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
    <div className="space-y-10">
      {stageOrder.map((stage) => {
        const stageLessons = lessons.filter((lesson) => lesson.stage === stage)
        const completedCount = stageLessons.filter(
          (lesson) => progress[lesson.slug]?.status === 'completed',
        ).length

        return (
          <Card className="stage-panel" key={stage}>
            <div className="stage-header">
              <p className="eyebrow">{stage}</p>
              <Badge
                className="rounded-full border-[rgb(124_226_208_/_0.24)] bg-[rgb(124_226_208_/_0.08)] px-3 py-1 text-[0.72rem] tracking-[0.16em] text-[rgb(243_239_230_/_0.76)] uppercase"
                variant="outline"
              >
                {String(completedCount).padStart(2, '0')}/
                {String(stageLessons.length).padStart(2, '0')} complete
              </Badge>
            </div>
            <div className="lesson-grid">
              {stageLessons.map((lesson) => (
                <Link
                  className="block"
                  key={lesson.slug}
                  params={{ lessonSlug: lesson.slug }}
                  to="/lessons/$lessonSlug"
                >
                  <Card className="lesson-card">
                    <CardHeader className="px-5 pb-0">
                      <div className="lesson-card-top">
                        <span>{lesson.order.toString().padStart(2, '0')}</span>
                        <Badge
                          className="rounded-full border-[rgb(243_239_230_/_0.14)] bg-[rgb(255_255_255_/_0.03)] px-3 py-1 text-[0.68rem] tracking-[0.14em] text-[rgb(243_239_230_/_0.72)] uppercase"
                          variant="outline"
                        >
                          {progressLabel(progress[lesson.slug]?.status, lesson.duration)}
                        </Badge>
                      </div>
                      <CardTitle>{lesson.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="px-5 pt-0">
                      <p>{lesson.summary}</p>
                      <ul>
                        {lesson.objectives.slice(0, 3).map((objective) => (
                          <li key={objective}>{objective}</li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </Card>
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
