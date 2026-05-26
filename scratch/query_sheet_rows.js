import { MongoClient } from 'mongodb';
import dns from 'dns';

dns.setServers(['8.8.8.8']);

const uri = "mongodb+srv://shantanu:shantanu@cluster0.xr4b4vq.mongodb.net/dashboard?retryWrites=true&w=majority&appName=Cluster0";

async function run() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db("dashboard");
    const matchedRows = await db.collection("sheetrows").find({
      $or: [
        { "data.Name": /Saba/i },
        { "data.username": /Saba/i },
        { "data.Email": /Saba/i },
        { lastModifiedBy: /Saba/i }
      ]
    }).toArray();
    console.log("Matched Sheet Rows count:", matchedRows.length);
    if (matchedRows.length > 0) {
      console.log("Sample rows:", JSON.stringify(matchedRows.slice(0, 3), null, 2));
    }
  } catch (err) {
    console.error("Connection failed:", err);
  } finally {
    await client.close();
  }
}

run();
