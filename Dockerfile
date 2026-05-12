FROM oven/bun:1@sha256:0733e50325078969732ebe3b15ce4c4be5082f18c4ac1a0f0ca4839c2e4e42a7 AS builder-frontend

WORKDIR /build
COPY web/classic/package.json .
COPY web/classic/bun.lock .
RUN bun install
COPY ./web/classic .
COPY ./VERSION .
RUN VITE_REACT_APP_VERSION=$(cat VERSION) bun run build

FROM node:24-bookworm-slim AS builder-frontend-new

WORKDIR /build
COPY web/new/package.json .
COPY web/new/package-lock.json .
RUN npm ci
COPY ./web/new .
RUN npm run build

FROM golang:1.26.1-alpine@sha256:2389ebfa5b7f43eeafbd6be0c3700cc46690ef842ad962f6c5bd6be49ed82039 AS builder2
ENV GO111MODULE=on CGO_ENABLED=0

ARG TARGETOS
ARG TARGETARCH
ENV GOOS=${TARGETOS:-linux} GOARCH=${TARGETARCH:-amd64}
ENV GOEXPERIMENT=greenteagc

WORKDIR /build

ADD go.mod go.sum ./
RUN go mod download

COPY . .
COPY --from=builder-frontend /build/dist ./web/classic/dist
COPY --from=builder-frontend-new /build/.next/standalone ./web/new/.next/standalone
COPY --from=builder-frontend-new /build/.next/static ./web/new/.next/standalone/.next/static
COPY --from=builder-frontend-new /build/public ./web/new/.next/standalone/public
RUN go build -ldflags "-s -w -X 'github.com/QuantumNous/new-api/common.Version=$(cat VERSION)'" -o new-api
RUN go build -ldflags "-s -w -X 'github.com/QuantumNous/new-api/common.Version=$(cat VERSION)'" -o new-api-migrator ./cmd/migrator

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
