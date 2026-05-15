import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('Please define the MONGODB_URI environment variable inside .env');
  process.exit(1);
}

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

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const adminUsername = 'SabaAdmin';
    const existingAdmin = await User.findOne({ username: adminUsername });

    if (existingAdmin) {
      console.log('Admin user already exists');
    } else {
      const passwordHash = await bcrypt.hash('Saba@2024', 12);
      await User.create({
        username: adminUsername,
        displayName: 'Saba Admin',
        email: 'admin@sababuilders.com',
        passwordHash,
        role: 'admin',
        allowedColumns: '*',
        isActive: true,
        createdBy: 'system',
      });
      console.log('Admin user created successfully');
    }
  } catch (error) {
    console.error('Error seeding admin:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

seed();
