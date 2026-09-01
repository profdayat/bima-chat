#!/bin/bash
set -e

ENV_FILE="./.env"
ACTIVE_FILE="./.active_env"
COMPOSE="docker compose --env-file $ENV_FILE -f deployments/docker-compose.yml"
NGINX_CONF="deployments/nginx/default.conf"

if [ ! -f "$ACTIVE_FILE" ]; then
    echo "blue" > "$ACTIVE_FILE"
fi

ACTIVE_ENV=$(cat "$ACTIVE_FILE")

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

# 1. Pastikan infra (Postgres, Redis) tetap berjalan
echo "📦 Ensuring infrastructure (Postgres, Redis) is up..."
$COMPOSE up -d postgres redis

# 2. Build dan jalankan environment idle (blue/green)
echo "🚀 Building and starting $IDLE_ENV environment..."
$COMPOSE --profile manual up -d --build "backend-$IDLE_ENV" "frontend-$IDLE_ENV"

# 3. Health check environment idle
echo "⏳ Verifying health of $IDLE_ENV environment..."
MAX_ATTEMPTS=25
ATTEMPTS=0
HEALTHY=false

while [ $ATTEMPTS -lt $MAX_ATTEMPTS ]; do
    STATUS=$(docker exec "bima-chat-backend-$IDLE_ENV" sh -c \
        'bun -e "fetch(\"http://localhost:8080/api/chat/channels\").then(r=>r.json()).then(d=>console.log(d.length>0?\"ok\":\"fail\")).catch(()=>console.log(\"fail\"))"' \
        2>/dev/null || echo "fail")

    if [ "$STATUS" = "ok" ]; then
        HEALTHY=true
        break
    fi

    echo "  Waiting for bima-chat-backend-$IDLE_ENV... (Attempt $((ATTEMPTS+1))/$MAX_ATTEMPTS)"
    sleep 3
    ATTEMPTS=$((ATTEMPTS+1))
done

if [ "$HEALTHY" = false ]; then
    echo "❌ Error: $IDLE_ENV environment failed health check. Rolling back!"
    $COMPOSE stop "backend-$IDLE_ENV" "frontend-$IDLE_ENV" 2>/dev/null || true
    exit 1
fi

echo "✅ $IDLE_ENV environment is healthy!"

# 4. Pastikan Nginx sudah berjalan
$COMPOSE up -d chat-nginx

# 5. Switch upstream Nginx ke environment baru (hot-reload, ZERO DOWNTIME)
echo "🔄 Switching Nginx upstream traffic to $IDLE_ENV..."
sed -i "s/server bima-chat-backend-$ACTIVE_ENV:8080/server bima-chat-backend-$IDLE_ENV:8080/g" "$NGINX_CONF"
sed -i "s/server bima-chat-frontend-$ACTIVE_ENV:5173/server bima-chat-frontend-$IDLE_ENV:5173/g" "$NGINX_CONF"

echo "⚡ Hot-reloading Nginx (Zero Downtime)..."
docker exec bima-chat-nginx nginx -s reload 2>/dev/null || $COMPOSE restart chat-nginx

# 6. Graceful stop environment lama
echo "🛑 Stopping old $ACTIVE_ENV environment..."
$COMPOSE stop "backend-$ACTIVE_ENV" "frontend-$ACTIVE_ENV" 2>/dev/null || true

# 7. Update marker environment aktif
echo "$IDLE_ENV" > "$ACTIVE_FILE"

echo "=========================================================="
echo "🎉 SUCCESS: Active environment is now $IDLE_ENV."
echo "=========================================================="
