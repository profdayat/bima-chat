.PHONY: help up down restart build logs ps update dev dev-stop

# Default target
help:
	@echo "=========================================================="
	@echo "            BIMA CHAT - MANAGEMENT COMMANDS               "
	@echo "=========================================================="
	@echo "  make update      : Git pull & Blue-Green deploy (ZERO DOWNTIME)"
	@echo "  make up          : Jalankan infrastruktur & Blue environment"
	@echo "  make down        : Hentikan semua service BIMA Chat"
	@echo "  make restart     : Restart Nginx & container aktif"
	@echo "  make logs        : Lihat live log container"
	@echo "  make ps          : Cek status container & port"
	@echo "  make dev         : Jalankan mode development dengan hot-reload"
	@echo "  make dev-stop    : Hentikan mode development"
	@echo "=========================================================="

# Zero-Downtime Blue-Green Update
update:
	@echo "📥 Mengambil kode terbaru dari Git..."
	git pull origin main || true
	@echo "🚀 Memulai proses Zero-Downtime Blue-Green Deployment..."
	./scripts/deploy-blue-green.sh

# Start standard environment
up:
	@echo "🚀 Menjalankan BIMA Chat..."
	docker compose -f deployments/docker-compose.yml up -d --build postgres redis backend-blue frontend-blue chat-nginx
	@echo "blue" > .active_env
	@echo "✅ BIMA Chat aktif di port 8095!"

down:
	@echo "🛑 Menghentikan BIMA Chat..."
	docker compose -f deployments/docker-compose.yml --profile manual down

restart:
	@echo "🔄 Me-restart BIMA Chat..."
	docker compose -f deployments/docker-compose.yml restart chat-nginx

logs:
	docker compose -f deployments/docker-compose.yml logs -f --tail 50

ps:
	@echo "=== CONTAINER STATUS ==="
	@docker compose -f deployments/docker-compose.yml ps
	@echo "=== ACTIVE ENVIRONMENT ==="
	@cat .active_env 2>/dev/null || echo "Unknown"

# Development commands
dev:
	@echo "🛠️ Menjalankan mode development..."
	docker compose -f deployments/docker-compose.yml -f deployments/docker-compose.dev.yml up -d

dev-stop:
	@echo "🛑 Menghentikan mode development..."
	docker compose -f deployments/docker-compose.yml -f deployments/docker-compose.dev.yml down
