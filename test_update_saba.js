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

    console.log("Before update:");
    let user = await collection.findOne({ username: { $regex: new RegExp("^sabaadmin$", "i") } });
    console.log(user);

    console.log("Updating SabaAdmin's displayName...");
    const escapedUsername = "sabaadmin".replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const updateResult = await collection.updateOne(
      { username: { $regex: new RegExp(`^${escapedUsername}$`, "i") } },
      { $set: { displayName: "Saba Administrator Test" } }
    );
    console.log("Update result:", updateResult);

    console.log("After update:");
    user = await collection.findOne({ username: { $regex: new RegExp("^sabaadmin$", "i") } });
    console.log(user);

    // Revert the displayName back
    console.log("Reverting SabaAdmin's displayName...");
    await collection.updateOne(
      { username: { $regex: new RegExp(`^${escapedUsername}$`, "i") } },
      { $set: { displayName: "Saba Administrator" } }
    );

  } catch (err) {
    console.error("Failed:", err);
  } finally {
    await client.close();
  }
}

run();
