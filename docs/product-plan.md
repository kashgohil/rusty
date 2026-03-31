# Product Plan

## Vision

Build an interactive Rust learning platform that feels like a guided bootcamp, not just a code editor. The system should help a learner progress from zero to practical Rust by combining lessons, exercises, instant feedback, and a real development environment.

The first audience is the repo owner. The second audience is friends who should be able to join later without needing a separate local toolchain.

## Primary Outcomes

- Learn Rust through a sequenced curriculum
- Practice inside the browser with minimal setup
- Get immediate compiler, test, and LSP feedback
- Reuse the same platform with other learners
- Build something that can evolve into a public teaching tool

## Core User Experience

Each lesson page should include:

- an explanation of the concept
- a code editor with starter files
- run and test actions
- output and diagnostics panels
- hints and solution reveal
- completion state and next-step navigation

## Product Pillars

### 1. Guided Learning

The platform must provide sequence and structure. Random examples are not enough. Learners should know what to do next and why it matters.

### 2. Real Tooling

The editor should feel close to a real Rust environment. LSP-based feedback and accurate compiler messages are part of the learning value.

### 3. Safe Execution

Because code will be compiled and run from the browser, execution must happen inside a locked-down service with strict resource limits.

### 4. Shareability

Lessons should have clean URLs and should eventually support persisted progress, cohorts, and collaborative learning.

## MVP Scope

The MVP should optimize for a working learning loop rather than full platform complexity.

Included:

- landing page
- curriculum index
- lesson page template
- browser editor
- starter code loading
- run code flow
- output panel
- local progress persistence

Deferred:

- multi-user auth
- server-side progress
- group features
- advanced analytics
- collaborative editing

## Feature Roadmap

### Phase 1: Foundation

- repo structure
- lesson schema
- content authoring conventions
- curriculum pages
- editor shell

### Phase 2: Interactive Coding

- Monaco integration
- per-lesson files
- compile/run endpoint
- stdout/stderr display
- error presentation

### Phase 3: Bootcamp Mechanics

- exercise tests
- hidden checks
- hints
- solution reveal
- completion tracking

### Phase 4: IDE Experience

- LSP integration
- inline diagnostics
- autocomplete
- hover documentation
- formatting support

### Phase 5: Sharing

- user accounts
- saved workspaces
- friend invites
- cohort pages
- public lesson sharing

## Risks

### Runner Security

Arbitrary code execution is the highest-risk part of the system. The runner must be isolated from the host, have no network access, and enforce CPU, memory, and time limits.

### LSP Complexity

Remote `rust-analyzer` integration is achievable, but it adds operational complexity around workspace sync, diagnostics, and editor protocol translation.

### Scope Creep

It is easy to accidentally build a generic IDE instead of a learning platform. Lesson quality and feedback loops should stay ahead of platform complexity.

## Success Criteria

The first meaningful success state is:

- a learner can open a lesson
- edit starter Rust code in the browser
- run the code
- see compiler and runtime output
- complete an exercise
- move to the next lesson

The second success state is:

- a friend can use the same system through a URL and complete lessons without local setup
