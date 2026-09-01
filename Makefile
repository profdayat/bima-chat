.PHONY: help up down restart build logs ps update dev dev-stop

COMPOSE_CMD = docker compose --env-file .env -f deployments/docker-compose.yml

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

update:
	@echo "📥 Mengambil kode terbaru dari Git..."
	git pull origin main || true
	@echo "🚀 Memulai proses Zero-Downtime Blue-Green Deployment..."
	./scripts/deploy-blue-green.sh

up:
	@echo "🚀 Menjalankan BIMA Chat..."
	$(COMPOSE_CMD) up -d --build postgres redis backend-blue frontend-blue chat-nginx
	@echo "blue" > .active_env
	@echo "✅ BIMA Chat aktif di port 8095!"

down:
	@echo "🛑 Menghentikan BIMA Chat..."
	$(COMPOSE_CMD) --profile manual down

restart:
	@echo "🔄 Me-restart BIMA Chat..."
	$(COMPOSE_CMD) restart chat-nginx

logs:
	$(COMPOSE_CMD) logs -f --tail 50

ps:
	@echo "=== CONTAINER STATUS ==="
	@$(COMPOSE_CMD) ps
	@echo "=== ACTIVE ENVIRONMENT ==="
	@cat .active_env 2>/dev/null || echo "blue"

dev:
	@echo "🛠️ Menjalankan mode development..."
	$(COMPOSE_CMD) -f deployments/docker-compose.dev.yml up -d

dev-stop:
	@echo "🛑 Menghentikan mode development..."
	$(COMPOSE_CMD) -f deployments/docker-compose.dev.yml down
