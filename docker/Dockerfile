# Stage 1: Build Frontend
FROM oven/bun:1.4-alpine AS frontend-builder
WORKDIR /build
COPY packages/frontend/package.json packages/frontend/bun.lockb ./packages/frontend/
RUN cd packages/frontend && bun install --frozen-lockfile
COPY packages/frontend ./packages/frontend
RUN cd packages/frontend && bun run build

# Stage 2: Build Backend
FROM oven/bun:1.4-alpine AS backend-builder
WORKDIR /build
COPY packages/backend/package.json packages/backend/bun.lockb ./packages/backend/
RUN cd packages/backend && bun install --frozen-lockfile
COPY packages/backend ./packages/backend
RUN cd packages/backend && bun build --compile --minify --target bun --outfile server ./src/index.ts

# Stage 3: Runtime
FROM alpine:3.21
RUN apk add --no-cache ca-certificates tzdata wget
WORKDIR /app
COPY --from=backend-builder /build/packages/backend/server /app/server
COPY --from=frontend-builder /build/packages/frontend/build /app/public
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s CMD wget --no-verbose --tries=1 --spider http://localhost:8080/api/swagger || exit 1
ENTRYPOINT ["/app/server"]
