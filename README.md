# Rust Learning Bootcamp

An interactive Rust learning platform designed for self-study and for sharing with friends.

## Goals

- Teach Rust through structured lessons and hands-on exercises
- Provide an in-browser IDE for editing and running Rust code
- Support language tooling through LSP integration
- Make lessons shareable and progress trackable
- Keep the architecture safe for public code execution

## Planned Stack

- Frontend: TanStack Start with Vite
- Editor: Monaco Editor
- Language support: `rust-analyzer` exposed through an LSP service
- Backend API: Rust service for lesson data, progress, and orchestration
- Runner: isolated Rust execution service for compile/run/test flows
- Content: Markdown or MDX lessons plus structured exercise metadata

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
- progress tracking

## Delivery Order

1. Lesson viewer and curriculum structure
2. Monaco-based editor inside lessons
3. Compile and run flow through the runner service
4. Exercise validation and progress tracking
5. LSP support via `rust-analyzer`
6. Sharing, accounts, cohorts, and collaboration features

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
