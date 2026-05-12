FRONTEND_DIR = ./web/new
CLASSIC_FRONTEND_DIR = ./web/classic
BACKEND_DIR = .

.PHONY: all build-frontend start-backend dev dev-api dev-web

all: build-frontend start-backend

build-frontend:
	@echo "Building frontend..."
	@cd $(CLASSIC_FRONTEND_DIR) && bun install && VITE_REACT_APP_VERSION=$$(cat ../../VERSION) bun run build
	@cd $(FRONTEND_DIR) && npm install && npm run build

start-backend:
	@echo "Starting backend dev server..."
	@cd $(BACKEND_DIR) && go run main.go &

dev-api:
	@echo "Starting backend services (docker)..."
	@docker compose -f docker-compose.dev.yml up -d

dev-web:
	@echo "Starting frontend dev server..."
	@cd $(FRONTEND_DIR) && npm install && FLINT_BACKEND_BASE_URL=http://localhost:3000 npm run dev -- --port 3001

dev: dev-api dev-web
