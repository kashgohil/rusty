# Curriculum

## Track Goal

Take a learner from Rust basics to the point where they can build small real projects and understand the language model well enough to keep learning independently.

## Stage 1: Foundations

### 1. Hello Rust

- toolchain overview
- `fn main`
- `println!`
- variables and immutability

### 2. Basic Types

- integers
- floats
- booleans
- chars
- tuples
- arrays

### 3. Control Flow

- `if`
- `loop`
- `while`
- `for`
- `match` introduction

## Stage 2: Ownership Model

### 4. Ownership

- moves
- scopes
- drop behavior

### 5. Borrowing

- references
- mutable references
- borrowing rules

### 6. Slices and Strings

- `String`
- string slices
- array slices
- common string pitfalls

## Stage 3: Data Modeling

### 7. Structs

- named structs
- tuple structs
- methods

### 8. Enums and Pattern Matching

- enum design
- `Option`
- `Result`
- expressive `match`

### 9. Collections

- `Vec`
- `HashMap`
- iteration patterns

## Stage 4: Error Handling and Modularity

### 10. Error Handling

- `Result`
- `?`
- recoverable vs unrecoverable errors

### 11. Modules and Crates

- module system
- visibility
- crate structure

### 12. Testing

- unit tests
- integration tests
- test-driven exercises

## Stage 5: Abstraction

### 13. Generics

- generic functions
- generic structs

### 14. Traits

- defining traits
- implementing traits
- trait bounds

### 15. Lifetimes

- why lifetimes exist
- annotation basics
- common patterns

## Stage 6: Practical Rust

### 16. Iterators and Closures

- iterator adapters
- closures
- ownership interactions

### 17. Smart Pointers

- `Box`
- `Rc`
- `RefCell`
- when not to use them

### 18. Concurrency

- threads
- channels
- `Send` and `Sync` intuition

### 19. Async Basics

- futures intuition
- async functions
- executors at a high level

## Stage 7: Projects

### 20. Build a CLI

- argument parsing
- file I/O
- error handling in practice

### 21. Build a Small API

- routing
- handlers
- serialization

### 22. Final Project

- choose a small but complete Rust app
- combine testing, modules, error handling, and data modeling

## Lesson Template

Each lesson should include:

- learning objective
- short concept explanation
- starter code
- one guided exercise
- one challenge exercise
- hints
- validation tests
- solution

## Delivery Notes

Early lessons should minimize friction and maximize visible wins. Ownership, borrowing, and lifetimes should be taught with increasingly concrete exercises, not long theory blocks.
