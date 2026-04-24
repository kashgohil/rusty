FROM rust:1-bookworm AS builder

WORKDIR /app

COPY apps/api/Cargo.toml apps/api/Cargo.lock apps/api/

RUN mkdir -p apps/api/src && printf "fn main() {}\n" > apps/api/src/main.rs
RUN cargo build --release --manifest-path apps/api/Cargo.toml

COPY apps/api/src apps/api/src
RUN touch apps/api/src/main.rs

RUN cargo build --release --manifest-path apps/api/Cargo.toml

FROM rust:1-bookworm

RUN rustup component add rust-analyzer

WORKDIR /app/apps/api

COPY --from=builder /app/apps/api/target/release/rust-learning-api /usr/local/bin/rust-learning-api
COPY packages/lesson-content/src/lessons.json /app/packages/lesson-content/src/lessons.json

RUN mkdir -p /app/apps/api/data

EXPOSE 9092

CMD ["rust-learning-api"]
