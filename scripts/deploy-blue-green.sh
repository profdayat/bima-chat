#!/bin/bash
set -e

# File to store the currently active environment (blue or green)
ENV_FILE="./.active_env"
COMPOSE_FILE="deployments/docker-compose.prod.yml"
BASE_COMPOSE="deployments/docker-compose.yml"

# Check if .active_env exists, default to green if not (so we deploy to blue first)
if [ ! -f "$ENV_FILE" ]; then
    echo "green" > "$ENV_FILE"
fi

ACTIVE_ENV=$(cat "$ENV_FILE")

if [ "$ACTIVE_ENV" = "blue" ]; then
    IDLE_ENV="green"
    IDLE_PORT="8096"
else
    IDLE_ENV="blue"
    IDLE_PORT="8095"
fi

echo "Active environment is: $ACTIVE_ENV"
echo "Deploying to: $IDLE_ENV"

# 1. Pull the new image and start the idle environment
echo "Starting $IDLE_ENV container..."
docker compose -f $BASE_COMPOSE -f $COMPOSE_FILE up -d --build "bun-chat-$IDLE_ENV"

# 2. Wait for the idle environment to be healthy
echo "Waiting for $IDLE_ENV to become healthy..."
MAX_ATTEMPTS=30
ATTEMPTS=0
HEALTHY=false

while [ $ATTEMPTS -lt $MAX_ATTEMPTS ]; do
    # Simple HTTP check to the idle container
    STATUS_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$IDLE_PORT/api/swagger || echo "000")
    
    if [ "$STATUS_CODE" = "200" ]; then
        HEALTHY=true
        break
    fi
    
    echo "Attempt $((ATTEMPTS+1))/$MAX_ATTEMPTS: Status $STATUS_CODE"
    sleep 2
    ATTEMPTS=$((ATTEMPTS+1))
done

if [ "$HEALTHY" = false ]; then
    echo "Error: $IDLE_ENV failed to become healthy. Aborting deployment."
    echo "Stopping failed $IDLE_ENV container..."
    docker compose -f $BASE_COMPOSE -f $COMPOSE_FILE stop "bun-chat-$IDLE_ENV"
    exit 1
fi

echo "$IDLE_ENV is healthy!"

# 3. Switch Nginx configuration to point to the new environment
echo "Switching Nginx traffic to $IDLE_ENV..."
sed -i "s/server bun-chat-$ACTIVE_ENV:8080/server bun-chat-$IDLE_ENV:8080/g" deployments/nginx/default.conf

# 4. Reload Nginx for zero-downtime switch
echo "Reloading Nginx..."
docker exec chat-nginx nginx -s reload

# 5. Stop the old environment
echo "Stopping $ACTIVE_ENV container..."
docker compose -f $BASE_COMPOSE -f $COMPOSE_FILE stop "bun-chat-$ACTIVE_ENV"

# 6. Update the active environment file
echo "$IDLE_ENV" > "$ENV_FILE"

echo "Deployment successful! Active environment is now $IDLE_ENV."
