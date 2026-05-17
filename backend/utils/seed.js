/**
 * Seed script - creates default admin account
 * Run: node utils/seed.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('../models/Admin');

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  // Create default admin
  const existing = await Admin.findOne({ email: 'admin@edusched.com' });
  if (!existing) {
    await Admin.create({ name: 'Admin', email: 'admin@edusched.com', password: 'admin123' });
    console.log('✅ Default admin created: admin@edusched.com / admin123');
  } else {
    console.log('ℹ️  Admin already exists');
  }

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
