# Quick Start - DigitalOcean Deployment

## 🎯 5-Minute Setup

### 1. Create Droplet & SSH

```bash
# Create Ubuntu 22.04 Droplet in DigitalOcean
# Then SSH in:
ssh root@your-droplet-ip
```

### 2. Run Setup

```bash
# Clone repo
git clone https://github.com/your-username/pharma360.git /opt/pharma360-backend
cd /opt/pharma360-backend/backend

# Make scripts executable
chmod +x deploy/*.sh

# Run setup
./deploy/setup.sh

# Log out and back in
exit
ssh root@your-droplet-ip
```

### 3. Configure

```bash
cd /opt/pharma360-backend/backend
cp .env.example .env
nano .env  # Fill in your values
```

**Minimum required:**
- `MONGODB_URI`
- `MONGODB_ADMIN_DB`
- `REDIS_HOST`
- `JWT_SECRET` (generate: `openssl rand -base64 32`)
- `JWT_REFRESH_SECRET` (generate: `openssl rand -base64 32`)
- `FRONTEND_URL`
- `ALLOWED_ORIGINS`

### 4. Deploy

```bash
./deploy/deploy.sh
```

### 5. Setup Nginx & SSL

```bash
# Copy Nginx config
sudo cp deploy/nginx.conf /etc/nginx/sites-available/pharma360-backend

# Edit domain
sudo nano /etc/nginx/sites-available/pharma360-backend
# Change: api.yourdomain.com → your actual domain

# Enable
sudo ln -s /etc/nginx/sites-available/pharma360-backend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# SSL
sudo certbot --nginx -d api.yourdomain.com

# Close port 5000
sudo ufw delete allow 5000/tcp
```

### 6. Verify

```bash
curl https://api.yourdomain.com/health
```

## ✅ Done!

Your API is now live at `https://api.yourdomain.com`

## 🔄 Updates

```bash
./deploy/update.sh
```

## 📚 More Info

- Full guide: `DEPLOYMENT.md`
- Detailed docs: `deploy/README.md`
- Checklist: `deploy/checklist.md`

