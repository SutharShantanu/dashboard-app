
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import dns from 'dns';

dotenv.config();

async function verifyConnection() {
  const user = process.env.MONGODB_USER;
  const password = process.env.MONGODB_PASSWORD_TOKEN;
  const cluster = process.env.MONGODB_CLUSTER;
  const dbName = process.env.MONGODB_DB || 'dashboard';

  console.log('--- MongoDB Connection Verification ---');
  console.log(`Cluster: ${cluster}`);
  console.log(`Database: ${dbName}`);
  console.log(`User: ${user}`);
  
  if (!user || !password || !cluster) {
    console.error('❌ Error: Missing configuration variables in .env');
    return;
  }

  const uri = `mongodb+srv://${user}:${password}@${cluster}/${dbName}?retryWrites=true&w=majority&appName=Cluster0`;

  // 1. DNS Check
  console.log('\nStep 1: Checking DNS resolution...');
  try {
    dns.setServers(['8.8.8.8']);
    const srvRecords = await dns.promises.resolveSrv(`_mongodb._tcp.${cluster}`);
    console.log('✅ DNS SRV resolution successful.');
  } catch (err) {
    console.error('⚠️ DNS SRV resolution failed. This might be a local network issue or incorrect cluster name.');
    console.error('Error details:', (err as Error).message);
  }

  // 2. Connection Check
  console.log('\nStep 2: Attempting connection...');
  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('✅ Successfully connected to MongoDB Atlas!');
    
    // Check if database exists/is accessible
    const admin = mongoose.connection.db?.admin();
    const info = await admin?.serverStatus();
    console.log(`✅ Server version: ${info?.version}`);
    
    await mongoose.disconnect();
  } catch (err: any) {
    console.error('❌ Connection failed!');
    
    if (err.message.includes('tlsv1 alert internal error') || err.message.includes('SSL alert number 80')) {
      console.error('\n🚨 TROUBLESHOOTING TIP: IP Whitelist Issue');
      console.error('The error "tlsv1 alert internal error" typically means your IP address is NOT whitelisted in MongoDB Atlas.');
      console.error('Action: Go to MongoDB Atlas -> Network Access -> Add IP Address -> Add Current IP Address (or 0.0.0.0/0 for testing).');
    } else if (err.message.includes('Authentication failed')) {
      console.error('\n🚨 TROUBLESHOOTING TIP: Authentication Issue');
      console.error('Double-check your MONGODB_USER and MONGODB_PASSWORD_TOKEN.');
    } else {
      console.error('Error details:', err.message);
    }
  }
}

verifyConnection().catch(console.error);
