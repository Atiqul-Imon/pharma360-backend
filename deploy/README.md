# Pharma360 Backend - DigitalOcean Deployment Guide

This guide will help you deploy the Pharma360 backend to a DigitalOcean Droplet.

## 📋 Prerequisites

- DigitalOcean account
- A Droplet (Ubuntu 22.04 LTS recommended)
- Domain name (optional but recommended)
- MongoDB database (DigitalOcean Managed Database or self-hosted)
- Redis instance (DigitalOcean Managed Database or self-hosted)

## 🚀 Quick Start

### Step 1: Initial Server Setup

1. **Create a DigitalOcean Droplet:**
   - Choose Ubuntu 22.04 LTS
   - Minimum: 1 vCPU, 1GB RAM (2GB+ recommended)
   - Add your SSH key

2. **SSH into your Droplet:**
   ```bash
   ssh root@your-droplet-ip
   ```

3. **Run the setup script:**
   ```bash
   # Clone your repository
   git clone https://github.com/your-username/pharma360.git /opt/pharma360-backend
   cd /opt/pharma360-backend/backend
   
   # Make scripts executable
   chmod +x deploy/*.sh
   
   # Run setup
   ./deploy/setup.sh
   ```

4. **Log out and log back in** (for Docker group changes)

### Step 2: Configure Environment

1. **Copy environment template:**
   ```bash
   cp .env.example .env
   ```

2. **Edit `.env` file with your values:**
   ```bash
   nano .env
   ```

   **Required variables:**
   - `MONGODB_URI` - Your MongoDB connection string
   - `MONGODB_ADMIN_DB` - Admin database name
   - `REDIS_HOST` - Redis host
   - `JWT_SECRET` - Generate with: `openssl rand -base64 32`
   - `JWT_REFRESH_SECRET` - Generate with: `openssl rand -base64 32`
   - `FRONTEND_URL` - Your frontend URL
   - `ALLOWED_ORIGINS` - Comma-separated list of allowed origins

### Step 3: Deploy

```bash
cd /opt/pharma360-backend/backend
./deploy/deploy.sh
```

### Step 4: Configure Nginx

1. **Copy Nginx configuration:**
   ```bash
   sudo cp deploy/nginx.conf /etc/nginx/sites-available/pharma360-backend
   ```

2. **Edit the configuration:**
   ```bash
   sudo nano /etc/nginx/sites-available/pharma360-backend
   ```
   - Replace `api.yourdomain.com` with your domain

3. **Enable the site:**
   ```bash
   sudo ln -s /etc/nginx/sites-available/pharma360-backend /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```

4. **Set up SSL with Let's Encrypt:**
   ```bash
   sudo certbot --nginx -d api.yourdomain.com
   ```

5. **Close port 5000 from external access:**
   ```bash
   sudo ufw delete allow 5000/tcp
   sudo ufw status
   ```

### Step 5: Verify Deployment

```bash
# Check health endpoint
curl https://api.yourdomain.com/health

# Check container status
docker-compose ps

# View logs
docker-compose logs -f backend
```

## 🔄 Updating the Application

To update to the latest version:

```bash
cd /opt/pharma360-backend/backend
./deploy/update.sh
```

This script will:
- Create a backup
- Pull latest code
- Rebuild containers
- Verify health
- Rollback if something goes wrong

## 📊 Monitoring

### View Logs

```bash
# All services
docker-compose logs -f

# Backend only
docker-compose logs -f backend

# Last 100 lines
docker-compose logs --tail=100 backend
```

### Container Status

```bash
docker-compose ps
```

### Resource Usage

```bash
docker stats
```

## 🔧 Maintenance

### Restart Services

```bash
docker-compose restart
```

### Stop Services

```bash
docker-compose down
```

### Start Services

```bash
docker-compose up -d
```

### Run Admin Setup

```bash
docker-compose exec backend npm run ensure-admin
```

## 🛡️ Security Checklist

- [ ] Firewall configured (UFW)
- [ ] Port 5000 not exposed externally
- [ ] SSL certificate installed
- [ ] Strong JWT secrets set
- [ ] MongoDB authentication enabled
- [ ] Redis password set (if using managed Redis)
- [ ] Regular backups configured
- [ ] Logs monitored

## 🐛 Troubleshooting

### Backend not starting

```bash
# Check logs
docker-compose logs backend

# Check environment variables
docker-compose exec backend env | grep -E "(MONGODB|REDIS|JWT)"

# Test database connections
docker-compose exec backend node -e "console.log('Test')"
```

### Health check failing

```bash
# Check if port is accessible
curl http://localhost:5000/health

# Check container health
docker-compose ps
```

### Nginx errors

```bash
# Test configuration
sudo nginx -t

# Check error logs
sudo tail -f /var/log/nginx/pharma360-backend-error.log
```

### Database connection issues

- Verify MongoDB URI is correct
- Check firewall rules allow connection
- Verify credentials
- Check MongoDB logs

## 📝 Environment Variables Reference

See `.env.example` for all available environment variables.

## 🔐 Generating Secrets

```bash
# JWT Secret
openssl rand -base64 32

# Refresh Secret
openssl rand -base64 32
```

## 📦 Backup and Restore

### Manual Backup

```bash
# Backup MongoDB (if self-hosted)
mongodump --uri="your-mongodb-uri" --out=/opt/pharma360-backend/backups/mongodb-$(date +%Y%m%d)

# Backup Redis (if self-hosted)
redis-cli --rdb /opt/pharma360-backend/backups/redis-$(date +%Y%m%d).rdb
```

### Automated Backups

Set up a cron job for regular backups:

```bash
crontab -e

# Add this line (runs daily at 2 AM)
0 2 * * * /opt/pharma360-backend/backend/deploy/backup.sh
```

## 🚨 Emergency Procedures

### Rollback to Previous Version

```bash
cd /opt/pharma360-backend/backend
./deploy/rollback.sh
```

### Complete Reset

```bash
# Stop everything
docker-compose down -v

# Remove all data (WARNING: This deletes everything!)
docker volume rm pharma360-backend_redis_data

# Start fresh
./deploy/deploy.sh
```

## 📞 Support

For issues or questions:
- Check logs: `docker-compose logs -f`
- Review this documentation
- Check DigitalOcean documentation

## 🔗 Useful Links

- [DigitalOcean Documentation](https://docs.digitalocean.com/)
- [Docker Documentation](https://docs.docker.com/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)

