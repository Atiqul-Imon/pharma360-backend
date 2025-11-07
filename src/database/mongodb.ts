import mongoose from 'mongoose';

interface TenantConnection {
  tenantId: string;
  connection: mongoose.Connection;
  lastAccessed: Date;
}

class MongoDBManager {
  private adminConnection: mongoose.Connection | null = null;
  private tenantConnections: Map<string, TenantConnection> = new Map();
  private readonly connectionPoolSize = 50;
  private readonly minPoolSize = 10;
  private readonly maxIdleTimeMS = 60000;
  private readonly cleanupIntervalMS = 300000; // 5 minutes

  constructor() {
    // Cleanup inactive tenant connections periodically
    setInterval(() => this.cleanupInactiveConnections(), this.cleanupIntervalMS);
  }

  /**
   * Initialize admin database connection
   */
  async connectAdmin(): Promise<mongoose.Connection> {
    if (this.adminConnection?.readyState === 1) {
      return this.adminConnection;
    }

    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
    const dbName = process.env.MONGODB_ADMIN_DB || 'pharma360_admin';

    try {
      this.adminConnection = await mongoose.createConnection(uri, {
        dbName,
        maxPoolSize: this.connectionPoolSize,
        minPoolSize: this.minPoolSize,
        maxIdleTimeMS: this.maxIdleTimeMS,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      }).asPromise();

      console.log(`✅ Admin MongoDB connected: ${dbName}`);

      // Handle connection events
      this.adminConnection.on('error', (error) => {
        console.error('❌ Admin MongoDB connection error:', error);
      });

      this.adminConnection.on('disconnected', () => {
        console.warn('⚠️ Admin MongoDB disconnected');
      });

      return this.adminConnection;
    } catch (error) {
      console.error('❌ Failed to connect to admin MongoDB:', error);
      throw error;
    }
  }

  /**
   * Get or create tenant database connection
   */
  async getTenantConnection(tenantId: string): Promise<mongoose.Connection> {
    // Check if connection exists and is active
    const existingConnection = this.tenantConnections.get(tenantId);
    if (existingConnection?.connection.readyState === 1) {
      existingConnection.lastAccessed = new Date();
      return existingConnection.connection;
    }

    // Create new tenant connection
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
    const dbName = `p360_t_${tenantId}`;

    try {
      const connection = await mongoose.createConnection(uri, {
        dbName,
        maxPoolSize: this.connectionPoolSize,
        minPoolSize: this.minPoolSize,
        maxIdleTimeMS: this.maxIdleTimeMS,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      }).asPromise();

      console.log(`✅ Tenant MongoDB connected: ${dbName}`);

      // Store connection
      this.tenantConnections.set(tenantId, {
        tenantId,
        connection,
        lastAccessed: new Date(),
      });

      // Handle connection events
      connection.on('error', (error) => {
        console.error(`❌ Tenant ${tenantId} MongoDB error:`, error);
      });

      connection.on('disconnected', () => {
        console.warn(`⚠️ Tenant ${tenantId} MongoDB disconnected`);
        this.tenantConnections.delete(tenantId);
      });

      return connection;
    } catch (error) {
      console.error(`❌ Failed to connect to tenant ${tenantId} MongoDB:`, error);
      throw error;
    }
  }

  /**
   * Close tenant connection
   */
  async closeTenantConnection(tenantId: string): Promise<void> {
    const tenantConnection = this.tenantConnections.get(tenantId);
    if (tenantConnection) {
      await tenantConnection.connection.close();
      this.tenantConnections.delete(tenantId);
      console.log(`✅ Tenant ${tenantId} connection closed`);
    }
  }

  /**
   * Cleanup inactive tenant connections (not accessed in last 30 minutes)
   */
  private async cleanupInactiveConnections(): Promise<void> {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    const inactiveConnections: string[] = [];

    this.tenantConnections.forEach((tenantConn, tenantId) => {
      if (tenantConn.lastAccessed < thirtyMinutesAgo) {
        inactiveConnections.push(tenantId);
      }
    });

    for (const tenantId of inactiveConnections) {
      await this.closeTenantConnection(tenantId);
    }

    if (inactiveConnections.length > 0) {
      console.log(`🧹 Cleaned up ${inactiveConnections.length} inactive connections`);
    }
  }

  /**
   * Close all connections
   */
  async closeAll(): Promise<void> {
    // Close admin connection
    if (this.adminConnection) {
      await this.adminConnection.close();
      console.log('✅ Admin connection closed');
    }

    // Close all tenant connections
    const closePromises = Array.from(this.tenantConnections.keys()).map((tenantId) =>
      this.closeTenantConnection(tenantId)
    );
    await Promise.all(closePromises);

    console.log('✅ All MongoDB connections closed');
  }

  /**
   * Get admin connection
   */
  getAdminConnection(): mongoose.Connection {
    if (!this.adminConnection || this.adminConnection.readyState !== 1) {
      throw new Error('Admin database not connected');
    }
    return this.adminConnection;
  }

  /**
   * Get connection statistics
   */
  getStats(): {
    adminConnected: boolean;
    tenantConnectionsCount: number;
    tenantIds: string[];
  } {
    return {
      adminConnected: this.adminConnection?.readyState === 1,
      tenantConnectionsCount: this.tenantConnections.size,
      tenantIds: Array.from(this.tenantConnections.keys()),
    };
  }
}

// Singleton instance
export const mongoDBManager = new MongoDBManager();

export default mongoDBManager;

