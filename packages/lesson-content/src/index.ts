import type { Lesson, LessonStage } from '@rust-learning/shared-types'

export const stageOrder: LessonStage[] = [
  'Foundations',
  'Ownership Model',
  'Data Modeling',
  'Practical Rust',
]

export const curriculum: Lesson[] = [
  {
    slug: 'hello-rust',
    order: 1,
    stage: 'Foundations',
    title: 'Hello Rust',
    summary: 'Orient the learner around main, println!, and the shape of a basic Rust program.',
    difficulty: 'Intro',
    duration: '20 min',
    objectives: [
      'Understand the structure of a Rust binary entry point',
      'Use println! with interpolated values',
      'Get comfortable editing and rerunning small examples',
    ],
    exercise: {
      fileName: 'main.rs',
      prompt: 'Print your name and one reason you want to learn Rust.',
      starterCode: `fn main() {\n    let learner = "friend";\n    println!("Hello, {learner}!");\n}\n`,
      hint: 'Change the string value and add a second println! line.',
      success: 'The program compiles and prints two custom lines of output.',
    },
  },
  {
    slug: 'ownership-basics',
    order: 2,
    stage: 'Ownership Model',
    title: 'Ownership Basics',
    summary: 'Introduce moves, scope, and why Rust cares about who owns a value.',
    difficulty: 'Core',
    duration: '35 min',
    objectives: [
      'Recognize when a value moves',
      'Explain why a moved value can no longer be used',
      'Use cloning intentionally instead of accidentally',
    ],
    exercise: {
      fileName: 'main.rs',
      prompt: 'Fix the moved-value error without removing the second print statement.',
      starterCode: `fn main() {\n    let message = String::from("ownership matters");\n    let moved = message;\n\n    println!("{moved}");\n    println!("{message}");\n}\n`,
      hint: 'Either borrow or clone. Pick the reasoned tradeoff, not a random fix.',
      success: 'The learner can explain why the chosen fix works.',
    },
  },
  {
    slug: 'borrowing-and-references',
    order: 3,
    stage: 'Ownership Model',
    title: 'Borrowing and References',
    summary: 'Teach immutable and mutable references through small concrete examples.',
    difficulty: 'Core',
    duration: '40 min',
    objectives: [
      'Pass borrowed values into functions',
      'Identify the difference between mutable and immutable references',
      'Avoid multiple mutable borrows at the same time',
    ],
    exercise: {
      fileName: 'main.rs',
      prompt: 'Update the helper function so it can inspect a String without taking ownership.',
      starterCode: `fn print_length(text: String) {\n    println!("Length: {}", text.len());\n}\n\nfn main() {\n    let note = String::from("borrow me");\n    print_length(note);\n    println!("{note}");\n}\n`,
      hint: 'The function does not need ownership. Its parameter type should say that.',
      success: 'The helper compiles and the original String remains usable afterward.',
    },
  },
  {
    slug: 'structs-and-methods',
    order: 4,
    stage: 'Data Modeling',
    title: 'Structs and Methods',
    summary: 'Move from loose variables to named data structures with implementation blocks.',
    difficulty: 'Core',
    duration: '45 min',
    objectives: [
      'Define a struct with named fields',
      'Implement methods with impl blocks',
      'Use self to keep data and behavior aligned',
    ],
    exercise: {
      fileName: 'main.rs',
      prompt: 'Add a method that returns a formatted summary of the lesson.',
      starterCode: `struct Lesson {\n    title: String,\n    minutes: u32,\n}\n\nfn main() {\n    let lesson = Lesson {\n        title: String::from("Structs"),\n        minutes: 45,\n    };\n\n    println!("TODO");\n}\n`,
      hint: 'The logic belongs on the type. Use an impl block.',
      success: 'The learner can call a method on Lesson and print a useful summary.',
    },
  },
  {
    slug: 'results-and-errors',
    order: 5,
    stage: 'Practical Rust',
    title: 'Results and Errors',
    summary: 'Treat recoverable failure as part of the type system instead of an afterthought.',
    difficulty: 'Core',
    duration: '45 min',
    objectives: [
      'Read a function signature that returns Result',
      'Use match or ? to handle success and failure',
      'Differentiate recoverable and unrecoverable errors',
    ],
    exercise: {
      fileName: 'main.rs',
      prompt: 'Return a Result from parse_age and handle bad input in main.',
      starterCode: `fn parse_age(input: &str) -> u8 {\n    input.parse().unwrap()\n}\n\nfn main() {\n    let age = parse_age("twelve");\n    println!("Age: {age}");\n}\n`,
      hint: 'Replace unwrap-driven control flow with an explicit Result path.',
      success: 'Bad input no longer crashes the program and the outcome is explained clearly.',
    },
  },
  {
    slug: 'build-a-cli',
    order: 6,
    stage: 'Practical Rust',
    title: 'Build a CLI',
    summary: 'Combine parsing, file I/O, and error handling in a small end-to-end project.',
    difficulty: 'Stretch',
    duration: '60 min',
    objectives: [
      'Read command-line arguments',
      'Open and inspect a file',
      'Shape a small program with functions and Result-based errors',
    ],
    exercise: {
      fileName: 'main.rs',
      prompt: 'Extend the starter to read a file path argument and print the line count.',
      starterCode: `fn main() {\n    println!("next: read args and count lines");\n}\n`,
      hint: 'Break the job into steps: args, read file, count lines, print result.',
      success: 'A learner can point the program at a text file and get a useful count back.',
    },
  },
]

export function getLessonBySlug(slug: string) {
  return curriculum.find((lesson) => lesson.slug === slug)
}
