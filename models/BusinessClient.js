import mongoose, { Schema } from 'mongoose';

const schema = Schema({
  name: String,
  phoneNumber: String,
  address: String,
  weeklyDelivery: String,
  notifiedDay: Date,
  discount: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  created_at: { type: Date, default: Date.now },
  updated_at: Date,
  updated_by: { type: Schema.Types.ObjectId, ref: 'Admin' },
});

// Registering schema here
mongoose.model('BusinessClient', schema);
