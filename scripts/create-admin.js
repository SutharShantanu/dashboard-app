import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  displayName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ["admin", "sub-admin"], required: true },
  allowedColumns: { type: String, default: "" },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  createdBy: { type: String, required: true },
});

const User = mongoose.models.User || mongoose.model('User', UserSchema);

async function createAdmin() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is not defined in .env.local');
    process.exit(1);
  }

  try {
    await mongoose.connect(uri);
    console.log('Connected to MongoDB');

    const username = "SabaAdmin";
    const password = "Admin@123";
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      console.log(`User ${username} already exists`);
      await mongoose.disconnect();
      process.exit(0);
    }

    await User.create({
      username,
      displayName: "Saba Admin",
      email: "admin@saba.com",
      passwordHash,
      role: "admin",
      createdBy: "system",
      isActive: true
    });

    console.log(`User ${username} created successfully`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

createAdmin();
