const mongoose = require('mongoose');
const { Schema } = mongoose;

async function check() {
  await mongoose.connect('mongodb://localhost:27017/dashboard', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  const UserSchema = new Schema({}, { strict: false });
  const User = mongoose.model('User', UserSchema);

  const u = await User.findOne({ username: 'sabaadmin' });
  console.log(u);
  process.exit(0);
}
check();
