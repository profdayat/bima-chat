#!/bin/bash
set -e

ENV_FILE="./.active_env"
COMPOSE_FILE="deployments/docker-compose.yml"
NGINX_CONF="deployments/nginx/default.conf"

# Default to blue if no active_env file
if [ ! -f "$ENV_FILE" ]; then
    echo "blue" > "$ENV_FILE"
fi

ACTIVE_ENV=$(cat "$ENV_FILE")

if [ "$ACTIVE_ENV" = "blue" ]; then
    IDLE_ENV="green"
else
    IDLE_ENV="blue"
fi

echo "=========================================================="
echo "      BIMA CHAT - ZERO DOWNTIME BLUE-GREEN DEPLOYMENT     "
echo "=========================================================="
echo "  Active Environment : $ACTIVE_ENV"
echo "  Deploying Target   : $IDLE_ENV"
echo "=========================================================="

# 1. Start or ensure persistent infra (Postgres, Redis, Nginx)
echo "📦 Ensuring infrastructure (Postgres, Redis, Nginx) is up..."
docker compose -f $COMPOSE_FILE up -d postgres redis

# 2. Build and start the idle pair (backend + frontend)
echo "🚀 Building and starting $IDLE_ENV environment..."
docker compose -f $COMPOSE_FILE --profile manual up -d --build "backend-$IDLE_ENV" "frontend-$IDLE_ENV"

# 3. Health check the idle backend container
echo "⏳ Verifying health of $IDLE_ENV environment..."
MAX_ATTEMPTS=25
ATTEMPTS=0
HEALTHY=false

while [ $ATTEMPTS -lt $MAX_ATTEMPTS ]; do
    STATUS=$(docker exec "bima-chat-backend-$IDLE_ENV" wget -q -O - http://localhost:8080/api/chat/channels 2>/dev/null | grep -o 'general' || echo "")
    
    if [ "$STATUS" = "general" ]; then
        HEALTHY=true
        break
    fi
    
    echo "  Waiting for bima-chat-backend-$IDLE_ENV... (Attempt $((ATTEMPTS+1))/$MAX_ATTEMPTS)"
    sleep 2
    ATTEMPTS=$((ATTEMPTS+1))
done

if [ "$HEALTHY" = false ]; then
    echo "❌ Error: $IDLE_ENV environment failed health check. Rolling back!"
    docker compose -f $COMPOSE_FILE stop "backend-$IDLE_ENV" "frontend-$IDLE_ENV"
    exit 1
fi

echo "✅ $IDLE_ENV environment is healthy and responding!"

# 4. Start Nginx if not already running
docker compose -f $COMPOSE_FILE up -d chat-nginx

# 5. Switch Nginx configuration to point to the new IDLE environment
echo "🔄 Switching Nginx upstream traffic to $IDLE_ENV..."
sed -i "s/server bima-chat-backend-$ACTIVE_ENV:8080/server bima-chat-backend-$IDLE_ENV:8080/g" "$NGINX_CONF"
sed -i "s/server bima-chat-frontend-$ACTIVE_ENV:5173/server bima-chat-frontend-$IDLE_ENV:5173/g" "$NGINX_CONF"

# 6. Hot-reload Nginx with zero downtime
echo "⚡ Hot-reloading Nginx (Zero Downtime)..."
docker exec bima-chat-nginx nginx -s reload 2>/dev/null || docker compose -f $COMPOSE_FILE restart chat-nginx

# 7. Gracefully stop the old ACTIVE environment
echo "🛑 Stopping old $ACTIVE_ENV environment..."
docker compose -f $COMPOSE_FILE stop "backend-$ACTIVE_ENV" "frontend-$ACTIVE_ENV" 2>/dev/null || true

# 8. Update the active environment marker
echo "$IDLE_ENV" > "$ENV_FILE"

echo "=========================================================="
echo "🎉 SUCCESS: Deployment complete! Active environment is $IDLE_ENV."
echo "=========================================================="
