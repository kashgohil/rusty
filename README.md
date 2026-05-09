# Rust Learning Bootcamp

An interactive Rust learning platform designed for self-study and for sharing with friends.

## Goals

- Teach Rust through structured lessons and hands-on exercises
- Provide an in-browser IDE for editing and running Rust code
- Support language tooling through LSP integration
- Make lessons shareable and progress trackable
- Keep the architecture safe for public code execution

## Current Stack

- Frontend: TanStack Start with Vite
- Editor: Monaco Editor
- Language support: `rust-analyzer` exposed through an LSP service
- Backend API: Rust service for lesson data, progress, and orchestration
- Runner: isolated Rust execution service for compile/run/test flows
- Content: structured lesson metadata with starter files, validation, hints, and solutions

## Repo Layout

```text
apps/
  web/       TanStack Start app
  api/       lesson and progress API
  runner/    isolated Rust execution service
packages/
  lesson-content/
  shared-types/
docs/
  product-plan.md
  architecture.md
  curriculum.md
```

## Product Direction

This project should behave like a guided Rust bootcamp rather than a generic code playground. Each lesson should combine:

- concise concept explanation
- starter code
- exercises
- validation tests
- hints
- solutions
- next-lesson guidance
- progress tracking

## Implemented Loop

The current app supports the first complete learning loop:

- roadmap and homepage resume actions
- per-learner progress links
- Monaco-based multi-file lesson workspaces
- run and check actions through the Rust runner
- LSP diagnostics, formatting, and editor navigation
- hints, read-only solution reveal, and apply-solution action
- completion state, reset behavior, and next-lesson navigation

Still future-facing:

- accounts and cohort management
- richer authored lesson explanations
- collaborative learning features
- hardened public deployment controls

## Local Development

Install dependencies once:

```bash
bun install
```

Run the full local stack:

```bash
bun run dev:full
```

That starts:

- `apps/web` on `http://127.0.0.1:9090`
- `apps/api` on `http://127.0.0.1:9092`
- `apps/runner` on `http://127.0.0.1:9091`

Build the services directly:

```bash
bun run build:web
bun run build:api
bun run build:runner
```

Run the web typecheck/build gate:

```bash
bun run check
```

Run the core learning-loop smoke test:

```bash
bun run smoke:learning-loop
```

The smoke test starts temporary API and runner processes, loads `hello-rust`,
runs edited Rust code, checks validation, persists completion progress, and reads
the progress back.

## Docker Compose

Bring up the stack with containers:

```bash
docker compose up --build
```

That publishes:

- `web` on `http://127.0.0.1:9090`
- `api` on `http://127.0.0.1:9092`
- `runner` on `http://127.0.0.1:9091`

The compose setup persists API progress data in a named Docker volume.
