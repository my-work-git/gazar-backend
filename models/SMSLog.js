import mongoose, { Schema } from 'mongoose';

const schema = Schema({
  from: { type: String, index: true },
  to: { type: String, index: true },
  message: String,
  created_at: { type: Date, default: Date.now },
});

// Registering schema here
mongoose.model('SMSLog', schema);
