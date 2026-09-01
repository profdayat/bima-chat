.PHONY: dev dev-stop prod-infra prod-deploy prod-status

dev:
	@echo "Starting development environment..."
	docker compose -f deployments/docker-compose.yml -f deployments/docker-compose.dev.yml up -d
	@echo "Dev server available at http://localhost:5173"
	@echo "API available at http://localhost:8080/api/swagger"

dev-stop:
	@echo "Stopping development environment..."
	docker compose -f deployments/docker-compose.yml -f deployments/docker-compose.dev.yml down

prod-infra:
	@echo "Setting up production infrastructure..."
	docker compose -f deployments/docker-compose.yml -f deployments/docker-compose.prod.yml up -d chat-nginx postgres redis

prod-deploy:
	@echo "Deploying production blue-green..."
	./scripts/deploy-blue-green.sh

prod-status:
	@echo "Current active environment:"
	@cat .active_env || echo "Not deployed yet"
	@echo "\nContainer status:"
	@docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "bun-chat|chat-nginx|postgres|redis"
