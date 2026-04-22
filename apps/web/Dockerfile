FROM oven/bun:1.3.9 AS builder

WORKDIR /app

COPY package.json bun.lock ./
COPY apps/web/package.json apps/web/package.json
COPY packages/lesson-content/package.json packages/lesson-content/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json

RUN bun install

COPY . .

ARG VITE_API_URL=http://api:9092
ARG VITE_RUNNER_URL=http://runner:9091
ARG VITE_LSP_URL=http://api:9092

ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_RUNNER_URL=${VITE_RUNNER_URL}
ENV VITE_LSP_URL=${VITE_LSP_URL}

RUN bun run build:web

FROM oven/bun:1.3.9 AS runner

WORKDIR /app

COPY --from=builder /app/package.json /app/bun.lock ./
COPY --from=builder /app/apps/web/package.json apps/web/package.json
COPY --from=builder /app/apps/web/.output apps/web/.output

WORKDIR /app/apps/web

EXPOSE 3000

CMD ["bun", "run", "start"]
