#!/bin/bash

# Pharma360 Backend - Rollback Script
# This script rolls back to a previous deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"
cd "$BACKEND_DIR"

echo -e "${BLUE}⏪ Pharma360 Backend - Rollback${NC}"
echo "================================"

# List available backups
BACKUP_DIR="./backups"
if [ ! -d "$BACKUP_DIR" ] || [ -z "$(ls -A $BACKUP_DIR)" ]; then
    echo -e "${RED}❌ No backups found!${NC}"
    exit 1
fi

echo -e "${GREEN}Available backups:${NC}"
ls -1t "$BACKUP_DIR" | nl

echo ""
read -p "Enter backup number to restore: " BACKUP_NUM

BACKUP_NAME=$(ls -1t "$BACKUP_DIR" | sed -n "${BACKUP_NUM}p")

if [ -z "$BACKUP_NAME" ]; then
    echo -e "${RED}❌ Invalid backup number!${NC}"
    exit 1
fi

BACKUP_PATH="$BACKUP_DIR/$BACKUP_NAME"

echo -e "${YELLOW}🔄 Rolling back to: $BACKUP_NAME${NC}"

# Stop current deployment
echo -e "${YELLOW}🛑 Stopping current deployment...${NC}"
docker-compose down || true

# Restore files
if [ -f "$BACKUP_PATH/.env" ]; then
    cp "$BACKUP_PATH/.env" .env
    echo -e "${GREEN}✅ .env restored${NC}"
fi

if [ -f "$BACKUP_PATH/docker-compose.yml" ]; then
    cp "$BACKUP_PATH/docker-compose.yml" docker-compose.yml
    echo -e "${GREEN}✅ docker-compose.yml restored${NC}"
fi

# Restart services
echo -e "${GREEN}🔄 Restarting services...${NC}"
docker-compose up -d

# Wait for health check
echo -e "${YELLOW}⏳ Waiting for services to be healthy...${NC}"
sleep 10

MAX_RETRIES=30
RETRY_COUNT=0
HEALTHY=false

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -f http://localhost:5000/health > /dev/null 2>&1; then
        HEALTHY=true
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo -e "${YELLOW}   Attempt $RETRY_COUNT/$MAX_RETRIES...${NC}"
    sleep 2
done

if [ "$HEALTHY" = true ]; then
    echo -e "${GREEN}✅ Rollback successful!${NC}"
    docker-compose ps
else
    echo -e "${RED}❌ Rollback failed! Health check failed.${NC}"
    docker-compose logs backend --tail=50
    exit 1
fi

