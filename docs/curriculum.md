# Curriculum

## Bootcamp Goal

Take a learner from "I have never seriously used Rust" to "I can design, build, debug, and ship non-trivial Rust software with confidence."

This bootcamp should not feel like a syntax catalog. It should feel like a guided transformation:

- from curiosity to fluency
- from toy snippets to real projects
- from copying patterns to reasoning about tradeoffs
- from beginner confusion to professional Rust instincts

The end state is not just knowing Rust keywords. The end state is being able to build production-style Rust programs, read unfamiliar Rust code, and keep learning independently.

## Curriculum Principles

The content should be:

- detailed enough that beginners are not left guessing
- playful enough that the experience does not feel academic or dry
- rigorous enough that learners build real engineering instincts
- project-driven enough that every major concept gets used in context

Every part of the curriculum should reinforce four things:

1. Mental models
2. Compiler fluency
3. Debugging ability
4. Project-building confidence

## Learning Experience Design

Each lesson should teach one core idea well, not five ideas badly.

Each lesson should include:

1. Hook
   A bug, story, weird compiler message, or practical scenario that makes the lesson feel necessary.
2. Concept
   A concise explanation of the core idea with strong mental models.
3. Worked Example
   A full example the learner can run and inspect before editing anything.
4. Guided Exercise
   A tightly scoped task with hints and clear success criteria.
5. Debug Exercise
   Broken code the learner must fix by reading compiler output and reasoning carefully.
6. Challenge
   A harder task with less scaffolding.
7. Review
   Key takeaways, common traps, and a short mental model recap.
8. Checkpoint
   Automated validation, test feedback, and completion tracking.

## Difficulty Curve

The bootcamp should escalate in five layers:

1. Guided
   Small wins, tight scaffolding, visible results.
2. Assisted
   More open coding, but still with hints and partial structure.
3. Debugging
   Learners fix broken or incomplete code and interpret compiler feedback.
4. Design
   Learners choose data structures, module layouts, and abstractions.
5. Build
   Learners ship complete projects with architecture and tradeoffs.

## Track Overview

The curriculum should be organized into five major tracks.

### Track 1: Rust Launchpad

Goal:
Give the learner momentum fast. Remove fear, create early wins, and make the terminal + Cargo workflow feel normal.

Learner outcome:
They can write and run basic Rust programs, understand the shape of Rust code, and feel comfortable experimenting.

Modules:

#### 1. Welcome to Rust

- what Rust is good at
- how the toolchain works
- `rustup`, `cargo`, `rustc`
- project structure
- first program

Lessons:

- Your First Rust Program
- Cargo Without Fear
- Expressions, Statements, and `main`

#### 2. Values, Variables, and Types

- immutability and `mut`
- scalar and compound types
- type inference
- explicit annotations when they help

Lessons:

- Variables and Immutability
- Numbers, Booleans, Chars, Tuples, Arrays
- Let the Compiler Infer, Then Prove It

#### 3. Control Flow and Functions

- `if`, `loop`, `while`, `for`
- expressions vs statements
- function signatures
- returning values

Lessons:

- Ifs, Loops, and Repetition
- Functions That Return Real Values
- Pattern Warmup With `match`

#### 4. Strings and Collections Starter Pack

- `String` vs `&str`
- vectors
- simple iteration
- ownership preview without going deep yet

Lessons:

- Strings Are Not Just Strings
- Vectors and Basic Iteration
- Mini Lab: Build a Tiny Text Game

Track boss fight:

- Build a polished guessing game remix with scoring, replay logic, and clean functions.

### Track 2: The Rust Brain Rewrite

Goal:
Teach the Rust mental model properly. This is the heart of the bootcamp.

Learner outcome:
They stop fighting ownership blindly and start understanding why the compiler is protecting them.

Modules:

#### 5. Ownership

- stack vs heap intuition
- moves
- scope and drop
- cloning deliberately

Lessons:

- Ownership: The Rule That Changes Everything
- Moves, Copies, and Why Your Value Vanished
- Clone Is Not a Magic Eraser

#### 6. Borrowing and References

