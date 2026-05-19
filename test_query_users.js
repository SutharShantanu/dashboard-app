import { MongoClient } from 'mongodb';
import dns from 'dns';

dns.setServers(['8.8.8.8']);

const uri = "mongodb+srv://shantanu:shantanu@cluster0.xr4b4vq.mongodb.net/dashboard?retryWrites=true&w=majority&appName=Cluster0";

async function run() {
  const client = new MongoClient(uri);
  try {
    console.log("Connecting to MongoDB...");
    await client.connect();
    const db = client.db("dashboard");
    const users = await db.collection("users").find({}).toArray();
    console.log("Users:", JSON.stringify(users, null, 2));
  } catch (err) {
    console.error("Connection failed:", err);
  } finally {
    await client.close();
  }
}

run();
