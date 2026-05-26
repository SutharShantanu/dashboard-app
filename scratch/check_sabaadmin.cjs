const mongoose = require('mongoose');
const { Schema } = mongoose;

async function check() {
  await mongoose.connect('mongodb://localhost:27017/dashboard');
  const User = mongoose.model('User', new Schema({}, { strict: false }));
  const u = await User.findOne({ username: 'sabaadmin' });
  console.log(JSON.stringify(u, null, 2));
  process.exit(0);
}
check();
