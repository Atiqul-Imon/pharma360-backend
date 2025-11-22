#!/bin/bash

# Pharma360 Backend - DigitalOcean Droplet Setup Script
# This script sets up a fresh Ubuntu server for deployment

set -e

echo "🚀 Pharma360 Backend - DigitalOcean Setup"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
   echo -e "${RED}Please do not run as root. The script will use sudo when needed.${NC}"
   exit 1
fi

# Update system
echo -e "${GREEN}📦 Updating system packages...${NC}"
sudo apt update && sudo apt upgrade -y

# Install essential packages
echo -e "${GREEN}📦 Installing essential packages...${NC}"
sudo apt install -y \
    curl \
    wget \
    git \
    ufw \
    certbot \
    python3-certbot-nginx \
    software-properties-common \
    apt-transport-https \
    ca-certificates \
    gnupg \
    lsb-release

# Install Docker
if ! command -v docker &> /dev/null; then
    echo -e "${GREEN}🐳 Installing Docker...${NC}"
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    rm get-docker.sh
    
    # Add current user to docker group
    sudo usermod -aG docker $USER
    echo -e "${YELLOW}⚠️  You need to log out and log back in for docker group changes to take effect.${NC}"
else
    echo -e "${GREEN}✅ Docker is already installed${NC}"
fi

# Install Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo -e "${GREEN}🐳 Installing Docker Compose...${NC}"
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
else
    echo -e "${GREEN}✅ Docker Compose is already installed${NC}"
fi

# Install Nginx
if ! command -v nginx &> /dev/null; then
    echo -e "${GREEN}🌐 Installing Nginx...${NC}"
    sudo apt install -y nginx
    sudo systemctl enable nginx
else
    echo -e "${GREEN}✅ Nginx is already installed${NC}"
fi

# Configure firewall
echo -e "${GREEN}🔥 Configuring firewall...${NC}"
sudo ufw --force enable
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw allow 5000/tcp  # Backend port (will be closed after Nginx setup)
sudo ufw status

# Create application directory
APP_DIR="/opt/pharma360-backend"
echo -e "${GREEN}📁 Creating application directory at ${APP_DIR}...${NC}"
sudo mkdir -p $APP_DIR
sudo chown $USER:$USER $APP_DIR

# Create necessary directories
mkdir -p $APP_DIR/{logs,uploads,backups}

echo ""
echo -e "${GREEN}✅ Setup complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Log out and log back in (for docker group)"
echo "2. Clone your repository to ${APP_DIR}"
echo "3. Copy .env.example to .env and configure it"
echo "4. Run: cd ${APP_DIR} && ./deploy/deploy.sh"
echo ""

