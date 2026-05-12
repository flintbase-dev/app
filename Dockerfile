# syntax=docker/dockerfile:1.7

FROM oven/bun:1@sha256:0733e50325078969732ebe3b15ce4c4be5082f18c4ac1a0f0ca4839c2e4e42a7 AS builder-frontend

WORKDIR /build
COPY web/classic/package.json .
COPY web/classic/bun.lock .
RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --frozen-lockfile
COPY ./web/classic .
COPY ./VERSION .
RUN VITE_REACT_APP_VERSION=$(cat VERSION) bun run build

FROM node:24-bookworm-slim AS builder-frontend-new

WORKDIR /build
ENV NEXT_TELEMETRY_DISABLED=1
COPY web/new/package.json .
COPY web/new/package-lock.json .
RUN --mount=type=cache,target=/root/.npm \
    npm ci --no-audit --no-fund
COPY ./web/new .
RUN --mount=type=cache,target=/build/.next/cache \
    npm run build

FROM golang:1.26.1-alpine@sha256:2389ebfa5b7f43eeafbd6be0c3700cc46690ef842ad962f6c5bd6be49ed82039 AS builder2
ENV GO111MODULE=on CGO_ENABLED=0

ARG TARGETOS
ARG TARGETARCH
ENV GOOS=${TARGETOS:-linux} GOARCH=${TARGETARCH:-amd64}
ENV GOEXPERIMENT=greenteagc

WORKDIR /build

ADD go.mod go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod \
    go mod download

COPY VERSION .
COPY main.go .
COPY cmd ./cmd
COPY common ./common
COPY constant ./constant
COPY controller ./controller
COPY dto ./dto
COPY i18n ./i18n
COPY internal ./internal
COPY logger ./logger
COPY middleware ./middleware
COPY migrations ./migrations
COPY model ./model
COPY pkg ./pkg
COPY relay ./relay
COPY router ./router
COPY service ./service
COPY setting ./setting
COPY types ./types
COPY --from=builder-frontend /build/dist ./web/classic/dist
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    version="$(cat VERSION)" && \
    go build -ldflags "-s -w -X github.com/QuantumNous/new-api/common.Version=${version}" -o new-api && \
    go build -ldflags "-s -w -X github.com/QuantumNous/new-api/common.Version=${version}" -o new-api-migrator ./cmd/migrator
COPY --from=builder-frontend-new /build/.next/standalone ./web/new/.next/standalone
COPY --from=builder-frontend-new /build/.next/static ./web/new/.next/standalone/.next/static
COPY --from=builder-frontend-new /build/public ./web/new/.next/standalone/public

FROM node:24-bookworm-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates tzdata libasan8 wget \
    && rm -rf /var/lib/apt/lists/* \
    && update-ca-certificates

COPY --from=builder2 /build/new-api /
COPY --from=builder2 /build/new-api-migrator /
COPY --from=builder2 /build/migrations /migrations
COPY --from=builder2 /build/web/new/.next/standalone /web/new
ENV WEB_NEW_STANDALONE_DIR=/web/new
EXPOSE 3000
WORKDIR /data
ENTRYPOINT ["/new-api"]
