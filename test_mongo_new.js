
import { MongoClient } from 'mongodb';

async function test() {
  const uri = "mongodb+srv://shantanu:shantanu@cluster0.tenroni.mongodb.net/?appName=Cluster0";
  console.log('Testing New URI:', uri.replace(/:[^@]+@/, ':****@'));
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
