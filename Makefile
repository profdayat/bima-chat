.PHONY: help up down restart build logs ps update dev dev-stop backup

COMPOSE_CMD = docker compose --env-file .env -f deployments/docker-compose.yml

help:
	@echo "=========================================================="
	@echo "            BIMA CHAT - MANAGEMENT COMMANDS               "
	@echo "=========================================================="
	@echo "  make update      : Git pull & Blue-Green deploy (ZERO DOWNTIME)"
	@echo "  make backup      : Backup database PostgreSQL ke file .sql"
	@echo "  make up          : Jalankan infrastruktur & Blue environment"
	@echo "  make down        : Hentikan semua service BIMA Chat"
	@echo "  make restart     : Restart Nginx & container aktif"
	@echo "  make logs        : Lihat live log container"
	@echo "  make ps          : Cek status container & port"
	@echo "  make dev         : Jalankan mode development dengan hot-reload"
	@echo "  make dev-stop    : Hentikan mode development"
	@echo "=========================================================="

backup:
	@mkdir -p backups
	@echo "💾 Membuat cadangan (backup) database PostgreSQL..."
	@docker exec bima-chat-postgres pg_dump -U $$(grep -E '^DB_USER=' .env 2>/dev/null | cut -d '=' -f2 || echo bimachat_user) $$(grep -E '^DB_NAME=' .env 2>/dev/null | cut -d '=' -f2 || echo bima_chat_db) > backups/bima_chat_backup_$$(date +%Y%m%d_%H%M%S).sql
	@echo "✅ Backup berhasil disimpan di folder backups/!"

update:
	@mkdir -p backups
	@echo "💾 Auto-backup database sebelum update..."
	@docker exec bima-chat-postgres pg_dump -U $$(grep -E '^DB_USER=' .env 2>/dev/null | cut -d '=' -f2 || echo bimachat_user) $$(grep -E '^DB_NAME=' .env 2>/dev/null | cut -d '=' -f2 || echo bima_chat_db) > backups/bima_chat_autobackup_$$(date +%Y%m%d_%H%M%S).sql 2>/dev/null || echo "⚠️ Lewati backup jika container postgres belum running"
	@echo "📥 Mengambil kode terbaru dari Git..."
	git checkout -- deployments/nginx/default.conf 2>/dev/null || true
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
	@echo "🛠️ Menjalankan mode development (standalone backend + frontend + db)..."
	docker compose --env-file .env -f deployments/docker-compose.dev.yml up -d
	@echo "✅ Dev server aktif di http://localhost:8095 (Frontend) & http://localhost:8080 (Backend)!"

dev-stop:
	@echo "🛑 Menghentikan mode development..."
	docker compose --env-file .env -f deployments/docker-compose.dev.yml down

