#!/bin/bash

# Pharma360 Backend - Update Script
# This script updates the backend to the latest version

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

echo -e "${BLUE}🔄 Pharma360 Backend - Update${NC}"
echo "=============================="

# Backup current deployment
echo -e "${YELLOW}💾 Creating backup...${NC}"
BACKUP_DIR="./backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Backup .env file
if [ -f .env ]; then
    cp .env "$BACKUP_DIR/.env"
    echo -e "${GREEN}✅ .env backed up${NC}"
fi

# Backup docker-compose.yml
if [ -f docker-compose.yml ]; then
    cp docker-compose.yml "$BACKUP_DIR/docker-compose.yml"
    echo -e "${GREEN}✅ docker-compose.yml backed up${NC}"
fi

# Pull latest code
if [ -d .git ]; then
    echo -e "${GREEN}📥 Pulling latest code...${NC}"
    git pull origin main || git pull origin master || echo -e "${YELLOW}⚠️  Unable to pull from git${NC}"
else
    echo -e "${YELLOW}⚠️  Not a git repository, skipping git pull${NC}"
fi

# Rebuild and restart
echo -e "${GREEN}🔨 Rebuilding containers...${NC}"
docker-compose build --no-cache

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
    echo -e "${GREEN}✅ Update successful!${NC}"
    
    # Clean up old backups (keep last 5)
    echo -e "${YELLOW}🧹 Cleaning up old backups...${NC}"
    ls -t ./backups/ | tail -n +6 | xargs -I {} rm -rf "./backups/{}" 2>/dev/null || true
    
    echo ""
    echo -e "${GREEN}📊 Container Status:${NC}"
    docker-compose ps
else
    echo -e "${RED}❌ Update failed! Health check failed.${NC}"
    echo -e "${YELLOW}🔄 Rolling back...${NC}"
    
    # Restore from backup
    if [ -f "$BACKUP_DIR/.env" ]; then
        cp "$BACKUP_DIR/.env" .env
    fi
    if [ -f "$BACKUP_DIR/docker-compose.yml" ]; then
        cp "$BACKUP_DIR/docker-compose.yml" docker-compose.yml
    fi
    
    docker-compose up -d
    
    echo -e "${RED}❌ Rolled back to previous version${NC}"
    echo "Backup location: $BACKUP_DIR"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ Update complete!${NC}"

