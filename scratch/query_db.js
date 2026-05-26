import { MongoClient } from 'mongodb';
import dns from 'dns';

dns.setServers(['8.8.8.8']);

const uri = "mongodb+srv://shantanu:shantanu@cluster0.xr4b4vq.mongodb.net/dashboard?retryWrites=true&w=majority&appName=Cluster0";

async function run() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db("dashboard");
    
    console.log("--- Last 10 Audit Logs ---");
    const logs = await db.collection("auditlogs").find({}).sort({ timestamp: -1 }).limit(10).toArray();
    console.log(JSON.stringify(logs, null, 2));
    
  } catch (err) {
    console.error("Failed:", err);
  } finally {
    await client.close();
  }
}

run();
