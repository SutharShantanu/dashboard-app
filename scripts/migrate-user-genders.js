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
    const collection = db.collection("users");

    console.log("Migrating genders...");
    
    // SabaAdmin is Female
    await collection.updateOne(
      { username: { $regex: /^sabaadmin$/i } },
      { $set: { gender: "female" } }
    );
    
    // Shantanu users are Male
    await collection.updateOne(
      { username: { $regex: /^shantanusubadmin$/i } },
      { $set: { gender: "male" } }
    );
    await collection.updateOne(
      { username: { $regex: /^shantanu$/i } },
      { $set: { gender: "male" } }
    );
    
    // perm_test is Other/Male
    await collection.updateOne(
      { username: { $regex: /^perm_test$/i } },
      { $set: { gender: "other" } }
    );

    // Default any users without a gender to "male" or "female"
    await collection.updateMany(
      { gender: { $exists: false } },
      { $set: { gender: "male" } }
    );

    console.log("Migration complete. Querying users to verify:");
    const users = await collection.find({}).toArray();
    users.forEach(u => console.log(`User: ${u.username} | Gender: ${u.gender} | DisplayName: ${u.displayName}`));

  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await client.close();
  }
}

run();
