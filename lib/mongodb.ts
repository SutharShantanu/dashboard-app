import mongoose from 'mongoose';
import dns from 'dns';

// dns.setServers(['8.8.8.8']);

// Evaluate lazily to support script imports
/**
 * Helper to get the MongoDB URI securely.
 * This avoids storing the full connection string with the password in a single env variable.
 * The password is treated as a "token" (MONGODB_TOKEN) that should be managed via a Secret Manager.
 */
function getMongoUri() {
  // Priority 1: Full URI (for legacy support or specific overrides)
  if (process.env.MONGODB_URI) return process.env.MONGODB_URI;

  // Priority 2: Structured credentials
  const user = process.env.MONGODB_USER;
  const token = process.env.MONGODB_TOKEN; 
  const cluster = process.env.MONGODB_CLUSTER;
  const db = process.env.MONGODB_DB || 'dashboard';
  const shards = process.env.MONGODB_SHARDS;
  const replicaSet = process.env.MONGODB_REPLICA_SET;

  if (!user || !token) {
    throw new Error('MongoDB configuration is incomplete. MONGODB_USER and MONGODB_TOKEN are required.');
  }

  // Use Standard Connection if Shards are provided (bypasses SRV/DNS issues)
  if (shards) {
    console.log('Using Standard Connection Fallback');
    let uri = `mongodb://${user}:${token}@${shards}/${db}?ssl=true&authSource=admin`;
    if (replicaSet) {
      uri += `&replicaSet=${replicaSet}&retryWrites=true&w=majority`;
    }
    return uri;
  }

  if (!cluster) {
    throw new Error('MONGODB_CLUSTER is required for SRV connection.');
  }

  // Default: Construct URI securely (SRV format)
  return `mongodb+srv://${user}:${token}@${cluster}/${db}?retryWrites=true&w=majority&appName=Cluster0`;
}

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

async function connectToDatabase() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    // try {
    //   dns.setServers(['8.8.8.8', '1.1.1.1']);
    //   console.log('DNS servers set to 8.8.8.8, 1.1.1.1');
    // } catch (e) {
    //   console.error('Failed to set DNS servers:', e);
    // }

    cached.promise = mongoose.connect(getMongoUri(), opts).then((mongoose) => {
      return mongoose;
    });
  }
  
  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default connectToDatabase;
