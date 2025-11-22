# Pharma360 Backend

Pharmacy Management SaaS Backend - Built with Node.js, Express, TypeScript, MongoDB, and Redis.

## 🚀 Quick Deployment to DigitalOcean

**5-Minute Setup**: See `deploy/QUICK_START.md`

**Full Documentation**:
- **Quick Start**: `deploy/QUICK_START.md` - Get running in 5 minutes
- **Complete Guide**: `DEPLOYMENT.md` - Comprehensive deployment guide
- **Detailed Docs**: `deploy/README.md` - In-depth documentation
- **Checklist**: `deploy/checklist.md` - Deployment checklist

## 📦 Local Development

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env
# Edit .env with your local configuration

# Start with Docker Compose (includes Redis)
docker-compose up -d

# Or run directly (requires MongoDB and Redis running)
npm run dev
```

## 🛠️ Available Scripts

```bash
npm run dev          # Start development server with hot reload
npm run build        # Build TypeScript to JavaScript
npm run start        # Start production server
npm run lint         # Run ESLint
npm run ensure-admin # Create/update admin user
npm test            # Run tests
```

## 📁 Project Structure

```
backend/
├── src/
│   ├── database/      # Database models and connections
│   ├── modules/       # Feature modules (auth, inventory, sales, etc.)
│   ├── scripts/       # Utility scripts
│   ├── server.ts      # Express server setup
│   └── shared/        # Shared utilities and middleware
├── deploy/            # Deployment scripts and configs
│   ├── setup.sh       # Initial server setup
│   ├── deploy.sh      # Deployment script
│   ├── update.sh      # Update script
│   ├── rollback.sh    # Rollback script
│   ├── backup.sh      # Backup script
│   ├── nginx.conf     # Nginx configuration
│   └── README.md      # Deployment documentation
├── Dockerfile         # Docker image definition
├── docker-compose.yml # Docker Compose configuration
└── .env.example       # Environment variables template
```

## 🔧 Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure:

**Required:**
- `MONGODB_URI` - MongoDB connection string
- `MONGODB_ADMIN_DB` - Admin database name
- `REDIS_HOST` - Redis host
- `JWT_SECRET` - JWT signing secret
- `JWT_REFRESH_SECRET` - Refresh token secret
- `FRONTEND_URL` - Frontend URL for CORS
- `ALLOWED_ORIGINS` - Comma-separated CORS origins

**Optional:**
- `PORT` - Server port (default: 5000)
- `NODE_ENV` - Environment (development/production)
- `RATE_LIMIT_*` - Rate limiting configuration

See `.env.example` for all available options.

## 🐳 Docker

### Development

```bash
docker-compose up -d
```

### Production

```bash
# Use production compose file
docker-compose -f deploy/docker-compose.prod.yml up -d
```

## 📚 API Documentation

API endpoints are available at `/api/v1/`

- Health check: `GET /health`
- Authentication: `/api/v1/auth/*`
- Inventory: `/api/v1/inventory/*`
- Sales: `/api/v1/sales/*`
- Customers: `/api/v1/customers/*`
- Suppliers: `/api/v1/suppliers/*`
- Purchases: `/api/v1/purchases/*`
- Counters: `/api/v1/counters/*`
- Admin: `/api/v1/admin/*`

## 🔐 Security

- JWT-based authentication
- Role-based access control (RBAC)
- Rate limiting
- CORS protection
- Helmet.js security headers
- Input validation
- SQL injection protection (MongoDB)

## 🧪 Testing

```bash
npm test
```

## 📝 License

MIT

## 🤝 Contributing

See CONTRIBUTING.md for guidelines.

## 📞 Support

For deployment help, see:
- `deploy/QUICK_START.md` - Quick deployment guide
- `DEPLOYMENT.md` - Full deployment documentation
- `deploy/README.md` - Detailed deployment docs
