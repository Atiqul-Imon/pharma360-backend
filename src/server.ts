import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

// Database connections
import { mongoDBManager } from './database/mongodb.js';
import { redisManager } from './database/redis.js';

// Middleware
import { errorHandler, notFoundHandler } from './shared/middleware/errorHandler.js';
import { generalLimiter } from './shared/middleware/rateLimiter.js';

// Load environment variables
dotenv.config();

const app: Application = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

// Port configuration
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

/**
 * Middleware setup
 */
app.use(helmet()); // Security headers
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
}));
app.use(compression()); // Gzip compression
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Rate limiting
app.use('/api', generalLimiter);

/**
 * Health check endpoint
 */
app.get('/health', (_req, res) => {
  const mongoStats = mongoDBManager.getStats();
  
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    mongodb: {
      adminConnected: mongoStats.adminConnected,
      tenantConnectionsCount: mongoStats.tenantConnectionsCount,
    },
    redis: 'connected',
  });
});

/**
 * API routes
 */
app.get('/', (_req, res) => {
  res.json({
    success: true,
    message: 'Pharma360 API v1.0',
    docs: '/api/docs',
  });
});

// Module routes
import authRoutes from './modules/auth/routes.js';
import inventoryRoutes from './modules/inventory/routes.js';
import salesRoutes from './modules/sales/routes.js';
import customerRoutes from './modules/customer/routes.js';
import adminRoutes from './modules/admin/routes.js';
import purchaseRoutes from './modules/purchase/routes.js';
import supplierRoutes from './modules/supplier/routes.js';

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/inventory', inventoryRoutes);
app.use('/api/v1/sales', salesRoutes);
app.use('/api/v1/customers', customerRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/purchases', purchaseRoutes);
app.use('/api/v1/suppliers', supplierRoutes);

/**
 * Error handlers (must be last)
 */
app.use(notFoundHandler);
app.use(errorHandler);

/**
 * Socket.IO connection handling
 */
io.on('connection', (socket) => {
  console.log(`✅ Socket connected: ${socket.id}`);

  socket.on('join-tenant', (tenantId: string) => {
    socket.join(`tenant:${tenantId}`);
    console.log(`Socket ${socket.id} joined tenant:${tenantId}`);
  });

  socket.on('disconnect', () => {
    console.log(`❌ Socket disconnected: ${socket.id}`);
  });
});

// Export io for use in modules
export { io };

/**
 * Initialize database connections and start server
 */
async function startServer() {
  try {
    console.log('🚀 Starting Pharma360 Backend Server...');
    console.log(`📦 Environment: ${NODE_ENV}`);

    // Connect to MongoDB (admin database)
    await mongoDBManager.connectAdmin();

    // Connect to Redis
    await redisManager.connect();

    // Start server
    httpServer.listen(PORT, () => {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`🌐 API: http://localhost:${PORT}`);
      console.log(`🏥 Health: http://localhost:${PORT}/health`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

/**
 * Graceful shutdown
 */
process.on('SIGTERM', async () => {
  console.log('⚠️ SIGTERM signal received. Closing server gracefully...');
  
  httpServer.close(async () => {
    console.log('🔌 HTTP server closed');
    
    // Close database connections
    await mongoDBManager.closeAll();
    await redisManager.disconnect();
    
    console.log('✅ Graceful shutdown completed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('⚠️ SIGINT signal received. Closing server gracefully...');
  
  httpServer.close(async () => {
    console.log('🔌 HTTP server closed');
    
    // Close database connections
    await mongoDBManager.closeAll();
    await redisManager.disconnect();
    
    console.log('✅ Graceful shutdown completed');
    process.exit(0);
  });
});

// Start the server
startServer();

