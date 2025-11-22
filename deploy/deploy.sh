#!/bin/bash

# Pharma360 Backend - Deployment Script
# This script deploys the backend application

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

echo -e "${BLUE}🚀 Pharma360 Backend - Deployment${NC}"
echo "=================================="

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${RED}❌ Error: .env file not found!${NC}"
    echo "Please copy .env.example to .env and configure it."
    exit 1
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Error: Docker is not running!${NC}"
    echo "Please start Docker or log out and log back in."
    exit 1
fi

# Load environment variables
source .env

# Check required environment variables
REQUIRED_VARS=("MONGODB_URI" "MONGODB_ADMIN_DB" "REDIS_HOST" "JWT_SECRET")
MISSING_VARS=()

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        MISSING_VARS+=("$var")
    fi
done

if [ ${#MISSING_VARS[@]} -ne 0 ]; then
    echo -e "${RED}❌ Error: Missing required environment variables:${NC}"
    printf '%s\n' "${MISSING_VARS[@]}"
    exit 1
fi

# Stop existing containers
echo -e "${YELLOW}🛑 Stopping existing containers...${NC}"
docker-compose down || true

# Pull latest code (if using git)
if [ -d .git ]; then
    echo -e "${GREEN}📥 Pulling latest code...${NC}"
    git pull origin main || git pull origin master || echo "Not a git repository or unable to pull"
fi

# Build and start containers
echo -e "${GREEN}🔨 Building and starting containers...${NC}"
docker-compose build --no-cache
docker-compose up -d

# Wait for services to be ready
echo -e "${YELLOW}⏳ Waiting for services to start...${NC}"
sleep 10

# Check if backend is healthy
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
    echo -e "${GREEN}✅ Backend is healthy!${NC}"
else
    echo -e "${RED}❌ Backend health check failed!${NC}"
    echo "Checking logs..."
    docker-compose logs backend --tail=50
    exit 1
fi

# Run ensure-admin script
echo -e "${GREEN}👤 Setting up admin user...${NC}"
docker-compose exec -T backend npm run ensure-admin || echo -e "${YELLOW}⚠️  Admin setup skipped or already exists${NC}"

# Show container status
echo ""
echo -e "${GREEN}📊 Container Status:${NC}"
docker-compose ps

# Show logs
echo ""
echo -e "${GREEN}📋 Recent logs:${NC}"
docker-compose logs --tail=20

echo ""
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Configure Nginx reverse proxy (see deploy/nginx.conf)"
echo "2. Set up SSL certificate: sudo certbot --nginx -d your-domain.com"
echo "3. Test the API: curl https://your-domain.com/health"
echo ""

