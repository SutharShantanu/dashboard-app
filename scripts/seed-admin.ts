import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User.ts';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('Please define the MONGODB_URI environment variable inside .env');
  process.exit(1);
}

async function seedAdmin() {
  try {
    await mongoose.connect(MONGODB_URI as string);
    console.log('Connected to MongoDB');

    const adminUsername = 'SabaAdmin';
    const existingUser = await User.findOne({ username: adminUsername });

    if (existingUser) {
      console.log(`User ${adminUsername} already exists.`);
      process.exit(0);
    }

    const hashedPassword = await bcrypt.hash('Admin@123', 12);

    const adminUser = new User({
      username: adminUsername,
      displayName: 'Saba Admin',
      email: 'admin@saba.com',
      passwordHash: hashedPassword,
      role: 'admin',
      isActive: true,
      createdBy: 'system'
    });

    await adminUser.save();
    console.log('Admin user created successfully');
    
    process.exit(0);
  } catch (error) {
    console.error('Error seeding admin user:', error);
    process.exit(1);
  }
}

seedAdmin();