- shared vs mutable borrowing
- borrow rules
- aliasing and mutation
- reading compiler errors usefully

Lessons:

- Borrowing Without Panic
- Mutable References and Exclusive Access
- Why This Borrow Fails

#### 7. Slices and Strings Deep Dive

- string slices
- array slices
- UTF-8 gotchas
- APIs that return references

Lessons:

- Slices: Borrowing Part of a Value
- UTF-8, Bytes, and Rust Being Correct on Purpose
- Build a Safe String Utility Toolkit

#### 8. Enums, `Option`, and `Result`

- modeling state with enums
- expressive `match`
- avoiding null-style thinking
- handling failure explicitly

Lessons:

- Enums as Better Design
- `Option` and the End of Null Guessing
- `Result` and Recoverable Failure

#### 9. Error Handling

- `panic!` vs recoverable errors
- `?`
- propagating context
- designing error-friendly functions

Lessons:

- Error Handling That Scales
- The `?` Operator, Properly Understood
- Refactor a Messy Program Into a Safer One

Track boss fight:

- Build a small text-processing CLI or todo engine with parsing, validation, and robust error handling.

### Track 3: Rust Design and Abstraction

Goal:
Move from "I can make code compile" to "I can design a Rust codebase."

Learner outcome:
They can model domains, split code into modules, write tests, and build reusable abstractions.

Modules:

#### 10. Structs and Methods

- named and tuple structs
- `impl`
- methods vs associated functions
- domain modeling

Lessons:

- Structs as Real Data Models
- Methods, Constructors, and Invariants
- Refactor Primitive Soup Into Structs

#### 11. Modules and Crates

- `mod`, `use`, visibility
- crate structure
- organizing multi-file code
- API boundaries

Lessons:

- Modules Without Mystery
- Public vs Private Design
- Organize a Growing Codebase

#### 12. Testing and TDD

- unit tests
- integration tests
- red-green-refactor
- testable design

Lessons:

- Write Tests Before You Trust Yourself
- Integration Tests for Real Workflows
- TDD a Small Feature End to End

#### 13. Generics and Traits

- generic functions and structs
- trait definitions and implementations
- trait bounds
- behavior-oriented design

Lessons:

- Generics Without Overengineering
- Traits as Contracts
- Trait Bounds and Reusable APIs

#### 14. Iterators and Closures

- closures and captures
- iterator adapters
- expressive pipelines
- when loops are clearer

Lessons:

- Closures and Captured State
- Iterators That Read Like Intent
- Refactor Imperative Code Into Iterator Pipelines

Track boss fight:

- Build a multi-file inventory system, rules engine, or markdown analyzer with tests and clean module boundaries.

### Track 4: Systems Rust

Goal:
Take the learner into the harder parts of Rust that separate casual users from serious engineers.

Learner outcome:
They can reason about lifetimes, shared ownership, interior mutability, concurrency, and async without hand-waving.

Modules:

#### 15. Lifetimes

- lifetimes as relationships
- borrowed outputs
- struct lifetimes
- avoiding over-annotation

Lessons:

- Lifetimes as Contracts, Not Decorations
- Returning References Safely
- Lifetime Errors You Will Definitely See

#### 16. Smart Pointers and Interior Mutability

- `Box`
- `Rc` and `Arc`
- `RefCell` and `Mutex`
- choosing the right ownership tool

Lessons:

- Smart Pointers for Real Problems
- Shared Ownership Without Chaos
- Interior Mutability and Runtime Borrow Checking

#### 17. Concurrency

- threads
- channels
- message passing
- `Send` and `Sync` intuition
- race avoidance mindset

Lessons:

- Threads and Shared Work
- Channels and Safer Coordination
- Concurrency Without Guessing

#### 18. Async Rust

- futures intuition
- async functions
- executors and runtimes
- I/O-bound concurrency
- async tradeoffs

Lessons:

- Async Rust Without Fake Understanding
- Await, Futures, and Scheduling
- Build a Concurrent Fetcher

#### 19. Performance and Memory Awareness

- allocation costs
- borrowing for performance
- avoiding accidental clones
- profiling mindset
- zero-cost abstraction intuition

