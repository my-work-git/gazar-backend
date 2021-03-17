import mongoose, { Schema } from 'mongoose';

const schema = Schema({
  name: String,
  code: { type: String, unique: true, index: true },
  discount: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  created_at: { type: Date, default: Date.now },
  updated_at: Date,
});

// Registering schema here
mongoose.model('Coupon', schema);
