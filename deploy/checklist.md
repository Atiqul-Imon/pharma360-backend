# Deployment Checklist

Use this checklist to ensure a successful deployment.

## Pre-Deployment

- [ ] DigitalOcean Droplet created
- [ ] MongoDB database ready (connection string available)
- [ ] Redis instance ready (connection details available)
- [ ] Domain name configured (DNS pointing to Droplet IP)
- [ ] SSH access to Droplet working
- [ ] Repository cloned to server

## Server Setup

- [ ] System packages updated
- [ ] Docker installed
- [ ] Docker Compose installed
- [ ] Nginx installed
- [ ] Firewall configured (UFW)
- [ ] Non-root user created (optional)

## Configuration

- [ ] `.env` file created from `.env.example`
- [ ] `MONGODB_URI` configured
- [ ] `MONGODB_ADMIN_DB` set
- [ ] `REDIS_HOST` and `REDIS_PORT` configured
- [ ] `REDIS_PASSWORD` set (if required)
- [ ] `JWT_SECRET` generated and set
- [ ] `JWT_REFRESH_SECRET` generated and set
- [ ] `FRONTEND_URL` configured
- [ ] `ALLOWED_ORIGINS` configured
- [ ] All other environment variables reviewed

## Deployment

- [ ] `deploy.sh` script executed successfully
- [ ] Docker containers built
- [ ] Containers started and running
- [ ] Health check passing (`/health` endpoint)
- [ ] Admin user created (`npm run ensure-admin`)

## Nginx Configuration

- [ ] Nginx configuration file created
- [ ] Domain name updated in config
- [ ] Configuration tested (`nginx -t`)
- [ ] Site enabled (symlink created)
- [ ] Nginx reloaded

## SSL Certificate

- [ ] Certbot installed
- [ ] SSL certificate obtained
- [ ] Certificate auto-renewal configured
- [ ] HTTPS working

## Security

- [ ] Port 5000 closed from external access
- [ ] Firewall rules reviewed
- [ ] Strong secrets generated
- [ ] Database authentication enabled
- [ ] Redis password set (if applicable)

## Testing

- [ ] Health endpoint accessible: `https://api.yourdomain.com/health`
- [ ] API endpoints responding
- [ ] CORS working (test from frontend)
- [ ] Authentication working
- [ ] Socket.IO connection working (if applicable)

## Post-Deployment

- [ ] Frontend configured with API URL
- [ ] Monitoring set up (optional)
- [ ] Backup strategy configured
- [ ] Log rotation configured
- [ ] Update script tested
- [ ] Documentation reviewed

## Maintenance Setup

- [ ] Backup script tested
- [ ] Cron job for backups configured
- [ ] Update process documented
- [ ] Rollback process tested
- [ ] Log monitoring set up

## Final Verification

- [ ] All services running
- [ ] No errors in logs
- [ ] API responding correctly
- [ ] Frontend can connect
- [ ] SSL certificate valid
- [ ] Performance acceptable

---

**Deployment Date**: _______________
**Deployed By**: _______________
**Version**: _______________
**Notes**: _______________

