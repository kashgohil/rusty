FROM rust:1-bookworm AS builder

WORKDIR /app

COPY apps/runner/Cargo.toml apps/runner/Cargo.lock apps/runner/

RUN mkdir -p apps/runner/src && printf "fn main() {}\n" > apps/runner/src/main.rs
RUN cargo build --release --manifest-path apps/runner/Cargo.toml

COPY apps/runner apps/runner

RUN cargo build --release --manifest-path apps/runner/Cargo.toml

FROM rust:1-bookworm

WORKDIR /app/apps/runner

COPY --from=builder /app/apps/runner/target/release/rust-learning-runner /usr/local/bin/rust-learning-runner

EXPOSE 9091

CMD ["rust-learning-runner"]
