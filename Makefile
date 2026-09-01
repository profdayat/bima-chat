.PHONY: help up down restart build logs ps update dev dev-stop

# Default target
help:
	@echo "=========================================================="
	@echo "            BIMA CHAT - MANAGEMENT COMMANDS               "
	@echo "=========================================================="
	@echo "  make up          : Build & jalankan semua service (Production/Standar)"
	@echo "  make down        : Hentikan semua service"
	@echo "  make restart     : Restart service tanpa rebuild"
	@echo "  make build       : Rebuild container jika ada update kode"
	@echo "  make update      : Git pull terbaru & rebuild container otomatis"
	@echo "  make logs        : Lihat realtime log container"
	@echo "  make ps          : Cek status container & port"
	@echo "  make dev         : Jalankan mode development dengan hot-reload"
	@echo "  make dev-stop    : Hentikan mode development"
	@echo "=========================================================="

# Production / Standar commands
up:
	@echo "🚀 Menjalankan BIMA Chat..."
	docker compose -f deployments/docker-compose.yml up -d --build

down:
	@echo "🛑 Menghentikan BIMA Chat..."
	docker compose -f deployments/docker-compose.yml down

restart:
	@echo "🔄 Me-restart container BIMA Chat..."
	docker compose -f deployments/docker-compose.yml restart

build:
	@echo "🔨 Me-rebuild container BIMA Chat..."
	docker compose -f deployments/docker-compose.yml build

update:
	@echo "📥 Mengambil kode terbaru dari Git & Rebuild..."
	git pull origin main
	docker compose -f deployments/docker-compose.yml up -d --build
	@echo "✅ Update BIMA Chat selesai!"

logs:
	docker compose -f deployments/docker-compose.yml logs -f --tail 50

ps:
	@docker compose -f deployments/docker-compose.yml ps

# Development commands
dev:
	@echo "🛠️ Menjalankan mode development..."
	docker compose -f deployments/docker-compose.yml -f deployments/docker-compose.dev.yml up -d

dev-stop:
	@echo "🛑 Menghentikan mode development..."
	docker compose -f deployments/docker-compose.yml -f deployments/docker-compose.dev.yml down
