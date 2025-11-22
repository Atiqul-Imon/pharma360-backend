# Pharma360 Backend - DigitalOcean Deployment Guide

Complete guide for deploying the Pharma360 backend to a DigitalOcean Droplet.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Detailed Setup](#detailed-setup)
4. [Configuration](#configuration)
5. [Deployment](#deployment)
6. [SSL Setup](#ssl-setup)
7. [Maintenance](#maintenance)
8. [Troubleshooting](#troubleshooting)

## Prerequisites

### Required

- **DigitalOcean Account** with a Droplet
- **MongoDB Database** (DigitalOcean Managed Database or self-hosted)
- **Redis Instance** (DigitalOcean Managed Database or self-hosted)
- **Domain Name** (optional but recommended for SSL)

### Recommended Droplet Specs

- **Minimum**: 1 vCPU, 1GB RAM
- **Recommended**: 2 vCPU, 2GB RAM
- **Production**: 2+ vCPU, 4GB+ RAM
- **OS**: Ubuntu 22.04 LTS

## Quick Start

### 1. Initial Setup

```bash
# SSH into your Droplet
ssh root@your-droplet-ip

# Clone repository
git clone https://github.com/your-username/pharma360.git /opt/pharma360-backend
cd /opt/pharma360-backend/backend

# Run setup script
chmod +x deploy/*.sh
./deploy/setup.sh

# Log out and log back in (for Docker group)
exit
ssh root@your-droplet-ip
```

### 2. Configure Environment

```bash
cd /opt/pharma360-backend/backend
cp .env.example .env
nano .env  # Edit with your values
```

### 3. Deploy

```bash
./deploy/deploy.sh
```

### 4. Configure Nginx & SSL

```bash
# Copy and edit Nginx config
sudo cp deploy/nginx.conf /etc/nginx/sites-available/pharma360-backend
sudo nano /etc/nginx/sites-available/pharma360-backend  # Update domain

# Enable site
sudo ln -s /etc/nginx/sites-available/pharma360-backend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Setup SSL
sudo certbot --nginx -d api.yourdomain.com
```

## Detailed Setup

### Step 1: Create DigitalOcean Droplet

1. Go to DigitalOcean Dashboard
2. Click "Create" → "Droplets"
3. Choose:
   - **Image**: Ubuntu 22.04 LTS
   - **Plan**: Basic (1GB RAM minimum)
   - **Region**: Choose closest to your users
   - **Authentication**: SSH keys (recommended)
4. Click "Create Droplet"

### Step 2: Initial Server Configuration

```bash
# SSH into your Droplet
ssh root@your-droplet-ip

# Update system
apt update && apt upgrade -y

# Create non-root user (optional but recommended)
adduser deploy
usermod -aG sudo deploy
su - deploy
```

### Step 3: Install Dependencies

Run the setup script (see Quick Start) or manually:

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install Nginx
sudo apt install -y nginx

# Configure firewall
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

### Step 4: Setup MongoDB

#### Option A: DigitalOcean Managed Database

1. Create MongoDB database in DigitalOcean
2. Get connection string
3. Use in `.env` file

#### Option B: Self-Hosted

```bash
# Install MongoDB (if self-hosting)
# Follow MongoDB installation guide for Ubuntu
```

### Step 5: Setup Redis

#### Option A: DigitalOcean Managed Database

1. Create Redis database in DigitalOcean
2. Get connection details
3. Use in `.env` file

#### Option B: Self-Hosted (via Docker)

Already included in `docker-compose.yml`

## Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
nano .env
```

#### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `MONGODB_URI` | MongoDB connection string | `mongodb://user:pass@host:27017/db` |
| `MONGODB_ADMIN_DB` | Admin database name | `pharma360_admin` |
| `REDIS_HOST` | Redis host | `redis` or `your-redis-host.com` |
| `REDIS_PORT` | Redis port | `6379` |
| `JWT_SECRET` | JWT signing secret | Generate with `openssl rand -base64 32` |
| `JWT_REFRESH_SECRET` | Refresh token secret | Generate with `openssl rand -base64 32` |
| `FRONTEND_URL` | Frontend URL | `https://app.yourdomain.com` |
| `ALLOWED_ORIGINS` | CORS origins | `https://app.yourdomain.com` |

#### Generate Secrets

```bash
# JWT Secret
openssl rand -base64 32

# Refresh Secret
openssl rand -base64 32
```

## Deployment

### First Deployment

```bash
cd /opt/pharma360-backend/backend
./deploy/deploy.sh
```

### Update Deployment

```bash
./deploy/update.sh
```

### Rollback

```bash
./deploy/rollback.sh
```

## SSL Setup

### Using Let's Encrypt (Free)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d api.yourdomain.com

# Auto-renewal (already configured)
sudo certbot renew --dry-run
```

### Manual SSL Certificate

1. Upload certificate files
2. Update Nginx configuration
3. Reload Nginx

## Maintenance

### View Logs

```bash
# All services
docker-compose logs -f

# Backend only
docker-compose logs -f backend

# Last 100 lines
docker-compose logs --tail=100 backend
```

### Restart Services

```bash
docker-compose restart
```

### Run Admin Setup

```bash
docker-compose exec backend npm run ensure-admin
```

### Backup

```bash
# Manual backup
./deploy/backup.sh

# Automated backup (add to crontab)
0 2 * * * cd /opt/pharma360-backend/backend && ./deploy/backup.sh
```

## Troubleshooting

### Backend Not Starting

```bash
# Check logs
docker-compose logs backend

# Check environment
docker-compose exec backend env | grep -E "(MONGODB|REDIS)"

# Test health
curl http://localhost:5000/health
```

### Database Connection Issues

- Verify MongoDB URI format
- Check firewall rules
- Verify credentials
- Check MongoDB logs

### Nginx Issues

```bash
# Test configuration
sudo nginx -t

# Check error logs
sudo tail -f /var/log/nginx/pharma360-backend-error.log

# Reload Nginx
sudo systemctl reload nginx
```

### Port Already in Use

```bash
# Check what's using port 5000
sudo lsof -i :5000

# Kill process if needed
sudo kill -9 <PID>
```

## Security Checklist

- [ ] Firewall configured (UFW)
- [ ] Port 5000 not exposed externally
- [ ] SSL certificate installed
- [ ] Strong JWT secrets
- [ ] MongoDB authentication enabled
- [ ] Redis password set
- [ ] Regular backups configured
- [ ] Logs monitored
- [ ] Non-root user for deployment
- [ ] SSH key authentication only

## Monitoring

### Health Checks

```bash
# API Health
curl https://api.yourdomain.com/health

# Container Health
docker-compose ps
```

### Resource Monitoring

```bash
# Container stats
docker stats

# System resources
htop
```

## Support

For detailed deployment scripts and documentation, see `deploy/README.md`.

## Next Steps

After deployment:
1. Test API endpoints
2. Configure frontend to use API URL
3. Set up monitoring
4. Configure backups
5. Set up log aggregation (optional)

