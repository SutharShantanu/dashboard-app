const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

async function run() {
  console.log('Connecting to', process.env.MONGODB_URI);
  try {
    await mongoose.connect(process.env.MONGODB_URI, { bufferCommands: false });
    console.log('Connected');
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('Collections:', collections.map(c => c.name));
    process.exit(0);
  } catch (e) {
    console.error('Error:', e);
    process.exit(1);
  }
}
run();
