# Architecture

## High-Level System

The platform should be split into three main applications:

## `apps/web`

Responsibilities:

- render marketing and lesson pages
- host the in-browser editor
- show diagnostics, output, hints, and progress
- talk to the API and runner services

Planned stack:

- TanStack Start with Vite
- React
- Monaco Editor

## `apps/api`

Responsibilities:

- serve lesson metadata and curriculum structure
- persist user progress
- manage execution requests and result records
- expose stable APIs to the frontend

Planned stack:

- Rust
- `axum`
- Postgres later, file or SQLite storage at first if needed

## `apps/runner`

Responsibilities:

- receive source files and execution settings
- build and run Rust code in an isolated environment
- capture compiler diagnostics, stdout, and stderr
- run exercise tests
- enforce time, memory, and process limits

Planned stack:

- Rust
- Docker-based sandbox initially
- stronger isolation later if needed

## Editor and LSP Model

The web editor should use Monaco. LSP support should be provided by a backend service that hosts `rust-analyzer` and communicates with the editor through an LSP bridge.

Capabilities to support:

- autocomplete
- diagnostics
- hover
- go to definition
- formatting

The LSP service should be added after compile/run works reliably. It is valuable, but it is not the first blocker for the MVP.

## Lesson Content Model

Lessons should be content-driven rather than hardcoded in the UI.

Each lesson should define:

- slug
- title
- summary
- concepts covered
- starter files
- visible instructions
- hints
- validation tests
- optional solution files

Suggested storage:

- prose in Markdown or MDX
- machine-readable exercise metadata in JSON

## Runner Flow

1. User edits lesson files in the browser
2. Frontend sends files to the API or runner
3. Runner creates an isolated temp workspace
4. Runner writes files and invokes Cargo
5. Runner returns:
   - compile success or failure
   - diagnostics
   - stdout
   - stderr
   - test results if requested

## Security Constraints

The runner must enforce:

- no outbound network
- resource quotas
- execution timeout
- process isolation
- temporary filesystem only
- cleanup after every run

## Monorepo Boundaries

Shared logic that crosses services should live in packages.

## `packages/shared-types`

- API contracts
- lesson schema types
- execution result shapes

## `packages/lesson-content`

- lesson files
- curriculum index
- exercise metadata

## Implementation Order

1. Define lesson content structure
2. Build the web lesson shell
3. Add local stubbed run flow
4. Add real runner service
5. Add validation tests
6. Add LSP integration
7. Add auth and sharing
