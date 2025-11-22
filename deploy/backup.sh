#!/bin/bash

# Pharma360 Backend - Backup Script
# This script creates backups of configuration and data

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"
cd "$BACKEND_DIR"

BACKUP_DIR="./backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo -e "${GREEN}💾 Creating backup...${NC}"

# Backup configuration files
if [ -f .env ]; then
    cp .env "$BACKUP_DIR/.env"
    echo -e "${GREEN}✅ .env backed up${NC}"
fi

if [ -f docker-compose.yml ]; then
    cp docker-compose.yml "$BACKUP_DIR/docker-compose.yml"
    echo -e "${GREEN}✅ docker-compose.yml backed up${NC}"
fi

# Backup uploads directory
if [ -d uploads ]; then
    tar -czf "$BACKUP_DIR/uploads.tar.gz" uploads/ 2>/dev/null || true
    echo -e "${GREEN}✅ uploads directory backed up${NC}"
fi

# Create backup info file
cat > "$BACKUP_DIR/backup-info.txt" << EOF
Backup Date: $(date)
Backup Location: $BACKUP_DIR
Git Commit: $(git rev-parse HEAD 2>/dev/null || echo "N/A")
Git Branch: $(git branch --show-current 2>/dev/null || echo "N/A")
EOF

echo -e "${GREEN}✅ Backup complete: $BACKUP_DIR${NC}"

# Clean up old backups (keep last 10)
echo -e "${YELLOW}🧹 Cleaning up old backups...${NC}"
ls -t ./backups/ 2>/dev/null | tail -n +11 | xargs -I {} rm -rf "./backups/{}" 2>/dev/null || true

echo -e "${GREEN}✅ Backup process complete${NC}"