Lessons:

- Rust Performance Basics
- Spot the Hidden Allocation
- Refactor for Speed Without Losing Clarity

Track boss fight:

- Build a concurrent job runner, cache, or async data pipeline with performance-aware design.

### Track 5: Production Rust

Goal:
Turn fluency into real-world output. Learners should ship complete, portfolio-grade projects.

Learner outcome:
They can build, test, structure, and extend complete Rust applications across different domains.

Modules:

#### 20. CLI Engineering

- argument parsing
- config files
- file I/O
- user-facing errors
- good terminal UX

Lessons:

- Build a CLI People Would Actually Use
- Config, Flags, and File I/O
- Error Messages That Respect the User

#### 21. Data and Serialization

- `serde`
- JSON, TOML, YAML basics
- structured config
- input/output contracts

Lessons:

- Serialize and Deserialize With Confidence
- Data Shapes and Validation
- Build a Config-Driven Tool

#### 22. Web APIs With Rust

- HTTP basics in practice
- routing
- handlers
- JSON responses
- state and dependency boundaries

Lessons:

- Your First Rust API
- Request Handling and Structured Responses
- Build a Small Service Cleanly

#### 23. Persistence and Application Architecture

- basic persistence choices
- separating domain and transport layers
- configuration and environment handling
- service structure

Lessons:

- Application Boundaries That Stay Sane
- Persistence Without Spaghetti
- Refactor Toward a Maintainable Service

#### 24. Shipping and Observability

- logs
- errors in production
- test strategy
- deployment mindset
- hardening small apps

Lessons:

- Make It Observable
- Make It Reliable
- Make It Shippable

Track boss fight:

- Build and harden a complete Rust service or tool with tests, logging, configuration, and deployment notes.

## Project Ladder

The bootcamp should not end in one big final project only. It should build up through increasingly serious project work.

### Project 1: CLI Power Tool

Examples:

- smart todo manager
- grep-style search tool
- note-taking CLI
- habit tracker

Required concepts:

- functions
- structs
- modules
- error handling
- file I/O
- tests

### Project 2: Service or API

Examples:

- bookmark manager API
- pastebin backend
- mini inventory service
- learning journal backend

Required concepts:

- routing
- JSON serialization
- application structure
- validation
- persistence basics
- integration tests

### Project 3: Systems or Performance Project

Examples:

- tiny Redis-like cache
- concurrent file indexer
- async fetch-and-process engine
- plugin-capable task runner

Required concepts:

- concurrency or async
- lifetimes and ownership under pressure
- performance awareness
- modular design
- debugging and testing

### Final Capstone

The learner chooses one of several serious capstone paths:

- developer tooling
- backend service
- systems utility
- data processing tool

Each capstone should include:

- product spec
- milestones
- acceptance tests
- extension ideas
- optional stretch goals
- "production-grade" hardening tasks

## Lesson Content Patterns

To keep the bootcamp lively and memorable, lessons should rotate between formats.

Use these patterns repeatedly:

- predict the output
- will this compile?
- debug the borrow checker
- refactor this ugly code
- choose the right data model
- speed challenge
- compiler boss fight

This matters because Rust is learned as much through error interpretation and refactoring as through fresh code writing.

## Tone and Style

The content should be technically precise but not sterile.

Good tone:

- sharp
- playful
- direct
- honest about difficulty
- confident without being condescending

Avoid:

- textbook language
- overly formal exposition
- giant theory dumps
- abstract explanations without runnable examples

## Approximate Scope

Target size for the bootcamp:

- 5 tracks
- 20 to 24 modules
- 40 to 60 full lessons
- 3 major guided projects
- 1 capstone

This is enough to take a committed learner from novice to advanced intermediate or early professional Rust capability.

## Recommended Next Curriculum Work

After this plan, the next content steps should be:

1. Define the canonical lesson schema in the content system.
2. Fully outline the first 10 lessons in detail.
3. Design the three major projects with milestones and validation strategy.
4. Add explicit "compiler fluency" lessons where learners learn to read and use Rust errors well.
5. Add review checkpoints at the end of each track.
