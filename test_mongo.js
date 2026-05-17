
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
  const user = process.env.MONGODB_USER;
  const password = process.env.MONGODB_TOKEN;
  const cluster = process.env.MONGODB_CLUSTER;
  const db = process.env.MONGODB_DB || 'dashboard';
  const shards = process.env.MONGODB_SHARDS;
  const replicaSet = process.env.MONGODB_REPLICA_SET;
  
  let uri;
  if (shards) {
    uri = `mongodb://${user}:${password}@${shards}/${db}?ssl=true&authSource=admin`;
    if (replicaSet) {
      uri += `&replicaSet=${replicaSet}&retryWrites=true&w=majority`;
    }
  } else {
    uri = `mongodb+srv://${user}:${password}@${cluster}/${db}?retryWrites=true&w=majority&appName=Cluster0`;
  }
  
  console.log('Testing URI:', uri.replace(/:[^@]+@/, ':****@'));
  const client = new MongoClient(uri);
  try {
    await client.connect();
    console.log('Connected successfully');
    await client.db('admin').command({ ping: 1 });
    console.log('Ping successful');
  } catch (err) {
    console.error('Connection failed:', err);
  } finally {
    await client.close();
  }
}

test();
