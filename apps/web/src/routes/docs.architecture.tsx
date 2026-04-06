import { createFileRoute } from '@tanstack/react-router'
import {
  Card,
  CardContent,
} from '~/components/ui/card'
import { Separator } from '~/components/ui/separator'

export const Route = createFileRoute('/docs/architecture')({
  component: ArchitectureDocPage,
})

function ArchitectureDocPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 pb-24 pt-10">
      <section className="section-heading">
        <p className="eyebrow">Architecture</p>
        <h1>The platform is split so learning UX, execution, and tooling can evolve independently.</h1>
        <p>
          This route now lives inside the app, so navigation stays client-side and
          the docs page no longer triggers a full reload.
        </p>
      </section>

      <Card className="stage-panel">
        <CardContent className="px-6 py-6">
        <div className="objective-block">
          <h2>High-Level System</h2>
          <p>The platform should be split into three main applications:</p>
        </div>

        <Separator className="bg-[rgb(162_143_108_/_0.12)]" />

        <div className="objective-block">
          <h2>`apps/web`</h2>
          <ul>
            <li>Render marketing and lesson pages.</li>
            <li>Host the in-browser editor.</li>
            <li>Show diagnostics, output, hints, and progress.</li>
            <li>Talk to the API and runner services.</li>
          </ul>
          <p>Planned stack: TanStack Start with Vite, React, and Monaco Editor.</p>
        </div>

        <div className="objective-block">
          <h2>`apps/api`</h2>
          <ul>
            <li>Serve lesson metadata and curriculum structure.</li>
            <li>Persist user progress.</li>
            <li>Manage execution requests and result records.</li>
            <li>Expose stable interfaces to the frontend.</li>
          </ul>
          <p>Planned stack: Rust with `axum`, with lightweight storage first.</p>
        </div>

        <div className="objective-block">
          <h2>`apps/runner`</h2>
          <ul>
            <li>Receive source files and execution settings.</li>
            <li>Build and run Rust code in an isolated environment.</li>
            <li>Capture diagnostics, stdout, and stderr.</li>
            <li>Enforce time, memory, and process limits.</li>
          </ul>
          <p>Planned stack: Rust with Docker-based sandboxing initially.</p>
        </div>

        <div className="objective-block">
          <h2>Editor and LSP Model</h2>
          <p>
            The web editor should use Monaco. LSP support should come from a backend
            service that hosts `rust-analyzer` and bridges protocol traffic to the
            browser editor.
          </p>
          <ul>
            <li>Autocomplete</li>
            <li>Diagnostics</li>
            <li>Hover</li>
            <li>Go to definition</li>
            <li>Formatting</li>
          </ul>
        </div>

        <div className="objective-block">
          <h2>Lesson Content Model</h2>
          <p>
            Lessons should stay content-driven instead of being hardcoded into page
            components.
          </p>
          <ul>
            <li>slug</li>
            <li>title</li>
            <li>summary</li>
            <li>concepts covered</li>
            <li>starter files</li>
            <li>visible instructions</li>
            <li>hints</li>
            <li>validation tests</li>
            <li>optional solution files</li>
          </ul>
        </div>

        <div className="objective-block">
          <h2>Runner Flow</h2>
          <ol className="list-decimal space-y-2 pl-5 text-[rgb(243_239_230_/_0.68)]">
            <li>User edits lesson files in the browser.</li>
            <li>Frontend sends files to the API or runner.</li>
            <li>Runner creates an isolated temp workspace.</li>
            <li>Runner writes files and invokes Cargo.</li>
            <li>Runner returns compile status, diagnostics, stdout, stderr, and test results.</li>
          </ol>
        </div>

        <div className="objective-block">
          <h2>Security Constraints</h2>
          <ul>
            <li>No outbound network</li>
            <li>Resource quotas</li>
            <li>Execution timeout</li>
            <li>Process isolation</li>
            <li>Temporary filesystem only</li>
            <li>Cleanup after every run</li>
          </ul>
        </div>

        <div className="objective-block">
          <h2>Implementation Order</h2>
          <ol className="list-decimal space-y-2 pl-5 text-[rgb(243_239_230_/_0.68)]">
            <li>Define lesson content structure.</li>
            <li>Build the web lesson shell.</li>
            <li>Add local stubbed run flow.</li>
            <li>Add real runner service.</li>
            <li>Add validation tests.</li>
            <li>Add LSP integration.</li>
            <li>Add auth and sharing.</li>
          </ol>
        </div>
        </CardContent>
      </Card>
    </main>
  )
}
