import { MongoClient } from 'mongodb';
import dns from 'dns';

dns.setServers(['8.8.8.8']);

const uri = "mongodb+srv://shantanu:shantanu@cluster0.xr4b4vq.mongodb.net/dashboard?retryWrites=true&w=majority&appName=Cluster0";

async function run() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db("dashboard");
    const collection = db.collection("sheetrows");
    
    const sheetIds = await collection.distinct("sheetId");
    console.log("Unique sheet IDs in database:", sheetIds);
    
    const count = await collection.countDocuments();
    console.log("Total rows in collection:", count);
    
    if (sheetIds.length > 0) {
      // Find columns for the first sheet ID found
      const rows = await collection.find({ sheetId: sheetIds[0] }).limit(1).toArray();
      if (rows.length > 0) {
        console.log(`Sample columns for sheet ${sheetIds[0]}:`, Object.keys(rows[0].data));
      }
    }
    
  } catch (err) {
    console.error("Failed:", err);
  } finally {
    await client.close();
  }
}

run();
